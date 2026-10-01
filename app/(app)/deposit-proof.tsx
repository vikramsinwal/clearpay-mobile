import { SubmitDepositProofScreen } from '@/features/deposit/screens/submit-deposit-proof-screen';

/**
 * Deposit Flow Step 2 — upload TXID + receipt after transfer.
 * Hidden from the tab bar (`href: null` in app tabs layout).
 */
export default function DepositProofRoute() {
  return <SubmitDepositProofScreen />;
}
