/** Both token strings must be present. Blank values are not a session. */
export function hasStoredSession(
  accessToken: string | null | undefined,
  refreshToken: string | null | undefined,
): boolean {
  return Boolean(accessToken && refreshToken);
}
