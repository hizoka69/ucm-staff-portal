export async function compressImage(file, { maxSide = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      image.src = dataUrl;
    });

    let { width, height } = img;
    if (width > maxSide || height > maxSide) {
      if (width >= height) {
        height = Math.round((height * maxSide) / width);
        width = maxSide;
      } else {
        width = Math.round((width * maxSide) / height);
        height = maxSide;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    if (blob.size >= file.size && width === img.width && height === img.height) {
      return file;
    }

    const baseName = (file.name || 'imagen').replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
