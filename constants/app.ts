/** Shared non-secret app constants. */
export const APP_NAME = 'Clearpay';

export const SECURE_STORE_KEYS = {
  accessToken: 'clearpay.accessToken',
  refreshToken: 'clearpay.refreshToken',
  /** Active deposit session public id (`deps_…`) for proof submit recovery. */
  depositSessionPublicId: 'clearpay.depositSessionPublicId',
} as const;
