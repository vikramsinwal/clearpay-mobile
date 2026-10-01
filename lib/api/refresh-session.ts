import { ApiClientError } from './errors';
import type { AuthTokens } from '../auth/secure-tokens';

const REFRESH_PATH = '/auth/refresh';

/**
 * A bearer request failed with 401 and a refresh token may still be valid.
 * Login and the refresh call itself must not enter this path.
 */
export function shouldAttemptTokenRefresh(input: {
  path: string;
  accessToken?: string | null;
  error: unknown;
}): boolean {
  if (!input.accessToken) return false;
  if (isRefreshPath(input.path)) return false;
  return input.error instanceof ApiClientError && input.error.status === 401;
}

/**
 * Refresh token was rejected. Network, timeout, rate limit, and 5xx stay
 * signed in so the next request can try again.
 */
export function isTerminalRefreshFailure(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  return error.status === 400 || error.status === 401 || error.status === 403;
}

function isRefreshPath(path: string): boolean {
  const pathname = path.split('?')[0] ?? path;
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return normalized === REFRESH_PATH;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Accepts the customer auth payload (`data.tokens`) or a flat token object.
 * Keeps the previous refresh token when the server returns only a new access token.
 */
export function parseRefreshTokens(
  data: unknown,
  previousRefreshToken: string,
): AuthTokens {
  const record = asRecord(data);
  const nested = asRecord(record?.tokens);
  const source = nested ?? record;
  const accessToken = source?.accessToken;
  const refreshToken = source?.refreshToken;

  if (!nonEmpty(accessToken)) {
    throw new ApiClientError({
      code: 'INVALID_RESPONSE',
      message: 'Unable to refresh your session. Please try again.',
      status: 200,
    });
  }

  return {
    accessToken,
    refreshToken: nonEmpty(refreshToken) ? refreshToken : previousRefreshToken,
  };
}

export type RefreshCoordinatorDeps = {
  readRefreshToken: () => Promise<string | null>;
  readAccessToken: () => Promise<string | null>;
  saveTokens: (tokens: AuthTokens) => Promise<void>;
  invalidateSession: () => Promise<void>;
  requestRefresh: (refreshToken: string) => Promise<unknown>;
};

/**
 * One refresh in flight for every caller. Waiters share that result, then
 * retry their own request. A second refresh starts only after the first settles.
 */
export function createRefreshCoordinator(deps: RefreshCoordinatorDeps) {
  let inFlight: Promise<string> | null = null;

  async function refresh(): Promise<string> {
    if (!inFlight) {
      inFlight = runRefresh().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  async function runRefresh(): Promise<string> {
    const refreshToken = (await deps.readRefreshToken())?.trim() ?? '';
    if (!refreshToken) {
      await deps.invalidateSession();
      throw new ApiClientError({
        code: 'UNAUTHORIZED',
        message: 'Your session expired. Please sign in again.',
        status: 401,
      });
    }

    try {
      const data = await deps.requestRefresh(refreshToken);
      const tokens = parseRefreshTokens(data, refreshToken);
      await deps.saveTokens(tokens);
      return tokens.accessToken;
    } catch (error) {
      if (isTerminalRefreshFailure(error)) {
        await deps.invalidateSession();
      }
      throw error;
    }
  }

  return {
    /**
     * If another request already stored a newer access token, reuse it.
     * Otherwise join the single refresh flight.
     */
    async accessTokenForRetry(usedAccessToken: string | null | undefined): Promise<string> {
      const current = await deps.readAccessToken();
      if (current && usedAccessToken && current !== usedAccessToken) {
        return current;
      }
      return refresh();
    },
  };
}
