/**
 * Semantic colors shared by icon props and the NativeWind `app` scale.
 * Light values match `tailwind.config.js` `theme.extend.colors.app`.
 */
export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textFaint: '#94A3B8',
  primary: '#1B6CA8',
  success: '#059669',
  warning: '#D97706',
  danger: '#EF4444',
  white: '#FFFFFF',
} as const;

export const darkColors = {
  background: '#071226',
  surface: '#0C2D4A',
  border: '#11426A',
  textPrimary: '#F8FAFC',
  textSecondary: '#C5D3E4',
  textFaint: '#8FA7C4',
  primary: '#58A3D5',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  white: '#FFFFFF',
} as const;

export type ThemeColors = {
  [Key in keyof typeof lightColors]: string;
};
