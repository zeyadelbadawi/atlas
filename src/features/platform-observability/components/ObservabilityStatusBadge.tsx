/**
 * One badge for every monitoring state, so a state never reads differently
 * on two pages. Colour is never the only signal: icon shape + word too.
 * Tone tables live in `utils/status-tones.ts`.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { TONE_CLASS, badgeSpec, type BadgeKind } from '../utils/status-tones';

export type ObservabilityStatusBadgeProps = BadgeKind & {
  readonly className?: string;
};

export function ObservabilityStatusBadge({
  className,
  ...badge
}: ObservabilityStatusBadgeProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { tone, icon: Icon, labelKey } = badgeSpec(badge as BadgeKind);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium',
        TONE_CLASS[tone],
        className
      )}
      data-tone={tone}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {i18n.exists(labelKey) ? t(labelKey) : badge.value}
    </span>
  );
}
