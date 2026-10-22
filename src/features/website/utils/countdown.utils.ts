/**
 * Countdown arithmetic (CMS phase 3d): the time left until a deadline, and
 * moving between a deadline (an ISO instant with its offset) and the wall
 * clock of the academy's time zone the Owner picked it in.
 *
 * Pure functions over `Intl` — no date library. The text the public site
 * shows is assembled from `formatToParts` values (names and digits), never
 * from a whole formatted string, so the server and the browser produce the
 * same characters even when their ICU versions space a time differently.
 */
import { isCountdownDeadline } from './section-media-values.utils';

export type CountdownLocale = 'en' | 'ar';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** What is left until the deadline, in whole units. */
export interface CountdownRemaining {
  readonly ended: boolean;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/** The time left at `now` (both in ms); `ended` once the deadline is reached. */
export function countdownRemaining(
  deadlineMs: number,
  nowMs: number
): CountdownRemaining {
  const left = Math.max(0, deadlineMs - nowMs);
  // Counted in whole seconds, rounded up, so "0 seconds left" only shows at the deadline itself.
  const total = Math.ceil(left / 1000) * 1000;
  return {
    ended: left <= 0,
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
    seconds: Math.floor((total % MINUTE) / 1000),
  };
}

/** The deadline as an instant (ms), or `undefined` when it isn't a valid deadline. */
export function deadlineInstant(
  deadline: string | undefined
): number | undefined {
  if (!deadline || !isCountdownDeadline(deadline)) return undefined;
  return Date.parse(deadline);
}

/** Whether `Intl` knows the zone name. */
export function isKnownTimeZone(timeZone: string | undefined): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The browser's own zone, the last resort when the academy has none. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface WallParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

const wallFormatters = new Map<string, Intl.DateTimeFormat>();

/** The wall clock in `timeZone` at an instant. */
function wallPartsAt(instant: number, timeZone: string): WallParts {
  let formatter = wallFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    wallFormatters.set(timeZone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(instant))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    // Some engines write midnight as 24 with `h23`.
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

/** The zone's offset from UTC at an instant, in minutes (Cairo in winter: 120). */
export function timeZoneOffsetMinutes(
  instant: number,
  timeZone: string
): number {
  const wall = wallPartsAt(instant, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / MINUTE);
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function offsetText(offset: number): string {
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * A wall clock time typed in a `datetime-local` field (`2026-11-05T23:59`),
 * read in `timeZone`, as a deadline: an ISO date and time with that zone's
 * offset on that date (`2026-11-05T23:59:00+02:00`). `undefined` when the
 * text is not a complete date and time.
 */
export function wallTimeToDeadline(
  wallTime: string,
  timeZone: string
): string | undefined {
  const match = WALL_TIME_PATTERN.exec(wallTime);
  if (!match) return undefined;
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  if (Number.isNaN(asUtc)) return undefined;
  // Two passes settle the offset on either side of a clock change.
  const first = timeZoneOffsetMinutes(asUtc, timeZone);
  const offset = timeZoneOffsetMinutes(asUtc - first * MINUTE, timeZone);
  const deadline = `${wallTime}:00${offsetText(offset)}`;
  return isCountdownDeadline(deadline) ? deadline : undefined;
}

/** A deadline as the wall clock of `timeZone`, for a `datetime-local` field. */
export function deadlineToWallTime(deadline: string, timeZone: string): string {
  const instant = deadlineInstant(deadline);
  if (instant === undefined) return '';
  const wall = wallPartsAt(instant, timeZone);
  return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

/** `UTC+2`, `UTC+5:30`, `UTC-3`, `UTC` — the zone's offset at the deadline. */
export function utcOffsetLabel(instant: number, timeZone: string): string {
  const offset = timeZoneOffsetMinutes(instant, timeZone);
  if (offset === 0) return 'UTC';
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  const minutes = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${minutes ? `:${pad(minutes)}` : ''}`;
}

const intlLocale = (locale: CountdownLocale) =>
  locale === 'ar' ? 'ar-EG' : 'en-GB';

/** A whole number in the locale's digits; `width` pads it (`07`, `٠٧`). */
export function formatCountdownNumber(
  value: number,
  locale: CountdownLocale,
  width = 1
): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumIntegerDigits: width,
    useGrouping: false,
  });
}

/** The deadline's date and time in the zone, as separate words for a sentence. */
export interface DeadlineText {
  /** "Thursday 5 November 2026" / "الخميس ٥ نوفمبر ٢٠٢٦". */
  readonly date: string;
  /** "23:59" / "١١:٥٩ م". */
  readonly time: string;
  /** "UTC+2". */
  readonly zone: string;
}

/** The deadline in `timeZone`, assembled from parts (see this file's doc comment). */
export function deadlineText(
  instant: number,
  timeZone: string,
  locale: CountdownLocale
): DeadlineText {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: locale === 'ar' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12: locale === 'ar',
  });
  for (const part of formatter.formatToParts(new Date(instant))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const time = `${parts.hour ?? ''}:${parts.minute ?? ''}${
    parts.dayPeriod ? ` ${parts.dayPeriod}` : ''
  }`;
  return {
    date: [parts.weekday, parts.day, parts.month, parts.year]
      .filter(Boolean)
      .join(' '),
    time,
    zone: utcOffsetLabel(instant, timeZone),
  };
}

/**
 * The zone to name a deadline in: the academy's (stored with it) when this
 * browser knows it, else a fixed zone at the deadline's own offset (whole
 * hours), else UTC.
 */
export function deadlineTimeZone(
  deadline: string,
  timeZone: string | undefined
): string {
  if (timeZone && isKnownTimeZone(timeZone)) return timeZone;
  const match = /([+-])(\d{2}):(\d{2})$/.exec(deadline);
  if (!match || match[3] !== '00') return 'UTC';
  const hours = Number(match[2]);
  if (hours === 0) return 'UTC';
  // `Etc/GMT` zones count the other way: UTC+2 is `Etc/GMT-2`.
  const zone = `Etc/GMT${match[1] === '+' ? '-' : '+'}${hours}`;
  return isKnownTimeZone(zone) ? zone : 'UTC';
}
