/**
 * The circular sibling of `LearnerProgressBar` (§E.1's "progress rings").
 *
 * WHY A SECOND COMPONENT AND NOT A SECOND HAND-ROLLED SVG. The
 * accessibility audit's finding was never "some bars lack a role" — it
 * was that every progress affordance in the product had been built ad
 * hoc, and announced to a screen reader as nothing at all. A ring drawn
 * inline in the Overview page would be exactly that mistake in a new
 * shape. So this exists for the same reason the bar does: to make the
 * accessible version the only version available.
 *
 * IT SHARES THE BAR'S ARIA CONTRACT EXACTLY — `role="progressbar"`, the
 * full value triple, a human `aria-valuetext`, and the same rule that an
 * absent `value` means genuinely indeterminate (no `aria-valuenow`, and
 * `aria-busy`) rather than zero. The two must never disagree about what
 * "no number yet" sounds like, because a learner hears both on the same
 * screen.
 *
 * THE GEOMETRY IS A STROKE-DASH, drawn on a `viewBox` so it scales with
 * the font rather than to a fixed pixel size, and the whole `<svg>` is
 * `aria-hidden` with the ARIA living on the wrapper: a screen reader
 * should hear one progress indicator, not a progress indicator and an
 * unlabelled graphic. The sweep starts at twelve o'clock in both
 * directions — a ring is not text and does not mirror in Arabic; what
 * mirrors is the layout around it.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

export interface LearnerProgressRingProps {
  /** Completion as a percentage, 0–100. Omitted while the real number is loading. */
  readonly value?: number;
  /** Literal accessible name, for a ring named by data (a course title). */
  readonly label?: string;
  readonly labelKey?: string;
  /** Rendered in the middle. Defaults to the percentage itself. */
  readonly children?: React.ReactNode;
  readonly className?: string;
}

/** Radius in the 36×36 user-space box, leaving room for the stroke. */
const RADIUS = 15.9155;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function LearnerProgressRing({
  value,
  label,
  labelKey = 'learning:learnerDashboard.progress.label',
  children,
  className,
}: LearnerProgressRingProps): JSX.Element {
  const { t } = useTranslation();
  const percentage = value === undefined ? undefined : clampPercentage(value);
  const isIndeterminate = percentage === undefined;
  const dash = isIndeterminate ? 0 : (percentage / 100) * CIRCUMFERENCE;

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
        'relative inline-flex size-16 items-center justify-center',
        className
      )}
    >
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-muted"
        />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
          className="stroke-primary transition-[stroke-dasharray] duration-slow ease-standard motion-reduce:transition-none"
        />
      </svg>

      <span className="absolute text-xs font-semibold tabular-nums text-foreground">
        {children ?? (isIndeterminate ? '' : `${percentage}%`)}
      </span>
    </div>
  );
}
