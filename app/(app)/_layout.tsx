import { Tabs, usePathname } from 'expo-router';
import { Bell, CreditCard, Home, UserRound, Wallet, ArrowUpRight } from 'lucide-react-native';
import { View } from 'react-native';

import { ActivationGate } from '@/features/deposit/components/activation-gate';
import { useNotificationCountQuery } from '@/features/home/hooks/use-home-queries';
import { useRegisterPayoutPush } from '@/features/payout/push/register-push';
import { usePayoutSmsAutomation } from '@/features/payout/sms/use-payout-sms-automation';
import { useAppTheme } from '@/lib/theme';

export default function AppTabsLayout() {
  return (
    <ActivationGate>
      {() => <AuthenticatedTabs />}
    </ActivationGate>
  );
}

function AuthenticatedTabs() {
  const { isDark, colors } = useAppTheme();
  useRegisterPayoutPush();
  usePayoutSmsAutomation();
  const pathname = usePathname();
  const onAlerts = pathname.includes('/notifications');
  const onOrderDetail =
    pathname.includes('/payin-order') ||
    pathname.includes('/payout-order') ||
    pathname.includes('/payin-result') ||
    pathname.includes('/payin-account');
  const notificationCountQuery = useNotificationCountQuery({ enabled: !onAlerts });
  const hasUnread = (notificationCountQuery.data?.unread ?? 0) > 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'PlusJakartaSans_600SemiBold',
        },
        tabBarStyle: onOrderDetail
          ? { display: 'none' }
          : {
              backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.97)',
              borderTopColor: colors.border,
              height: 64,
              paddingBottom: 8,
              paddingTop: 6,
            },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={2.3} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          href: null,
          title: 'Trades',
        }}
      />
      <Tabs.Screen
        name="payin"
        options={{
          title: 'PayIn',
          tabBarIcon: ({ color, size }) => (
            <Wallet color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="payin-orders"
        options={{
          href: null,
          title: 'PayIn Orders',
        }}
      />
      <Tabs.Screen
        name="payin-order"
        options={{
          href: null,
          title: 'PayIn Order',
        }}
      />
      <Tabs.Screen
        name="payin-accounts"
        options={{
          href: null,
          title: 'PayIn Accounts',
        }}
      />
      <Tabs.Screen
        name="payin-account"
        options={{
          href: null,
          title: 'PayIn Account',
        }}
      />
      <Tabs.Screen
        name="payin-history"
        options={{
          href: null,
          title: 'PayIn History',
        }}
      />
      <Tabs.Screen
        name="payin-result"
        options={{
          href: null,
          title: 'PayIn Result',
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: 'Payouts',
          tabBarIcon: ({ color, size }) => (
            <ArrowUpRight color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="payout-order"
        options={{
          href: null,
          title: 'Payout Review',
        }}
      />
      <Tabs.Screen
        name="deposit"
        options={{
          href: null,
          title: 'Deposit',
        }}
      />
      <Tabs.Screen
        name="settle"
        options={{
          href: null,
          title: 'Settlement',
        }}
      />
      <Tabs.Screen
        name="deposit-proof"
        options={{
          href: null,
          title: 'Submit Proof',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Bell
                color={color}
                fill={focused ? color : 'transparent'}
                size={size}
                strokeWidth={2}
              />
              {hasUnread ? (
                <View
                  className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-500"
                  style={{ borderWidth: 2, borderColor: colors.surface }}
                />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          href: null,
          title: 'Change Password',
        }}
      />
    </Tabs>
  );
}
