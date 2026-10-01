import { useLocalSearchParams } from 'expo-router';

import { PayinAccountDetailScreen } from '@/features/payin/screens/payin-account-detail-screen';

export default function PayinAccountRoute() {
  const params = useLocalSearchParams<{ accountId?: string | string[] }>();
  const raw = params.accountId;
  const accountId = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  return <PayinAccountDetailScreen accountId={accountId} />;
}
