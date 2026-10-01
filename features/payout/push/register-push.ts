import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { useRouter, type Href } from 'expo-router';

import { isPayoutOrderId, registerPayoutPushDevice } from '@/features/payout/api/payout-orders-api';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go on Android throws as soon as expo-notifications is evaluated.
 * Web has no push-token listener. Skip the module in both cases so the app
 * can load without that warning. A native dev build still registers.
 */
function loadNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

async function deviceId(): Promise<string | null> {
  if (Platform.OS === 'android') return Application.getAndroidId() || null;
  if (Platform.OS === 'ios') return Application.getIosIdForVendorAsync();
  return null;
}

export function useRegisterPayoutPush() {
  const router = useRouter();

  useEffect(() => {
    const Notifications = loadNotifications();
    if (!Notifications) return;
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    let cancelled = false;
    void (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted || cancelled) return;
      const token = await Notifications.getDevicePushTokenAsync();
      const id = await deviceId();
      const value = typeof token.data === 'string' ? token.data : '';
      if (!value || !id || cancelled) return;
      await registerPayoutPushDevice({
        pushToken: value,
        platform: Platform.OS,
        deviceId: id,
        appVersion: Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? '0',
      });
    })().catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const orderId = typeof data.orderId === 'string' ? data.orderId : '';
      if (!isPayoutOrderId(orderId)) return;
      router.push(`/payout-order?orderId=${encodeURIComponent(orderId)}` as Href);
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);
}
