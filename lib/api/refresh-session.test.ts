import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiClientError } from './errors';
import {
  createRefreshCoordinator,
  isTerminalRefreshFailure,
  parseRefreshTokens,
  shouldAttemptTokenRefresh,
} from './refresh-session';

function unauthorized() {
  return new ApiClientError({
    code: 'UNAUTHORIZED',
    message: 'Your session expired. Please sign in again.',
    status: 401,
  });
}

describe('shouldAttemptTokenRefresh', () => {
  it('refreshes only a bearer 401', () => {
    assert.equal(
      shouldAttemptTokenRefresh({
        path: '/me',
        accessToken: 'access-1',
        error: unauthorized(),
      }),
      true,
    );
  });

  it('does not refresh login failures, the refresh call, or non-401 errors', () => {
    assert.equal(
      shouldAttemptTokenRefresh({
        path: '/auth/login',
        accessToken: null,
        error: unauthorized(),
      }),
      false,
    );
    assert.equal(
      shouldAttemptTokenRefresh({
        path: '/auth/refresh',
        accessToken: 'access-1',
        error: unauthorized(),
      }),
      false,
    );
    assert.equal(
      shouldAttemptTokenRefresh({
        path: '/me',
        accessToken: 'access-1',
        error: new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach Clearpay. Check your connection and try again.',
          status: 0,
        }),
      }),
      false,
    );
  });
});

describe('isTerminalRefreshFailure', () => {
  it('treats 400, 401, and 403 as an invalid refresh session', () => {
    assert.equal(isTerminalRefreshFailure(unauthorized()), true);
    assert.equal(
      isTerminalRefreshFailure(
        new ApiClientError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid refreshToken.',
          status: 400,
        }),
      ),
      true,
    );
    assert.equal(
      isTerminalRefreshFailure(
        new ApiClientError({
          code: 'FORBIDDEN',
          message: 'You cannot complete this action right now.',
          status: 403,
        }),
      ),
      true,
    );
  });

  it('keeps the session on network and server errors', () => {
    assert.equal(
      isTerminalRefreshFailure(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach Clearpay. Check your connection and try again.',
          status: 0,
        }),
      ),
      false,
    );
    assert.equal(
      isTerminalRefreshFailure(
        new ApiClientError({
          code: 'SERVER_ERROR',
          message: 'Something went wrong on our side. Please try again shortly.',
          status: 503,
        }),
      ),
      false,
    );
    assert.equal(
      isTerminalRefreshFailure(
        new ApiClientError({
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a few minutes and try again.',
          status: 429,
        }),
      ),
      false,
    );
  });
});

describe('parseRefreshTokens', () => {
  it('reads rotated tokens from the auth payload', () => {
    assert.deepEqual(
      parseRefreshTokens(
        {
          tokens: {
            accessToken: 'access-2',
            refreshToken: 'refresh-2',
            tokenType: 'Bearer',
            expiresIn: 900,
          },
        },
        'refresh-1',
      ),
      { accessToken: 'access-2', refreshToken: 'refresh-2' },
    );
  });

  it('keeps the stored refresh token when the response omits it', () => {
    assert.deepEqual(parseRefreshTokens({ accessToken: 'access-2' }, 'refresh-1'), {
      accessToken: 'access-2',
      refreshToken: 'refresh-1',
    });
  });
});

describe('createRefreshCoordinator', () => {
  it('runs one refresh for simultaneous callers', async () => {
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const saved: Array<{ accessToken: string; refreshToken: string }> = [];
    const coordinator = createRefreshCoordinator({
      readRefreshToken: async () => 'refresh-1',
      readAccessToken: async () => 'access-1',
      saveTokens: async (tokens) => {
        saved.push(tokens);
      },
      invalidateSession: async () => {
        throw new Error('session must stay');
      },
      requestRefresh: async () => {
        calls += 1;
        await gate;
        return {
          tokens: { accessToken: 'access-2', refreshToken: 'refresh-2' },
        };
      },
    });

    const first = coordinator.accessTokenForRetry('access-1');
    const second = coordinator.accessTokenForRetry('access-1');
    release?.();
    const tokens = await Promise.all([first, second]);

    assert.deepEqual(tokens, ['access-2', 'access-2']);
    assert.equal(calls, 1);
    assert.deepEqual(saved, [{ accessToken: 'access-2', refreshToken: 'refresh-2' }]);
  });

  it('reuses an access token another request already stored', async () => {
    let calls = 0;
    const coordinator = createRefreshCoordinator({
      readRefreshToken: async () => 'refresh-1',
      readAccessToken: async () => 'access-2',
      saveTokens: async () => undefined,
      invalidateSession: async () => undefined,
      requestRefresh: async () => {
        calls += 1;
        return { accessToken: 'access-3', refreshToken: 'refresh-3' };
      },
    });

    const token = await coordinator.accessTokenForRetry('access-1');
    assert.equal(token, 'access-2');
    assert.equal(calls, 0);
  });

  it('clears the session only when refresh is rejected', async () => {
    let cleared = 0;
    const coordinator = createRefreshCoordinator({
      readRefreshToken: async () => 'refresh-1',
      readAccessToken: async () => 'access-1',
      saveTokens: async () => undefined,
      invalidateSession: async () => {
        cleared += 1;
      },
      requestRefresh: async () => {
        throw unauthorized();
      },
    });

    await assert.rejects(
      () => coordinator.accessTokenForRetry('access-1'),
      (error: unknown) => error instanceof ApiClientError && error.status === 401,
    );
    assert.equal(cleared, 1);
  });

  it('does not clear the session when refresh cannot reach the server', async () => {
    let cleared = 0;
    const coordinator = createRefreshCoordinator({
      readRefreshToken: async () => 'refresh-1',
      readAccessToken: async () => 'access-1',
      saveTokens: async () => undefined,
      invalidateSession: async () => {
        cleared += 1;
      },
      requestRefresh: async () => {
        throw new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach Clearpay. Check your connection and try again.',
          status: 0,
        });
      },
    });

    await assert.rejects(
      () => coordinator.accessTokenForRetry('access-1'),
      (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR',
    );
    assert.equal(cleared, 0);
  });
});
