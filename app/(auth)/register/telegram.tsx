import { Redirect } from 'expo-router';

/**
 * Telegram verification removed from signup.
 * Old links land on the one-step create-account flow.
 */
export default function RegisterTelegramRoute() {
  return <Redirect href="/register" />;
}
