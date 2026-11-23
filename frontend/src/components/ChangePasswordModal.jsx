import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';
import api, { getErrorMessage } from '../api/client';

export default function ChangePasswordModal({ open, onClose, onSuccess }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const resetAndClose = () => {
    setActual('');
    setNueva('');
    setConfirmar('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/mi-clave', {
        password_actual: actual,
        password_nueva: nueva,
      });
      if (onSuccess) onSuccess('Tu contraseña ha sido actualizada.');
      resetAndClose();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={resetAndClose}
      className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E6F7FD] text-[#00A9E0] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0A1931]">Cambiar contraseña</h3>
              <p className="text-[11px] text-slate-500">Actualiza tu clave de acceso personal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-[#0A1931] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña actual</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                placeholder="Ingresa tu clave actual"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nueva contraseña</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={6}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Confirmar nueva contraseña</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repite tu nueva clave"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar clave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}