import axios from 'axios';
import { useAuthStore } from '../store/auth';

try {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
} catch {}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = String(err.config?.url || '');

    // Si el 401 viene del login, NO cerrar sesión ni redirigir
    const isLoginRequest = url.includes('/auth/login');

    if (err.response?.status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);
export default api;
