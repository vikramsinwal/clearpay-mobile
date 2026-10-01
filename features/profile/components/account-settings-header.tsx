import { TopHeader } from '@/components/brand/top-header';
import { ACCOUNT_SETTINGS_COPY } from '@/constants/profile';

type AccountSettingsHeaderProps = {
  score?: number | null;
  hasUnreadNotifications?: boolean;
};

export function AccountSettingsHeader(_props?: AccountSettingsHeaderProps) {
  return <TopHeader title={ACCOUNT_SETTINGS_COPY.headerTitle} />;
}
