import { create } from 'zustand';

type PayoutFocusState = {
  orderId: string | null;
  setOrderId: (orderId: string | null) => void;
};

/** Which payout review screen is open. Not a copy of the order. */
export const usePayoutFocusStore = create<PayoutFocusState>((set) => ({
  orderId: null,
  setOrderId: (orderId) => set({ orderId }),
}));
