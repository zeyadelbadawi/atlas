/**
 * The overlay shown over the content while an academy switch loads (W5).
 * Bound to real work by `useAcademySwitchPhase` — it has no timer of its
 * own and renders nothing when `visible` is false.
 */
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AcademySwitchingOverlayProps {
  readonly visible: boolean;
  /** The academy being opened, when its name is already known. */
  readonly academyName?: string;
}

export function AcademySwitchingOverlay({
  visible,
  academyName,
}: AcademySwitchingOverlayProps): JSX.Element | null {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <div
      data-testid="academy-switching-overlay"
      className="absolute inset-0 z-10 flex items-start justify-center bg-background/80 px-4 pt-24 backdrop-blur-sm"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex max-w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm"
      >
        <Loader2
          className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden
        />
        <span className="min-w-0 truncate">
          {academyName
            ? t('academy:switcher.switchingTo', { name: academyName })
            : t('academy:switcher.switching')}
        </span>
      </div>
    </div>
  );
}
