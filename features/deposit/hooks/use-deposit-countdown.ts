import { useEffect, useState } from 'react';

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Live countdown from an absolute expiry timestamp.
 */
export function useDepositCountdown(expiresAtMs: number | null, active: boolean) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !expiresAtMs) {
      return;
    }

    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [active, expiresAtMs]);

  const remainingSeconds =
    !active || !expiresAtMs
      ? 0
      : Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));

  return {
    remainingSeconds,
    label: formatCountdown(remainingSeconds),
    expired: remainingSeconds <= 0,
  };
}
