import { getCustomerApiRoot } from '@/lib/env';
import {
  parseApiEnvelope,
  RequestTimeoutError,
  toNetworkError,
} from '@/lib/api/errors';
import {
  createRefreshCoordinator,
  shouldAttemptTokenRefresh,
} from '@/lib/api/refresh-session';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from '@/lib/auth/secure-tokens';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiSuccessEnvelope } from '@/types/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Abort the request if the server has not responded in time. */
  timeoutMs?: number;
};

const refreshCoordinator = createRefreshCoordinator({
  readRefreshToken: getRefreshToken,
  readAccessToken: getAccessToken,
  saveTokens: saveAuthTokens,
  invalidateSession: async () => {
    try {
      await clearAuthTokens();
    } finally {
      useAuthStore.getState().clearSession();
      queryClient.clear();
    }
  },
  requestRefresh: async (refreshToken) => {
    const envelope = await requestEnvelope<unknown>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    return envelope.data;
  },
});

/**
 * 401 on a bearer call refreshes once, stores the new tokens, and retries.
 * The session is cleared only when that refresh is rejected.
 */
async function withAccessRefresh<T>(
  path: string,
  options: RequestOptions,
  send: (options: RequestOptions) => Promise<T>,
): Promise<T> {
  try {
    return await send(options);
  } catch (error) {
    if (
      !shouldAttemptTokenRefresh({
        path,
        accessToken: options.accessToken,
        error,
      })
    ) {
      throw error;
    }
    const accessToken = await refreshCoordinator.accessTokenForRetry(options.accessToken);
    return send({ ...options, accessToken });
  }
}

function bindParentAbort(
  parent: AbortSignal | undefined,
  child: AbortController,
): () => void {
  if (!parent) return () => {};
  if (parent.aborted) {
    child.abort();
    return () => {};
  }
  const onAbort = () => child.abort();
  parent.addEventListener('abort', onAbort);
  return () => parent.removeEventListener('abort', onAbort);
}

/**
 * Clearpay REST client. All customer calls go through here — screens must not
 * call fetch directly.
 */
async function requestEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  const root = getCustomerApiRoot();
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const timeoutMs = options.timeoutMs;
  const useTimeout = typeof timeoutMs === 'number' && timeoutMs > 0;
  const timeoutController = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (useTimeout) {
    timer = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }
  const unlinkParent = useTimeout
    ? bindParentAbort(options.signal, timeoutController)
    : () => {};

  try {
    const response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: useTimeout ? timeoutController.signal : options.signal,
    });
    if (timedOut) {
      throw new RequestTimeoutError();
    }
    return await parseApiEnvelope<T>(response);
  } catch (error) {
    if (timedOut || error instanceof RequestTimeoutError) {
      throw toNetworkError(new RequestTimeoutError());
    }
    throw toNetworkError(error);
  } finally {
    if (timer) clearTimeout(timer);
    unlinkParent();
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const envelope = await withAccessRefresh(path, options, (next) =>
    requestEnvelope<T>(path, next),
  );
  return envelope.data;
}

/** Same client as `apiRequest`, including `message` and list `meta`. */
export async function apiRequestEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  return withAccessRefresh(path, options, (next) => requestEnvelope<T>(path, next));
}

type ProgressOptions = RequestOptions & {
  onProgress?: (percent: number) => void;
};

/**
 * JSON POST with upload progress. Same auth, URL, and envelope rules as
 * `apiRequestEnvelope`.
 */
function apiRequestEnvelopeWithProgressOnce<T>(
  path: string,
  options: ProgressOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  const root = getCustomerApiRoot();
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? 'POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (options.accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${options.accessToken}`);
    }
    xhr.upload.onprogress = (event) => {
      if (!options.onProgress || !event.lengthComputable || event.total <= 0) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      options.onProgress(percent);
    };
    xhr.onerror = () => {
      reject(toNetworkError(new Error('network')));
    };
    xhr.onload = () => {
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        headers: { 'Content-Type': 'application/json' },
      });
      parseApiEnvelope<T>(response).then(resolve).catch(reject);
    };
    if (options.signal) {
      options.signal.addEventListener('abort', () => xhr.abort());
    }
    xhr.send(options.body !== undefined ? JSON.stringify(options.body) : null);
  });
}

export function apiRequestEnvelopeWithProgress<T>(
  path: string,
  options: ProgressOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  return withAccessRefresh(path, options, (next) =>
    apiRequestEnvelopeWithProgressOnce<T>(path, next),
  );
}
