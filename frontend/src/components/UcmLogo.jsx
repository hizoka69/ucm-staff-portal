export default function UcmLogo({
  variant = 'light',
  size = 'md',
  className = '',
}) {
  // Solo escudo circular (esquina superior del panel azul en Login PC)
  if (variant === 'crest') {
    const dims = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-16 h-16' };
    return (
      <div
        className={`${dims[size] || dims.md} rounded-full bg-white p-0.5 shadow-md flex items-center justify-center shrink-0 ${className}`}
      >
        <img
          src="/escudo-ucm.png"
          alt="Escudo Universidad Católica del Maule"
          className="w-full h-full object-contain rounded-full select-none"
        />
      </div>
    );
  }

  const heights = {
    xs: 'h-7',
    sm: 'h-9',
    md: 'h-12',
    lg: 'h-16',
  };
  const hClass = heights[size] || heights.md;

  // Sobre fondos oscuros/azules: mismo PNG oficial en versión negativa blanca (cero texto falso)
  if (variant === 'dark') {
    return (
      <img
        src="/logo-ucm.png"
        alt="Universidad Católica del Maule"
        className={`${hClass} w-auto object-contain brightness-0 invert select-none ${className}`}
      />
    );
  }

  // Sobre fondos blancos/claros: PNG oficial a todo color
  return (
    <img
      src="/logo-ucm.png"
      alt="Universidad Católica del Maule"
      className={`${hClass} w-auto object-contain select-none ${className}`}
    />
  );
}