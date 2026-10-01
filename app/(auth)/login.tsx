import { Redirect } from 'expo-router';

/**
 * Alias used by register flows. Same destination as `/sign-in`.
 */
export default function LoginRoute() {
  return <Redirect href="/sign-in" />;
}
