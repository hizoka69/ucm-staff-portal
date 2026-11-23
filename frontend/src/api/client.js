import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:8000/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ucm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/cambiar-clave');

    if (error.response?.status === 401 && !isAuthAttempt && localStorage.getItem('ucm_token')) {
      localStorage.removeItem('ucm_token');
      localStorage.removeItem('ucm_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err, fallback = 'Ocurrió un error inesperado.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d) => `${d.loc?.slice(-1)[0] || 'campo'}: ${d.msg}`).join(' | ');
  }
  return err?.message || fallback;
}

export function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export default api;