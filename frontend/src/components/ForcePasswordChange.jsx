import { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import UcmLogo from './UcmLogo';

export default function ForcePasswordChange() {
  const { user, logout, markPasswordChanged } = useAuth();
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (claveNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (claveNueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/cambiar-clave', {
        clave_actual: claveActual,
        clave_nueva: claveNueva,
      });
      markPasswordChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen ucm-hero-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl">
        <div className="flex justify-center mb-5">
          <UcmLogo variant="light" size="md" />
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0A1931]">Cambio obligatorio de contraseña</h1>
            <p className="text-xs text-slate-600">
              Primer acceso detectado para <span className="font-medium">{user?.correo}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              required
              value={claveActual}
              onChange={(e) => setClaveActual(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              required
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] focus:bg-white"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-full ucm-btn-gradient-pc text-white text-sm font-semibold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Actualizar clave'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}