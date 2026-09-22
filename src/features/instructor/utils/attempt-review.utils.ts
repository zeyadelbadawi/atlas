/**
 * P64 Phase 3 — pure helpers behind the reviewer attempt surfaces
 * (the attempts roster and the attempt detail).
 *
 * Everything here is free of React and i18n so it can be unit-tested
 * directly; the pages supply locale-aware digit formatting through the
 * `formatPart` parameter and wrap the result in a bidi isolate.
 */
import type { QuizAttemptEventType } from '@types';

/** Formats one clock component; `minimumDigits` is 2 for every part but the first. */
export type DurationPartFormatter = (
  value: number,
  minimumDigits: number
) => string;

const padPart: DurationPartFormatter = (value, minimumDigits) =>
  String(value).padStart(minimumDigits, '0');

/**
 * How long the attempt took, in whole seconds.
 *
 * The server's `durationSeconds` wins when it is present, because it is
 * computed from the server clock on both ends; the roster rows carry only
 * `startedAt`/`submittedAt`, so the difference is the fallback. `null`
 * when the attempt has not been submitted or the timestamps are unusable.
 */
export function attemptDurationSeconds(
  startedAt: string | null | undefined,
  submittedAt: string | null | undefined,
  durationSeconds?: number | null
): number | null {
  if (
    typeof durationSeconds === 'number' &&
    Number.isFinite(durationSeconds) &&
    durationSeconds >= 0
  ) {
    return Math.round(durationSeconds);
  }
  if (!startedAt || !submittedAt) return null;

  const start = Date.parse(startedAt);
  const end = Date.parse(submittedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  return Math.round((end - start) / 1000);
}

/**
 * `mm:ss`, or `h:mm:ss` past an hour — never "3720 seconds".
 * `null` when the duration is unknown (see `attemptDurationSeconds`).
 */
export function formatAttemptDuration(
  startedAt: string | null | undefined,
  submittedAt: string | null | undefined,
  durationSeconds?: number | null,
  formatPart: DurationPartFormatter = padPart
): string | null {
  const total = attemptDurationSeconds(startedAt, submittedAt, durationSeconds);
  if (total === null) return null;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

  return parts
    .map((part, index) => formatPart(part, index === 0 && hours > 0 ? 1 : 2))
    .join(':');
}

/** Translation key for one integrity event type. */
export function attemptEventLabelKey(type: QuizAttemptEventType): string {
  return `instructor:attemptReview.events.type.${type}`;
}

/** The auto-submit reasons the engine records (§D.2, §D.3). */
export const AUTO_SUBMITTED_REASONS = ['timeout', 'integrity'] as const;

/**
 * Translation key for an auto-submit reason, or `null` when the value is
 * absent or not one the copy knows — the caller then shows the raw value
 * rather than a wrong sentence.
 */
export function autoSubmittedReasonLabelKey(
  reason: string | null | undefined
): string | null {
  if (!reason) return null;
  return (AUTO_SUBMITTED_REASONS as readonly string[]).includes(reason)
    ? `instructor:quizResults.autoSubmittedReason.${reason}`
    : null;
}

/** Events in the order the server received them; a stable copy, never in place. */
export function sortEventsByServerTime<T extends { readonly serverAt: string }>(
  events: readonly T[]
): T[] {
  return [...events].sort(
    (a, b) => Date.parse(a.serverAt) - Date.parse(b.serverAt)
  );
}

/**
 * Converts a stored UTC ISO timestamp to the local wall-clock value a
 * `datetime-local` input expects (`YYYY-MM-DDTHH:mm`). Empty when absent.
 */
export function toDateTimeLocalValue(
  isoString: string | null | undefined
): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const localOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

/** The inverse: a `datetime-local` value to an ISO string, `null` when empty. */
export function fromDateTimeLocalValue(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
