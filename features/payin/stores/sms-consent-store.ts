import { create } from 'zustand';

type SmsConsentState = {
  choice: 'unknown' | 'enabled' | 'declined';
  enable: () => void;
  decline: () => void;
};

/** Session-only consent. SMS processing stays off until the customer opts in. */
export const useSmsConsentStore = create<SmsConsentState>((set) => ({
  choice: 'unknown',
  enable: () => set({ choice: 'enabled' }),
  decline: () => set({ choice: 'declined' }),
}));
