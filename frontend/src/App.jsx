import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import StaffPortal from './pages/StaffPortal';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import NotFound from './pages/NotFound';

const VALID_PATHS = new Set(['', '/', '/login']);

function getCleanPath() {
  const raw = window.location.pathname.replace(/\/+$/, '');
  return raw || '/';
}

export default function App() {
  const { user, loading } = useAuth();
  const [pathname, setPathname] = useState(getCleanPath);

  useEffect(() => {
    const onPopState = () => setPathname(getCleanPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setPathname('/');
  };

  if (!VALID_PATHS.has(pathname)) {
    return <NotFound onGoHome={handleGoHome} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex items-center justify-center text-sky-200 text-sm">
        Cargando Portal UCM...
      </div>
    );
  }

  if (!user) return <Login />;
  if (user.debe_cambiar_clave === 'S') return <ForcePasswordChange />;

  if (user.nombre_rol === 'SUPERADMIN') return <SuperAdminPanel />;
  if (user.nombre_rol === 'ADMIN') return <AdminPanel />;
  if (user.nombre_rol === 'STAFF') return <StaffPortal />;

  return <NotFound onGoHome={handleGoHome} />;
}