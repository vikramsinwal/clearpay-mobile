/** Shared API envelope types (Clearpay REST). */

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message: string | null;
  meta: unknown;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
