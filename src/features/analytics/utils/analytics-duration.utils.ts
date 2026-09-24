/**
 * Humanised durations for the Commerce report's approval latency.
 *
 * The backend answers seconds; an operator reads "2 h 15 min". The largest
 * unit leads and one smaller unit follows when it adds information, so
 * 5 400 s reads "1 h 30 min" and 45 s reads "45 s". `null` (an empty
 * sample) is a dash rather than "0 s", because no approvals happened is
 * not the same as approvals were instant.
 */

export type DurationTranslate = (
  key: string,
  options: { readonly count: number }
) => string;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

export const NO_VALUE = '—';

export function formatApprovalDuration(
  seconds: number | null,
  t: DurationTranslate
): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return NO_VALUE;
  }
  const whole = Math.round(seconds);

  if (whole < SECONDS_PER_MINUTE) {
    return t('analytics:duration.seconds', { count: whole });
  }
  if (whole < SECONDS_PER_HOUR) {
    return t('analytics:duration.minutes', {
      count: Math.round(whole / SECONDS_PER_MINUTE),
    });
  }
  if (whole < SECONDS_PER_DAY) {
    const hours = Math.floor(whole / SECONDS_PER_HOUR);
    const minutes = Math.round((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const head = t('analytics:duration.hours', { count: hours });
    return minutes > 0
      ? `${head} ${t('analytics:duration.minutes', { count: minutes })}`
      : head;
  }
  const days = Math.floor(whole / SECONDS_PER_DAY);
  const hours = Math.round((whole % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const head = t('analytics:duration.days', { count: days });
  return hours > 0
    ? `${head} ${t('analytics:duration.hours', { count: hours })}`
    : head;
}
