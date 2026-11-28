import { useState } from 'react';
import { LogOut, ShieldCheck, KeyRound, Menu, X, CheckCircle2, AlertCircle } from 'lucide-react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Layout({ title, navItems, activeTab, onTabChange, children }) {
  const { user, logout, markPasswordChanged } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Estado para cambio obligatorio de clave en 1er login (debe_cambiar_clave === 'S')
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleForcedPasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (claveNueva.length < 6) {
      setPwdError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (claveNueva !== confirmar) {
      setPwdError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setPwdLoading(true);
    try {
      await api.post('/auth/cambiar-clave', {
        clave_actual: claveActual,
        clave_nueva: claveNueva,
      });
      markPasswordChanged();
    } catch (err) {
      setPwdError(getErrorMessage(err));
    } finally {
      setPwdLoading(false);
    }
  };

  if (user?.debe_cambiar_clave === 'S') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Cambio obligatorio de contraseña</h1>
              <p className="text-xs text-slate-400">Primer inicio de sesión detectado para {user.correo}</p>
            </div>
          </div>

          {pwdError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleForcedPasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña actual</label>
              <input
                type="password"
                required
                value={claveActual}
                onChange={(e) => setClaveActual(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Ingresa tu contraseña actual"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={pwdLoading}
                className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {pwdLoading ? 'Actualizando...' : 'Guardar y continuar'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
              >
                Salir
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const roleColors = {
    SUPERADMIN: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    ADMIN: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    STAFF: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900/90 border-r border-slate-800 shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-white">UCM STAFF</div>
            <div className="text-[11px] text-slate-400">Gestión Universitaria</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-3">
            <div className="text-sm font-medium text-white truncate">
              {user?.nombre} {user?.apellido}
            </div>
            <div className="text-xs text-slate-400 truncate">{user?.correo}</div>
            <span
              className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md border ${
                roleColors[user?.nombre_rol] || 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {user?.nombre_rol}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-300 border border-slate-700 hover:border-red-500/30 text-xs font-medium text-slate-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white text-sm">UCM STAFF</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-200"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base lg:text-lg font-semibold text-white truncate">{title}</h1>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Oracle 21c XE • Universidad Católica del Maule
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}