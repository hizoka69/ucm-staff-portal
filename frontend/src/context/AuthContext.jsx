import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos
const LAST_ACTIVITY_KEY = 'ucm_last_activity';
const SESSION_NOTICE_KEY = 'ucm_session_notice';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ucm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState(
    () => sessionStorage.getItem(SESSION_NOTICE_KEY) || ''
  );

  const lastWriteRef = useRef(0);

  const clearSessionNotice = useCallback(() => {
    sessionStorage.removeItem(SESSION_NOTICE_KEY);
    setSessionNotice('');
  }, []);

  const logout = useCallback((reason = '') => {
    const notice = typeof reason === 'string' ? reason.trim() : '';
    localStorage.removeItem('ucm_token');
    localStorage.removeItem('ucm_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (notice) {
      sessionStorage.setItem(SESSION_NOTICE_KEY, notice);
      setSessionNotice(notice);
    } else {
      sessionStorage.removeItem(SESSION_NOTICE_KEY);
      setSessionNotice('');
    }
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ucm_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const savedLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (savedLast && Date.now() - savedLast >= INACTIVITY_LIMIT_MS) {
      logout('Tu sesión se cerró automáticamente por inactividad (5 minutos).');
      setLoading(false);
      return;
    }

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('ucm_user', JSON.stringify(res.data));
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  }, [logout]);

  // Cierre automático de sesión tras 5 minutos de inactividad (AFK)
  useEffect(() => {
    if (!user) return undefined;

    const now = Date.now();
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
    lastWriteRef.current = now;

    let timerId = null;

    const expireSession = () => {
      logout('Tu sesión se cerró automáticamente por inactividad (5 minutos).');
    };

    const scheduleCheck = () => {
      if (timerId) clearTimeout(timerId);
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      const remaining = INACTIVITY_LIMIT_MS - (Date.now() - last);
      if (remaining <= 0) {
        expireSession();
        return;
      }
      timerId = setTimeout(() => {
        const latest = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        if (!latest || Date.now() - latest >= INACTIVITY_LIMIT_MS) {
          expireSession();
        } else {
          scheduleCheck();
        }
      }, remaining + 250);
    };

    const registerActivity = () => {
      const ts = Date.now();
      // Evita escribir en localStorage en cada píxel del mouse (throttle 3s)
      if (ts - lastWriteRef.current < 3000) return;
      lastWriteRef.current = ts;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
      scheduleCheck();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (last && Date.now() - last >= INACTIVITY_LIMIT_MS) {
        expireSession();
      } else {
        scheduleCheck();
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'ucm_token' && !e.newValue) {
        setUser(null);
      } else if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        lastWriteRef.current = Number(e.newValue);
        scheduleCheck();
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, registerActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('storage', handleStorage);

    scheduleCheck();

    return () => {
      if (timerId) clearTimeout(timerId);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, registerActivity));
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user, logout]);

  const login = async (correo, password) => {
    const res = await api.post('/auth/login', { correo, password });
    localStorage.setItem('ucm_token', res.data.access_token);
    localStorage.setItem('ucm_user', JSON.stringify(res.data.user));
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    clearSessionNotice();
    setUser(res.data.user);
    return res.data.user;
  };

  const markPasswordChanged = () => {
    if (!user) return;
    const updated = { ...user, debe_cambiar_clave: 'N' };
    setUser(updated);
    localStorage.setItem('ucm_user', JSON.stringify(updated));
  };

  const updateUserPhoto = (fotoUrl) => {
    if (!user) return;
    const updated = { ...user, foto_url: fotoUrl };
    setUser(updated);
    localStorage.setItem('ucm_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionNotice,
        clearSessionNotice,
        login,
        logout,
        markPasswordChanged,
        updateUserPhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}