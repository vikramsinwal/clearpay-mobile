import { create } from 'zustand';

import type { PublicCustomer } from '@/features/auth/types';

type AuthState = {
  customer: PublicCustomer | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (customer: PublicCustomer) => void;
  restoreSession: () => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
};

/**
 * Session shell state only. Tokens live in SecureStore; financial data stays in Query.
 */
export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  isAuthenticated: false,
  isHydrated: false,
  setSession: (customer) =>
    set({
      customer,
      isAuthenticated: true,
    }),
  restoreSession: () =>
    set({
      isAuthenticated: true,
    }),
  clearSession: () =>
    set({
      customer: null,
      isAuthenticated: false,
    }),
  setHydrated: (isHydrated) => set({ isHydrated }),
}));
