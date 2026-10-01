import Svg, { Path } from 'react-native-svg';

type TelegramIconProps = {
  size?: number;
  color?: string;
};

/**
 * Lightweight Telegram-compatible mark via react-native-svg.
 * Avoids adding a third-party icon package for a single glyph.
 */
export function TelegramIcon({ size = 28, color = '#FFFFFF' }: TelegramIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityRole="image"
      accessibilityLabel="Telegram"
    >
      <Path
        fill={color}
        d="M21.8 4.3c-.3-.3-.8-.4-1.2-.2L2.9 11.1c-.5.2-.8.7-.7 1.2.1.5.5.9 1 .9l4.4.3 1.7 5.3c.1.4.5.7.9.7h.1c.4 0 .7-.2.9-.5l2.3-3.1 4.6 3.4c.2.1.4.2.6.2.2 0 .4-.1.6-.2.3-.2.5-.5.5-.9l1.7-12.5c.1-.5-.1-1-.5-1.2ZM8.7 13.5l8.4-5.3-6.5 6.4-.4 2.5-1.5-3.6Zm8.9 4.1-3.9-2.9 5.5-5.4-1.6 8.3Z"
      />
    </Svg>
  );
}
