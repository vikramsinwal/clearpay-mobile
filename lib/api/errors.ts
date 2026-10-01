import type { ApiErrorEnvelope, ApiSuccessEnvelope } from '@/types/api';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  /** Backend `error.code` when the envelope includes one. */
  readonly apiCode: string | null;
  readonly status: number;
  readonly details?: unknown;
  readonly fieldErrors: Record<string, string>;

  constructor(options: {
    code: ApiErrorCode;
    message: string;
    status: number;
    apiCode?: string | null;
    details?: unknown;
    fieldErrors?: Record<string, string>;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.apiCode = options.apiCode ?? null;
    this.status = options.status;
    this.details = options.details;
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

function mapStatusToCode(status: number, code?: string): ApiErrorCode {
  if (code === 'VALIDATION_ERROR') return 'VALIDATION_ERROR';
  if (code === 'CONFLICT' || status === 409) return 'CONFLICT';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

/** Keep short API sentences. Drop anything that looks like an internal dump. */
function serverMessage(fallback: string): string | null {
  const text = fallback.trim();
  if (text.length < 1 || text.length > 240) return null;
  if (/mongodb|objectid|stack trace|\/api\/internal/i.test(text)) return null;
  return text;
}

function userFacingMessage(code: ApiErrorCode, fallback: string): string {
  const fromServer = serverMessage(fallback);
  switch (code) {
    case 'CONFLICT':
      return fromServer ?? 'This action conflicts with the current account state.';
    case 'VALIDATION_ERROR':
      return fromServer ?? 'Please check your details and try again.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'NETWORK_ERROR':
      return 'Unable to reach Clearpay. Check your connection and try again.';
    case 'TIMEOUT':
      return 'Unable to connect to the server. Please try again.';
    case 'INVALID_RESPONSE':
      return 'Unable to sign in right now. Please try again.';
    case 'SERVER_ERROR':
      return fromServer ?? 'Something went wrong on our side. Please try again shortly.';
    case 'UNAUTHORIZED':
      return 'Your session expired. Please sign in again.';
    case 'FORBIDDEN':
      return fromServer ?? 'You cannot complete this action right now.';
    case 'NOT_FOUND':
      return fromServer ?? 'That account could not be found.';
    default:
      return fromServer ?? 'Something went wrong. Please try again.';
  }
}

function extractFieldErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const out: Record<string, string> = {};
  for (const item of details) {
    if (
      item &&
      typeof item === 'object' &&
      'field' in item &&
      'message' in item &&
      typeof (item as { field: unknown }).field === 'string' &&
      typeof (item as { message: unknown }).message === 'string'
    ) {
      const field = (item as { field: string }).field;
      const message = (item as { message: string }).message;
      if (field && message && !out[field]) {
        out[field] = message;
      }
    }
  }
  return out;
}

export class RequestTimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'RequestTimeoutError';
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof RequestTimeoutError ||
    (error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'RequestTimeoutError'))
  );
}

export async function parseApiEnvelope<T>(
  response: Response,
): Promise<ApiSuccessEnvelope<T>> {
  if (response.status === 0) {
    throw new ApiClientError({
      code: 'NETWORK_ERROR',
      message: userFacingMessage('NETWORK_ERROR', ''),
      status: 0,
    });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError({
      code: response.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
      message: userFacingMessage(
        response.status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN',
        'Unexpected response from Clearpay.',
      ),
      status: response.status,
    });
  }

  if (!response.ok) {
    const err = body as ApiErrorEnvelope;
    const apiCode = err?.error?.code;
    const code = mapStatusToCode(response.status, apiCode);
    const rawMessage =
      typeof err?.error?.message === 'string' ? err.error.message : '';
    throw new ApiClientError({
      code,
      apiCode: typeof apiCode === 'string' ? apiCode : null,
      message: userFacingMessage(code, rawMessage),
      status: response.status,
      details: err?.error?.details,
      fieldErrors: extractFieldErrors(err?.error?.details),
    });
  }

  const success = body as ApiSuccessEnvelope<T>;
  if (!success || success.success !== true) {
    throw new ApiClientError({
      code: 'UNKNOWN',
      message: userFacingMessage('UNKNOWN', 'Unexpected response from Clearpay.'),
      status: response.status,
    });
  }

  return success;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const envelope = await parseApiEnvelope<T>(response);
  return envelope.data;
}

export function toNetworkError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (isTimeoutError(error)) {
    return new ApiClientError({
      code: 'TIMEOUT',
      message: userFacingMessage('TIMEOUT', ''),
      status: 0,
    });
  }
  return new ApiClientError({
    code: 'NETWORK_ERROR',
    message: userFacingMessage('NETWORK_ERROR', ''),
    status: 0,
  });
}
