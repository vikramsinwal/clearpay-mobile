import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CustomerLoginInput } from '@/features/auth/types';
import { ApiClientError, parseApiEnvelope } from '@/lib/api/errors';
import { hasStoredSession } from '@/features/auth/lib/stored-session';
import { getSignInErrorMessage } from '@/features/auth/lib/sign-in-errors';
import {
  assertConfirmedLoginPayload,
  createLoginLock,
  runLoginAttempt,
  type LoginAttemptDeps,
  type LoginAttemptEffects,
} from '@/features/auth/lib/login-session';

const input: CustomerLoginInput = {
  email: 'trader@example.com',
  password: 'Secret123!',
};

function confirmedPayload() {
  return {
    customer: {
      publicId: 'cus_123',
      name: 'Trader',
      email: 'trader@example.com',
      status: 'ACTIVE',
    },
    tokens: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    },
  };
}

function httpError(status: number, code: ApiClientError['code'] = 'UNKNOWN') {
  return new ApiClientError({
    code,
    message: 'failed',
    status,
  });
}

function trackEffects(seedAuthenticated = false) {
  const calls = {
    save: 0,
    clearTokens: 0,
    setSession: 0,
    navigate: 0,
    clearSession: 0,
  };
  let authenticated = seedAuthenticated;
  const effects: LoginAttemptEffects = {
    setSession: () => {
      calls.setSession += 1;
      authenticated = true;
    },
    navigateToDashboard: () => {
      calls.navigate += 1;
    },
    clearSession: () => {
      calls.clearSession += 1;
      authenticated = false;
    },
  };
  return {
    calls,
    effects,
    isAuthenticated: () => authenticated,
  };
}

function deps(
  login: LoginAttemptDeps['login'],
  calls: { save: number; clearTokens: number },
): LoginAttemptDeps {
  return {
    login,
    saveTokens: async () => {
      calls.save += 1;
    },
    clearTokens: async () => {
      calls.clearTokens += 1;
    },
  };
}

describe('login attempt', () => {
  it('navigates only after a confirmed 200 payload', async () => {
    const tracked = trackEffects();
    const payload = await runLoginAttempt(
      input,
      deps(async () => confirmedPayload(), tracked.calls),
      tracked.effects,
    );
    assert.equal(payload.tokens.accessToken, 'access-token');
    assert.equal(tracked.calls.save, 1);
    assert.equal(tracked.calls.setSession, 1);
    assert.equal(tracked.calls.navigate, 1);
    assert.equal(tracked.isAuthenticated(), true);
  });

  it('stays signed out when the API returns 401', async () => {
    const tracked = trackEffects();
    await assert.rejects(
      () =>
        runLoginAttempt(
          input,
          deps(async () => {
            throw httpError(401, 'UNAUTHORIZED');
          }, tracked.calls),
          tracked.effects,
        ),
      (error: unknown) => error instanceof ApiClientError && error.code === 'UNAUTHORIZED',
    );
    assert.equal(tracked.calls.save, 0);
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(tracked.isAuthenticated(), false);
    assert.equal(
      getSignInErrorMessage(httpError(401, 'UNAUTHORIZED')),
      'Invalid email or password.',
    );
  });

  it('stays signed out for 400, 403, and 500', async () => {
    for (const status of [400, 403, 500] as const) {
      const tracked = trackEffects();
      const code = status === 400 ? 'VALIDATION_ERROR' : status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR';
      await assert.rejects(() =>
        runLoginAttempt(
          input,
          deps(async () => {
            throw httpError(status, code);
          }, tracked.calls),
          tracked.effects,
        ),
      );
      assert.equal(tracked.calls.navigate, 0);
      assert.equal(tracked.calls.setSession, 0);
      assert.equal(tracked.calls.save, 0);
    }
  });

  it('stays signed out when the API does not respond', async () => {
    const tracked = trackEffects();
    await assert.rejects(
      () =>
        runLoginAttempt(
          input,
          deps(() => new Promise(() => {}), tracked.calls),
          tracked.effects,
          { timeoutMs: 30 },
        ),
      (error: unknown) => error instanceof ApiClientError && error.code === 'TIMEOUT',
    );
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(tracked.calls.save, 0);
    assert.equal(tracked.isAuthenticated(), false);
  });

  it('does not treat a timeout as authentication', async () => {
    const tracked = trackEffects();
    let late = false;
    await assert.rejects(() =>
      runLoginAttempt(
        input,
        deps(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                late = true;
                resolve(confirmedPayload());
              }, 80);
            }),
          tracked.calls,
        ),
        tracked.effects,
        { timeoutMs: 20 },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(late, true);
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(tracked.calls.setSession, 0);
    assert.equal(tracked.calls.save, 0);
    assert.equal(
      getSignInErrorMessage(httpError(0, 'TIMEOUT')),
      'Unable to connect to the server. Please try again.',
    );
  });

  it('stays signed out when the network fails', async () => {
    const tracked = trackEffects();
    await assert.rejects(
      () =>
        runLoginAttempt(
          input,
          deps(async () => {
            throw new TypeError('Network request failed');
          }, tracked.calls),
          tracked.effects,
        ),
      (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR',
    );
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(
      getSignInErrorMessage(httpError(0, 'NETWORK_ERROR')),
      'Unable to connect to the server. Please try again.',
    );
  });

  it('stays signed out on a malformed login response', async () => {
    const tracked = trackEffects();
    await assert.rejects(
      () =>
        runLoginAttempt(
          input,
          deps(async () => ({ success: true, data: null }), tracked.calls),
          tracked.effects,
        ),
      (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE',
    );
    assert.equal(tracked.calls.save, 0);
    assert.equal(tracked.calls.navigate, 0);
  });

  it('stays signed out when the token is missing or blank', async () => {
    const tracked = trackEffects();
    const payload = confirmedPayload();
    payload.tokens.accessToken = '   ';
    await assert.rejects(
      () =>
        runLoginAttempt(
          input,
          deps(async () => payload, tracked.calls),
          tracked.effects,
        ),
      (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE',
    );
    assert.equal(tracked.calls.save, 0);
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(tracked.calls.setSession, 0);
  });

  it('sends only one login request when submit is tapped twice', async () => {
    const tracked = trackEffects();
    let calls = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const login = () => {
      calls += 1;
      return gate.then(() => confirmedPayload());
    };
    const lock = createLoginLock();
    const attemptDeps = deps(login, tracked.calls);

    const first = (async () => {
      assert.equal(lock.tryAcquire(), true);
      try {
        await runLoginAttempt(input, attemptDeps, tracked.effects, { timeoutMs: 2000 });
      } finally {
        lock.release();
      }
    })();

    assert.equal(lock.tryAcquire(), false);
    release();
    await first;
    assert.equal(calls, 1);
    assert.equal(tracked.calls.navigate, 1);
  });

  it('restores a stored session only when both tokens exist', () => {
    assert.equal(hasStoredSession('access', 'refresh'), true);
    assert.equal(hasStoredSession(null, null), false);
    assert.equal(hasStoredSession('access', null), false);
    assert.equal(hasStoredSession('', 'refresh'), false);
  });

  it('does not redirect when login fails and a stale session already exists', async () => {
    const tracked = trackEffects(true);
    await assert.rejects(() =>
      runLoginAttempt(
        input,
        deps(async () => {
          throw new TypeError('Network request failed');
        }, tracked.calls),
        tracked.effects,
      ),
    );
    assert.equal(tracked.calls.navigate, 0);
    assert.equal(tracked.calls.setSession, 0);
    assert.equal(tracked.calls.clearSession, 0);
    assert.equal(tracked.isAuthenticated(), true);
  });

  it('allows a successful retry after a failed login', async () => {
    const tracked = trackEffects();
    let attempt = 0;
    const login = async () => {
      attempt += 1;
      if (attempt === 1) {
        throw httpError(401, 'UNAUTHORIZED');
      }
      return confirmedPayload();
    };
    const attemptDeps = deps(login, tracked.calls);
    await assert.rejects(() => runLoginAttempt(input, attemptDeps, tracked.effects));
    await runLoginAttempt(input, attemptDeps, tracked.effects);
    assert.equal(attempt, 2);
    assert.equal(tracked.calls.save, 1);
    assert.equal(tracked.calls.navigate, 1);
    assert.equal(tracked.calls.setSession, 1);
  });
});

describe('login HTTP envelope', () => {
  it('rejects 401, 400, 403, and 500 before any session is accepted', async () => {
    for (const status of [401, 400, 403, 500]) {
      const response = new Response(
        JSON.stringify({
          success: false,
          error: { code: 'ERROR', message: 'nope' },
        }),
        { status, headers: { 'Content-Type': 'application/json' } },
      );
      await assert.rejects(() => parseApiEnvelope(response));
    }
  });

  it('rejects a non-JSON body, a failed envelope, and status 0', async () => {
    await assert.rejects(() =>
      parseApiEnvelope(new Response('not-json', { status: 200 })),
    );
    await assert.rejects(() =>
      parseApiEnvelope(
        new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await assert.rejects(
      () => parseApiEnvelope(new Response('', { status: 0 })),
      (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR',
    );
  });

  it('returns data only when the envelope says success', async () => {
    const envelope = await parseApiEnvelope(
      new Response(
        JSON.stringify({
          success: true,
          data: confirmedPayload(),
          message: null,
          meta: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    assert.equal(assertConfirmedLoginPayload(envelope.data).customer.publicId, 'cus_123');
  });

  it('rejects a success envelope whose token is missing', async () => {
    const envelope = await parseApiEnvelope<{ tokens?: { accessToken?: string } }>(
      new Response(
        JSON.stringify({
          success: true,
          data: { customer: { publicId: 'cus_123' } },
          message: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    assert.throws(
      () => assertConfirmedLoginPayload(envelope.data),
      (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE',
    );
  });
});
