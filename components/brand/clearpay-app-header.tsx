import { TopHeader } from '@/components/brand/top-header';

type ClearpayAppHeaderProps = {
  /** Pill label next to the Clearpay mark (e.g. "Deposit Flow", "Home"). */
  badge?: string;
  /** Screen title. When set, replaces the badge cluster. */
  title?: string;
  /** Show the Clearpay mark beside `title`. */
  showLogo?: boolean;
  onBack?: () => void;
  onHelp?: () => void;
  onClose?: () => void;
  closeAccessibilityLabel?: string;
};

/**
 * Flow header — thin wrapper over the shared TopHeader.
 */
export function ClearpayAppHeader({
  badge,
  title,
  showLogo,
  onBack,
  onHelp,
  onClose,
  closeAccessibilityLabel = 'Close',
}: ClearpayAppHeaderProps) {
  return (
    <TopHeader
      closeAccessibilityLabel={closeAccessibilityLabel}
      showBack={Boolean(onBack)}
      showLogo={showLogo ?? true}
      title={title ?? badge}
      onBack={onBack}
      onClose={onClose}
      onHelp={onHelp}
    />
  );
}
