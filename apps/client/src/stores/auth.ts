import { create } from 'zustand';
import type { PublicUser } from '../api/auth.js';

interface AuthState {
  status: 'loading' | 'ready';
  user: PublicUser | null;
  setUser(user: PublicUser | null): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  setUser: (user) => set({ user, status: 'ready' }),
}));
