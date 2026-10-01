import { useLocalSearchParams } from 'expo-router';

import { PayinOrderDetailsScreen } from '@/features/payin/screens/payin-order-details-screen';

export default function PayinOrderRoute() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const raw = params.orderId;
  const orderId = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  return <PayinOrderDetailsScreen orderId={orderId} />;
}
