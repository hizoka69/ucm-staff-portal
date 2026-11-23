import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ucm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ucm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('ucm_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('ucm_token');
        localStorage.removeItem('ucm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (correo, password) => {
    const res = await api.post('/auth/login', { correo, password });
    localStorage.setItem('ucm_token', res.data.access_token);
    localStorage.setItem('ucm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('ucm_token');
    localStorage.removeItem('ucm_user');
    setUser(null);
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
      value={{ user, loading, login, logout, markPasswordChanged, updateUserPhoto }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}