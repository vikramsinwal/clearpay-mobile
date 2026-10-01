import { useLocalSearchParams } from 'expo-router';

import { PayinResultScreen } from '@/features/payin/screens/payin-result-screen';

const KINDS = new Set(['success', 'failed', 'expired']);

export default function PayinResultRoute() {
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    kind?: string | string[];
  }>();
  const rawId = params.orderId;
  const rawKind = params.kind;
  const orderId = Array.isArray(rawId) ? rawId[0] ?? null : rawId ?? null;
  const kindValue = Array.isArray(rawKind) ? rawKind[0] : rawKind;
  const kind = KINDS.has(kindValue ?? '')
    ? (kindValue as 'success' | 'failed' | 'expired')
    : 'failed';
  return <PayinResultScreen kind={kind} orderId={orderId} />;
}
