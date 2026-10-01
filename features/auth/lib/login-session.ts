import {
  ApiClientError,
  RequestTimeoutError,
  toNetworkError,
} from '@/lib/api/errors';
import type {
  CustomerAuthPayload,
  CustomerLoginInput,
  PublicCustomer,
} from '@/features/auth/types';

/** Login must fail closed if the server never answers. */
export const LOGIN_REQUEST_TIMEOUT_MS = 20_000;

export type LoginTokenStore = {
  accessToken: string;
  refreshToken: string;
};

export type LoginAttemptDeps = {
  login: (input: CustomerLoginInput) => Promise<unknown>;
  saveTokens: (tokens: LoginTokenStore) => Promise<void>;
  clearTokens: () => Promise<void>;
};

export type LoginAttemptEffects = {
  setSession: (customer: PublicCustomer) => void;
  /** Dashboard navigation. Call only after a confirmed login. */
  navigateToDashboard: () => void;
  clearSession: () => void;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function invalidLoginResponse(): ApiClientError {
  return new ApiClientError({
    code: 'INVALID_RESPONSE',
    message: 'Unable to sign in right now. Please try again.',
    status: 200,
  });
}

/**
 * A login result is confirmed only when the server payload includes a
 * customer identity and both session tokens. Anything else is a failure.
 */
export function assertConfirmedLoginPayload(value: unknown): CustomerAuthPayload {
  if (!value || typeof value !== 'object') {
    throw invalidLoginResponse();
  }

  const record = value as Record<string, unknown>;
  const customer = record.customer;
  const tokens = record.tokens;
  if (!customer || typeof customer !== 'object' || !tokens || typeof tokens !== 'object') {
    throw invalidLoginResponse();
  }

  const customerRecord = customer as Record<string, unknown>;
  const tokenRecord = tokens as Record<string, unknown>;
  if (
    !isNonEmptyString(customerRecord.publicId) ||
    !isNonEmptyString(customerRecord.email) ||
    typeof customerRecord.name !== 'string' ||
    typeof customerRecord.status !== 'string' ||
    !isNonEmptyString(tokenRecord.accessToken) ||
    !isNonEmptyString(tokenRecord.refreshToken)
  ) {
    throw invalidLoginResponse();
  }

  return value as CustomerAuthPayload;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RequestTimeoutError());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isTokenStorageError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /token storage|SecureStore|localStorage/i.test(error.message)
  );
}

function rethrowLoginFailure(error: unknown): never {
  if (error instanceof ApiClientError || isTokenStorageError(error)) {
    throw error;
  }
  throw toNetworkError(error);
}

/**
 * Persist tokens, mark the session, and navigate only after the login call
 * returns a confirmed auth payload. Failures reject and do not navigate.
 * The finally path only rolls back a partial token write.
 */
export async function runLoginAttempt(
  input: CustomerLoginInput,
  deps: LoginAttemptDeps,
  effects: LoginAttemptEffects,
  options?: { timeoutMs?: number },
): Promise<CustomerAuthPayload> {
  const timeoutMs = options?.timeoutMs ?? LOGIN_REQUEST_TIMEOUT_MS;
  let wroteTokens = false;

  try {
    const raw = await withTimeout(deps.login(input), timeoutMs);
    const payload = assertConfirmedLoginPayload(raw);

    try {
      await deps.saveTokens({
        accessToken: payload.tokens.accessToken,
        refreshToken: payload.tokens.refreshToken,
      });
    } catch (error) {
      await deps.clearTokens();
      throw error;
    }

    wroteTokens = true;
    effects.setSession(payload.customer);
    effects.navigateToDashboard();
    return payload;
  } catch (error) {
    if (wroteTokens) {
      await deps.clearTokens();
      effects.clearSession();
    }
    rethrowLoginFailure(error);
  }
}

/** Ignores a second submit while the first attempt is still running. */
export function createLoginLock() {
  let locked = false;
  return {
    tryAcquire(): boolean {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
  };
}
