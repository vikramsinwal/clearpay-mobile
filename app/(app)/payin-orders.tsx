import { useLocalSearchParams } from 'expo-router';

import { PayinOrdersScreen } from '@/features/payin/screens/payin-orders-screen';
import { PAYIN_LIST_TABS, type PayinListTab } from '@/features/payin/types';

export default function PayinOrdersRoute() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab = PAYIN_LIST_TABS.includes(raw as PayinListTab) ? (raw as PayinListTab) : 'all';
  return <PayinOrdersScreen key={tab} initialTab={tab} />;
}
