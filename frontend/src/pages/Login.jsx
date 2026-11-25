import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, IdCard, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import UcmLogo from '../components/UcmLogo';

export default function Login() {
  const { login, sessionNotice, clearSessionNotice } = useAuth();

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    clearSessionNotice();
    if (!identificador.trim() || !password) {
      setError('Ingresa tu RUT o correo UCM y tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login(identificador.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err, 'RUT, correo o contraseña incorrectos.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2 bg-[#F3F7FB]">
      {/* ===================================================================== */}
      {/* PANEL IZQUIERDO PC (Exacto a loginPC.jpeg)                            */}
      {/* ===================================================================== */}
      <section className="hidden lg:flex relative flex-col justify-between p-12 xl:p-16 ucm-hero-gradient text-white overflow-hidden">
        {/* Ondas y marca de agua geométrica UCM */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          viewBox="0 0 800 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M-100 180 C 180 60, 420 260, 900 90 L 900 -100 L -100 -100 Z"
            fill="url(#wave1)"
          />
          <path
            d="M-80 760 C 220 580, 520 790, 880 610 L 880 950 L -80 950 Z"
            fill="url(#wave2)"
          />
          <defs>
            <linearGradient id="wave1" x1="0" y1="0" x2="800" y2="300" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00C6FF" stopOpacity="0.6" />
              <stop offset="1" stopColor="#0A1B4D" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave2" x1="0" y1="600" x2="800" y2="900" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00A9E0" stopOpacity="0.5" />
              <stop offset="1" stopColor="#081226" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Marca de agua del escudo */}
        <img
          src="/escudo-ucm.png"
          alt=""
          aria-hidden="true"
          className="absolute -right-16 top-20 w-[420px] h-[420px] object-contain opacity-[0.07] brightness-0 invert pointer-events-none select-none"
        />

        {/* Logo oficial superior izquierdo */}
        <div className="relative z-10">
          <UcmLogo variant="dark" size="lg" />
        </div>

        {/* Copy central */}
        <div className="relative z-10 max-w-lg my-auto">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-white">
            Portal de Gestión
            <br />
            de Actividades UCM
          </h1>
          <p className="mt-5 text-lg text-sky-100/90 font-normal leading-relaxed">
            Coordina ferias, charlas y visitas institucionales en un solo lugar
          </p>
        </div>

        {/* Diagrama decorativo inferior estilo glass (referencia loginPC) */}
        <div className="relative z-10 flex items-center gap-3 opacity-80">
          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-sky-100">
            Ferias Vocacionales
          </div>
          <div className="w-6 h-px bg-sky-300/40" />
          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-sky-100">
            Asignación de Staff
          </div>
          <div className="w-6 h-px bg-sky-300/40" />
          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm text-xs text-sky-100">
            Gestion de Actividades
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CABECERA MÓVIL                                                    */}
      {/* ================================================================= */}
      <div className="lg:hidden ucm-hero-gradient pt-10 pb-16 px-6 text-center text-white">
        <div className="flex justify-center mb-4">
          <UcmLogo variant="dark" size="md" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">Portal de Actividades UCM</h1>
      </div>

      {/* ================================================================= */}
      {/* FORMULARIO ÚNICO DE INGRESO (PC + Celular)                        */}
      {/* ================================================================= */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-4 -mt-10 lg:mt-0 pb-10 lg:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-7 sm:p-9">
          <div className="text-center mb-7">
            <h2 className="text-2xl font-extrabold text-[#0A1931] tracking-tight">
              Iniciar sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ingresa con tus credenciales institucionales
            </p>
          </div>

          {sessionNotice && !error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sessionNotice}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#0A1931] mb-1.5">
                RUT o Correo UCM
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej. 21.234.567-8 o usuario@ucm.cl"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] placeholder:text-slate-400 focus:outline-none focus:border-[#00A9E0] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A1931] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] placeholder:text-slate-400 focus:outline-none focus:border-[#00A9E0] focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#0A2558] via-[#0E569E] to-[#00A9E0] hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-[#00A9E0]/25 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}