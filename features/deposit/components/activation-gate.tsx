import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDepositStatusQuery } from '@/features/deposit/hooks/use-deposit-status';
import { isDashboardLocked } from '@/features/deposit/lib/activation';

type ActivationGateProps = {
  children: (locked: boolean) => ReactNode;
};

/**
 * Keeps the tab bar and profile mounted. Home shows the deposit state until
 * the backend sets unlocked. A failed status fetch does not unlock the account.
 */
export function ActivationGate({ children }: ActivationGateProps) {
  const query = useDepositStatusQuery();
  const wasLocked = useRef<boolean | null>(null);

  const status = query.data?.status;
  const known = Boolean(status);
  const locked = known ? isDashboardLocked(status) : true;

  useEffect(() => {
    if (!known) return;
    if (wasLocked.current === true && !locked) {
      router.replace('/');
    }
    wasLocked.current = locked;
  }, [known, locked]);

  if (!known && query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FB]">
        <ActivityIndicator color="#1B6CA8" />
      </View>
    );
  }

  return <>{children(locked)}</>;
}
