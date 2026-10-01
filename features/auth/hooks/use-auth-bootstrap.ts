import { useEffect } from 'react';

import { hasStoredSession } from '@/features/auth/lib/stored-session';
import {
  getAccessToken,
  getRefreshToken,
} from '@/lib/auth/secure-tokens';
import { useAuthStore } from '@/stores/auth-store';

/** Restore auth shell from SecureStore on cold start (tokens only — no password). */
export function useAuthBootstrap() {
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
        ]);
        if (cancelled) {
          return;
        }
        if (hasStoredSession(accessToken, refreshToken)) {
          restoreSession();
        } else {
          clearSession();
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearSession, restoreSession, setHydrated]);

  return { isHydrated };
}
