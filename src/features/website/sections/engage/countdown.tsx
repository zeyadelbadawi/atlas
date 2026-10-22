/**
 * The countdown every theme's countdown section draws (CMS phase 3d): the
 * ticking state (`useCountdown`) and its theme-neutral markup
 * (`CountdownStatus`), which each theme dresses with its own classes.
 *
 * SERVER FIRST, THEN THE CLOCK. The server renders the time left at the
 * moment it rendered, and writes that moment on the section
 * (`data-countdown-now`). Hydration reads it back, so the browser's first
 * render is character for character the server's (no mismatch, even for a
 * page served from the edge cache minutes later); then the clock starts and
 * corrects it within the same second. Digits are tabular and every unit has
 * a fixed width, so a tick never moves anything.
 *
 * QUIET FOR ASSISTIVE TECHNOLOGY. The ticking digits are `role="timer"`
 * with `aria-live="off"` and a full-sentence label at minute precision —
 * read when a visitor reaches it, never announced every second. Only the
 * moment the deadline passes is announced (the status region is polite).
 * No animation at all: a tick is a plain change of digits, so there is
 * nothing to reduce for `prefers-reduced-motion` and nothing flashes.
 *
 * The clock ticks on the second, pauses while the tab is hidden and stops
 * at the deadline.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import type { CountdownSectionConfig, PublicWebsiteLocale } from '@types';
import {
  countdownRemaining,
  deadlineInstant,
  deadlineText,
  deadlineTimeZone,
  formatCountdownNumber,
  type CountdownRemaining,
} from '@/features/website/utils/countdown.utils';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';

const UNITS = ['days', 'hours', 'minutes', 'seconds'] as const;
type CountdownUnit = (typeof UNITS)[number];

/** The moment the server rendered this countdown, during hydration only. */
function serverRenderedAt(id: string): number | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const element of document.querySelectorAll<HTMLElement>(
    '[data-countdown-now]'
  )) {
    if (element.getAttribute('data-countdown') !== id) continue;
    const value = Number(element.getAttribute('data-countdown-now'));
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

export interface CountdownState {
  /** `unset`: no valid deadline yet (the public site leaves the section out). */
  readonly status: 'unset' | 'running' | 'ended';
  readonly remaining: CountdownRemaining;
  readonly units: readonly {
    readonly key: CountdownUnit;
    readonly value: string;
    readonly label: string;
  }[];
  /** "Closes Thursday 5 November 2026, 23:59 (UTC+2)"; empty when unset. */
  readonly closes: string;
  /** The timer's accessible name: the time left, in a sentence. */
  readonly label: string;
  /** The "after it ends" message (the Owner's, else a plain default). */
  readonly endedMessage: string;
  /** Spread on the section's root: what hydration reads back. */
  readonly rootProps: {
    readonly 'data-countdown': string;
    readonly 'data-countdown-now': number;
  };
}

export function useCountdown(
  config: CountdownSectionConfig,
  locale: PublicWebsiteLocale
): CountdownState {
  const { t } = useTranslation();
  const id = useId();
  const [renderedAt] = useState(() => serverRenderedAt(id) ?? Date.now());
  const [now, setNow] = useState(renderedAt);
  const deadline = deadlineInstant(config.deadline);

  useEffect(() => {
    if (deadline === undefined) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline || document.hidden) return;
      timer = setTimeout(tick, 1000 - (current % 1000) + 10);
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) tick();
    };
    tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [deadline]);

  const remaining = countdownRemaining(deadline ?? 0, now);
  const status =
    deadline === undefined ? 'unset' : remaining.ended ? 'ended' : 'running';

  const count = (unit: 'day' | 'hour' | 'minute', value: number) =>
    t(`website:renderer.countdown.${unit}Count`, {
      count: value,
      value: formatCountdownNumber(value, locale),
    });
  const label =
    status !== 'running'
      ? ''
      : remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0
        ? t('website:renderer.countdown.lessThanMinute')
        : remaining.days === 0
          ? t('website:renderer.countdown.timeLeftShort', {
              hours: count('hour', remaining.hours),
              minutes: count('minute', remaining.minutes),
            })
          : t('website:renderer.countdown.timeLeft', {
              days: count('day', remaining.days),
              hours: count('hour', remaining.hours),
              minutes: count('minute', remaining.minutes),
            });

  let closes = '';
  if (deadline !== undefined) {
    const text = deadlineText(
      deadline,
      deadlineTimeZone(config.deadline, config.timeZone),
      locale
    );
    closes = t('website:renderer.countdown.closes', { ...text });
  }

  return {
    status,
    remaining,
    units: UNITS.map((key) => ({
      key,
      value: formatCountdownNumber(
        remaining[key],
        locale,
        key === 'days' ? 1 : 2
      ),
      label: t(`website:renderer.countdown.units.${key}`),
    })),
    closes,
    label,
    endedMessage:
      resolveLocalizedText(config.endedMessage, locale) ||
      t('website:renderer.countdown.ended'),
    rootProps: { 'data-countdown': id, 'data-countdown-now': renderedAt },
  };
}

/** A theme's classes for the countdown's parts. */
export interface CountdownClasses {
  /** The row of units. */
  readonly timer?: string;
  /** One unit (number and its name). */
  readonly unit?: string;
  readonly value?: string;
  readonly label?: string;
  /** The "after it ends" message. */
  readonly ended?: string;
}

/**
 * The time left, or the "after it ends" message once the deadline passes.
 * Nothing when unset (the renderer decides what a preview says instead).
 */
export function CountdownStatus({
  state,
  classes,
  className,
}: {
  readonly state: CountdownState;
  readonly classes: CountdownClasses;
  readonly className?: string;
}): JSX.Element | null {
  if (state.status === 'unset') return null;
  return (
    <div
      aria-live="polite"
      className={className}
      data-countdown-status={state.status}
    >
      {state.status === 'ended' ? (
        <p className={classes.ended}>{state.endedMessage}</p>
      ) : (
        <div
          role="timer"
          aria-live="off"
          aria-label={state.label}
          className={cn('tabular-nums', classes.timer)}
        >
          {state.units.map((unit) => (
            <div key={unit.key} className={classes.unit} data-unit={unit.key}>
              <span
                aria-hidden
                className={classes.value}
                suppressHydrationWarning
              >
                {unit.value}
              </span>
              <span aria-hidden className={classes.label}>
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
