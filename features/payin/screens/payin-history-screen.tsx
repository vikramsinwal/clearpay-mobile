import { PAYIN_COPY } from '@/constants/payin';
import { PayinOrdersScreen } from '@/features/payin/screens/payin-orders-screen';

export function PayinHistoryScreen() {
  return <PayinOrdersScreen initialTab="completed" title={PAYIN_COPY.historyTitle} />;
}
