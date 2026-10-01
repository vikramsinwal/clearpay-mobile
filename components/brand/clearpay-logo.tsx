import { Image, type ImageStyle, type StyleProp } from 'react-native';

const CLEARPAY_LOGO = require('../../assets/images/clearpay-logo.png');

export type ClearpayLogoVariant = 'lockup' | 'header';

type ClearpayLogoProps = {
  /**
   * Visual height in dp.
   * - lockup (default): full brand mark for auth / welcome / modals
   * - header: compact app-bar mark
   */
  size?: number;
  variant?: ClearpayLogoVariant;
  style?: StyleProp<ImageStyle>;
};

/**
 * Official Clearpay brand logo (shield + wordmark + tagline).
 * Prefer this over ad-hoc wordmarks so the mark stays consistent app-wide.
 */
export function ClearpayLogo({
  size,
  variant = 'lockup',
  style,
}: ClearpayLogoProps) {
  const height = size ?? (variant === 'header' ? 36 : 72);
  // Vertical lockup: give enough width for contain to show shield + wordmark.
  const width =
    variant === 'header'
      ? Math.round(height * 2.6)
      : Math.round(height * 1.35);

  return (
    <Image
      accessibilityLabel="Clearpay"
      accessibilityRole="image"
      resizeMode="contain"
      source={CLEARPAY_LOGO}
      style={[{ width, height }, style]}
    />
  );
}
