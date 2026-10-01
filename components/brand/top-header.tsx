import { usePathname, useRouter, type Href } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Gauge,
  Info,
  Menu,
  UserRound,
  X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { ClearpayLogo } from '@/components/brand/clearpay-logo';
import { useNotificationCountQuery } from '@/features/home/hooks/use-home-queries';
import { usePerformanceQuery } from '@/features/profile/hooks/use-account-settings';
import { useAppTheme } from '@/lib/theme';

const MENU_LINKS: { label: string; href: Href }[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Accounts', href: '/accounts' },
  { label: 'PayIn', href: '/payin' },
  { label: 'Payouts', href: '/payouts' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Profile', href: '/profile' },
];

export type TopHeaderProps = {
  /** Current screen title shown beside the Clearpay logo. */
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showScore?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  showLogo?: boolean;
  onBack?: () => void;
  onMenuPress?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onHelp?: () => void;
  onClose?: () => void;
  closeAccessibilityLabel?: string;
};

/**
 * Shared customer-app chrome. Trader score comes from the account
 * performance API and the bell dot from the notifications unread count.
 */
export function TopHeader({
  title,
  showBack,
  showMenu,
  showScore = true,
  showNotifications = true,
  showProfile = true,
  showLogo = true,
  onBack,
  onMenuPress,
  onNotificationsPress,
  onProfilePress,
  onHelp,
  onClose,
  closeAccessibilityLabel = 'Close',
}: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { isDark, colors } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const onAlerts = pathname.includes('/notifications');
  const performanceQuery = usePerformanceQuery({ period: '30d' });
  const unreadQuery = useNotificationCountQuery({
    enabled: showNotifications && !onAlerts,
  });

  const score = performanceQuery.data?.traderScore.value;
  const scoreLabel = score == null ? '—' : String(Math.round(score));
  const unread = unreadQuery.data?.unread ?? 0;
  const hasUnread = unread > 0;

  const backVisible = showBack ?? Boolean(onBack);
  const menuVisible = showMenu ?? !backVisible;

  const goBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.navigate('/');
  }, [onBack, router]);

  const openMenu = useCallback(() => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    setMenuOpen(true);
  }, [onMenuPress]);

  const openNotifications = useCallback(() => {
    if (onNotificationsPress) {
      onNotificationsPress();
      return;
    }
    router.push('/notifications' as Href);
  }, [onNotificationsPress, router]);

  const openProfile = useCallback(() => {
    if (onProfilePress) {
      onProfilePress();
      return;
    }
    router.push('/profile' as Href);
  }, [onProfilePress, router]);

  const iconMuted = isDark ? colors.textSecondary : '#64748B';
  const iconStrong = isDark ? colors.textPrimary : '#334155';
  const compact = width < 640;
  const logoSize = compact ? 28 : 36;

  return (
    <View
      className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md dark:border-navy-700 dark:bg-navy-800/95"
      style={{ elevation: 2 }}
    >
      <View className="w-full flex-row items-center justify-between px-4 py-2.5">
        <View className="min-w-0 flex-1 flex-row items-center">
          {backVisible ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              className="mr-1 h-9 w-9 items-center justify-center rounded-lg active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={goBack}
            >
              <ArrowLeft color={iconStrong} size={20} strokeWidth={2.2} />
            </Pressable>
          ) : null}

          {menuVisible ? (
            <Pressable
              accessibilityLabel="Open Menu"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-lg active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={openMenu}
            >
              <Menu color={iconStrong} size={20} strokeWidth={2.2} />
            </Pressable>
          ) : null}

          {showScore ? (
            <View
              accessibilityLabel={`Trader score ${scoreLabel}`}
              className={`${menuVisible || backVisible ? 'ml-2.5' : ''} flex-row items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 dark:border-emerald-700/50 dark:bg-navy-900`}
            >
              <Gauge color="#059669" size={11} strokeWidth={2.4} />
              <Text
                className="text-[12px] text-slate-600 dark:text-navy-200"
                style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
              >
                Score
              </Text>
              <Text
                className="text-sm leading-none text-emerald-700 dark:text-emerald-300"
                style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
              >
                {scoreLabel}
              </Text>
              <View className="h-0.5 w-1.5 rounded-full bg-emerald-500" />
            </View>
          ) : null}
        </View>

        <View className="mx-1 min-w-0 max-w-[42%] flex-row items-center justify-center">
          {showLogo ? <ClearpayLogo size={logoSize} variant="header" /> : null}
        </View>

        <View className="min-w-0 flex-1 flex-row items-center justify-end">
          {showNotifications ? (
            <Pressable
              accessibilityLabel={hasUnread ? 'Notifications, unread' : 'Notifications'}
              accessibilityRole="button"
              className="relative h-8 w-8 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={openNotifications}
            >
              <Bell color={isDark ? colors.textSecondary : '#475569'} size={16} strokeWidth={2} />
              {hasUnread ? (
                <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500 dark:border-navy-800" />
              ) : null}
            </Pressable>
          ) : null}

          {showProfile ? (
            <Pressable
              accessibilityLabel="User Profile"
              accessibilityRole="button"
              className="ml-0.5 h-8 w-8 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={openProfile}
            >
              <UserRound color={isDark ? colors.textSecondary : '#475569'} size={16} strokeWidth={2} />
            </Pressable>
          ) : null}

          {onHelp ? (
            <Pressable
              accessibilityLabel="Help and support"
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={onHelp}
            >
              <Info color={iconMuted} size={16} strokeWidth={2} />
            </Pressable>
          ) : null}

          {onClose ? (
            <Pressable
              accessibilityLabel={closeAccessibilityLabel}
              accessibilityRole="button"
              className="h-8 w-8 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-navy-700"
              hitSlop={8}
              onPress={onClose}
            >
              <X color={iconMuted} size={16} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close menu"
          className="flex-1 justify-end bg-slate-900/40"
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            className="rounded-t-2xl bg-white px-4 pb-8 pt-3 dark:bg-navy-800"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-3 items-center">
              <View className="h-1 w-10 rounded-full bg-slate-200 dark:bg-navy-600" />
            </View>
            <Text
              className="mb-2 px-1 text-base text-slate-900 dark:text-white"
              style={{ fontFamily: 'PlusJakartaSans_700Bold' }}
            >
              Navigate
            </Text>
            {MENU_LINKS.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                className="rounded-xl px-3 py-3 active:bg-slate-100 dark:active:bg-navy-700"
                onPress={() => {
                  setMenuOpen(false);
                  router.push(item.href);
                }}
              >
                <Text
                  className="text-[15px] text-slate-800 dark:text-navy-100"
                  style={{ fontFamily: 'PlusJakartaSans_600SemiBold' }}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
