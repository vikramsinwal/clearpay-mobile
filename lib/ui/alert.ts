import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert. `Alert.alert` is a documented no-op on
 * react-native-web (it renders nothing at all), so error/notice messages
 * silently vanish in the browser unless we fall back to `window.alert`.
 * https://github.com/necolas/react-native-web/issues/1026
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const text = [title, message].filter(Boolean).join('\n\n');
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
