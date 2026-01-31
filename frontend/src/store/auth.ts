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
  const savedToken = sessionStorage.getItem('token');
  const savedUser = sessionStorage.getItem('user');

  return {
    token: savedToken || null,
    user: savedUser ? (JSON.parse(savedUser) as User) : null,

    login: (token, user) => {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      set({ token, user });
    },

    logout: () => {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      set({ token: null, user: null });
    },
  };
});
