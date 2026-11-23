import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import UcmLogo from '../components/UcmLogo';

export default function NotFound({ onGoHome }) {
  const handleGoHome = () => {
    if (typeof onGoHome === 'function') {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F6FA] text-[#0A1931] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Cabecera institucional */}
        <div className="ucm-banner-gradient px-6 py-6 flex items-center justify-between text-white">
          <UcmLogo variant="dark" size="sm" />
          <span className="px-3 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-extrabold tracking-wider">
            ERROR 404
          </span>
        </div>

        {/* Cuerpo */}
        <div className="p-7 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E6F7FD] border border-[#BAE8FA] text-[#00A9E0] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold text-[#0A1931] tracking-tight">
              Página no encontrada
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              La ruta a la que intentas acceder no existe, fue movida o no tienes
              permisos para visualizarla.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver atrás
            </button>
            <button
              type="button"
              onClick={handleGoHome}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0E74C2] to-[#00B4E6] hover:from-[#0B62A6] hover:to-[#009CC9] text-white text-xs font-bold shadow-md shadow-[#00A9E0]/25 transition cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Ir al inicio
            </button>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[11px] text-slate-400 font-medium">
        Portal de Gestión de Staff Universitario · UCM
      </p>
    </div>
  );
}