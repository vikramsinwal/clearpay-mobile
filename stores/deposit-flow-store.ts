import { create } from 'zustand';

import type { DepositProofReceipt } from '@/features/deposit/schema/deposit-proof';
import { persistDepositSessionPublicId } from '@/features/deposit/lib/persist-session-id';

/**
 * Client-only deposit funnel UI state (sheets / step after local proof submit).
 * Not authoritative for balances, ownership, or ledger status — those come from REST.
 */

export type DepositFlowStatus = 'idle' | 'awaiting_proof' | 'under_review';

export type DepositUnderReviewSubmission = {
  amountUsdt: number;
  amountDisplay: string;
  currency: string;
  networkLabel: string;
  txid: string;
  receipt: DepositProofReceipt;
  senderExchange?: string;
  submittedAtIso: string;
  /** Presentation confirmations until API returns live chain progress. */
  confirmationsDone: number;
  confirmationsTotal: number;
  source: 'presentation' | 'api';
};

type DepositFlowState = {
  status: DepositFlowStatus;
  sessionPublicId: string | null;
  submission: DepositUnderReviewSubmission | null;
  /** When true, Home shows the trader dashboard instead of the full under-review screen. */
  underReviewDismissed: boolean;
  setSessionPublicId: (sessionPublicId: string | null) => void;
  markAwaitingProof: (sessionPublicId?: string | null) => void;
  markUnderReview: (submission: DepositUnderReviewSubmission) => void;
  dismissUnderReview: () => void;
  clearDepositFlow: () => void;
};

function rememberSessionPublicId(sessionPublicId: string | null) {
  void persistDepositSessionPublicId(sessionPublicId);
}

export const useDepositFlowStore = create<DepositFlowState>((set, get) => ({
  status: 'idle',
  sessionPublicId: null,
  submission: null,
  underReviewDismissed: false,
  setSessionPublicId: (sessionPublicId) => {
    const next = sessionPublicId?.trim() || null;
    rememberSessionPublicId(next);
    set({ sessionPublicId: next });
  },
  markAwaitingProof: (sessionPublicId) => {
    // Preserve an already-known id when callers omit / pass null — wiping here
    // is what made proof submit fail after "I sent funds" on web remounts.
    const next =
      sessionPublicId?.trim() || get().sessionPublicId?.trim() || null;
    rememberSessionPublicId(next);
    set({
      status: 'awaiting_proof',
      sessionPublicId: next,
      submission: null,
      underReviewDismissed: false,
    });
  },
  markUnderReview: (submission) =>
    set({
      status: 'under_review',
      submission,
      underReviewDismissed: false,
    }),
  dismissUnderReview: () => set({ underReviewDismissed: true }),
  clearDepositFlow: () => {
    rememberSessionPublicId(null);
    set({
      status: 'idle',
      sessionPublicId: null,
      submission: null,
      underReviewDismissed: false,
    });
  },
}));
