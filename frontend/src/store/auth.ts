import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Leer valores guardados (si existen)
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  return {
    token: savedToken || null,
    user: savedUser ? (JSON.parse(savedUser) as User) : null,

    login: (token, user) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user });
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null });
    },
  };
});
