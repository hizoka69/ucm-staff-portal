import { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../api/client';

export default function UserAvatar({
  fotoUrl,
  nombre = '',
  apellido = '',
  size = 'md',
  className = '',
}) {
  const [imgError, setImgError] = useState(false);
  const src = resolveAssetUrl(fotoUrl);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const dims = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-28 h-28 text-3xl',
  };

  const initials = `${nombre.charAt(0) || ''}${apellido.charAt(0) || ''}`.toUpperCase() || 'UC';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`${nombre} ${apellido}`.trim() || 'Foto de perfil'}
        onError={() => setImgError(true)}
        className={`${dims[size] || dims.md} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims[size] || dims.md} rounded-full bg-gradient-to-br from-[#15367A] to-[#00A9E0] text-white font-extrabold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {initials}
    </div>
  );
}