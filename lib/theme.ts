import { useColorScheme } from 'nativewind';

import { darkColors, lightColors, type ThemeColors } from '@/constants/theme';

/** NativeWind class dark mode. The app stays light until the user toggles it. */
export function useAppTheme(): {
  isDark: boolean;
  colors: ThemeColors;
  toggleColorScheme: () => void;
} {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleColorScheme: () => setColorScheme(isDark ? 'light' : 'dark'),
  };
}
