/**
 * NativeWind web color-scheme sync requires class darkMode.
 * Inject a <style> into <head> so css-interop's MutationObserver picks up
 * `--css-interop-darkMode` as `class` (default `media` throws on set).
 */
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const prop = '--css-interop-darkMode';
  const value = 'class dark';

  document.documentElement.style.setProperty(prop, value);

  const id = 'clearpay-nativewind-darkmode';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `:root { ${prop}: ${value}; }`;
    document.head.prepend(style);
  }
}
