/**
 * The one progress indicator the learner dashboard uses (§E.6).
 *
 * The accessibility audit's finding was not "some bars lack a role" but
 * that every progress affordance in the product had been built ad hoc — a
 * styled `<div>` with a width, announced to a screen reader as nothing at
 * all. A learner's whole relationship with a course is expressed through
 * these, so this component exists to make the accessible version the only
 * version available: `role="progressbar"` with the full value triple and a
 * human `aria-valuetext`, never a bare coloured strip.
 *
 * `value` is OPTIONAL on purpose. A progress bar with no number yet is
 * genuinely indeterminate, and ARIA says so by the ABSENCE of
 * `aria-valuenow` — rendering `0%` while the request is still in flight
 * would announce "not started" to the one user who cannot see that the
 * page is still loading, which is worse than saying nothing. Callers pass
 * the number once they have it and omit it until then.
 *
 * The indeterminate state reuses the existing `progress-indeterminate`
 * animation rather than inventing a second one — it is already written in
 * logical properties, so the stripe travels the reading direction in Arabic
 * instead of always left to right. The fill transitions on width; both the
 * transition and the stripe are stood down under `prefers-reduced-motion`.
 * `index.css` already neutralises animation globally, and saying it locally
 * too keeps the intent visible in the component that depends on it.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

export interface LearnerProgressBarProps {
  /**
   * Completion as a percentage, 0–100. Omitted while the real number is
   * still loading — see this component's doc comment.
   */
  readonly value?: number;
  /** Translation key for the bar's accessible name. */
  readonly labelKey?: string;
  /** Literal accessible name, for a bar named by data (a course title). */
  readonly label?: string;
  readonly className?: string;
}

/** Keeps a bad number out of the ARIA attributes as well as out of the CSS. */
function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function LearnerProgressBar({
  value,
  labelKey = 'learning:learnerDashboard.progress.label',
  label,
  className,
}: LearnerProgressBarProps): JSX.Element {
  const { t } = useTranslation();
  const percentage = value === undefined ? undefined : clampPercentage(value);
  const isIndeterminate = percentage === undefined;

  return (
    <div
      role="progressbar"
      aria-label={label ?? t(labelKey)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-valuetext={
        isIndeterminate
          ? t('learning:learnerDashboard.progress.pending')
          : t('learning:learnerDashboard.progress.valueText', { percentage })
      }
      aria-busy={isIndeterminate || undefined}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-pill bg-muted',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-pill bg-primary',
          isIndeterminate
            ? 'absolute inset-y-0 w-2/5 animate-progress-indeterminate motion-reduce:animate-none'
            : 'transition-[width] duration-slow ease-standard motion-reduce:transition-none'
        )}
        style={isIndeterminate ? undefined : { width: `${percentage}%` }}
      />
    </div>
  );
}
