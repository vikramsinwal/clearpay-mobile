import { TopHeader } from '@/components/brand/top-header';

type HomeHeaderProps = {
  title?: string;
  name?: string | null;
  email?: string | null;
  hasUnreadNotifications?: boolean;
  onMenuPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
};

/**
 * Authenticated portal chrome — shared TopHeader.
 */
export function HomeHeader({
  title = 'Home',
  onMenuPress,
  onNotificationsPress,
  onProfilePress,
}: HomeHeaderProps) {
  return (
    <TopHeader
      title={title}
      onMenuPress={onMenuPress}
      onNotificationsPress={onNotificationsPress}
      onProfilePress={onProfilePress}
    />
  );
}
