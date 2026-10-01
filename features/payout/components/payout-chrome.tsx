import { useQuery } from '@tanstack/react-query';

import { TopHeader } from '@/components/brand/top-header';
import { PAYOUT_COPY } from '@/constants/payout';
import { fetchCustomerNotifications } from '@/features/home/api/notifications-api';
import { useNotificationCountQuery } from '@/features/home/hooks/use-home-queries';

export function usePayoutUnreadCount() {
  const countQuery = useNotificationCountQuery();
  return useQuery({
    queryKey: ['customer-payout-notification-badge', countQuery.data?.unread ?? 0],
    enabled: (countQuery.data?.unread ?? 0) > 0,
    queryFn: async () => {
      const page = await fetchCustomerNotifications({ status: 'UNREAD', limit: 20 });
      return page.items.filter((item) => {
        const target = item.action?.target.toLowerCase() ?? '';
        return !item.isRead && target.includes('payout');
      }).length;
    },
    staleTime: 15_000,
  });
}

export function PayoutChrome({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return <TopHeader showBack={Boolean(onBack)} title={title} onBack={onBack} />;
}

export { PAYOUT_COPY };
