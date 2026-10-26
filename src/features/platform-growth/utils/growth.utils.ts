/**
 * G1 — Growth & capacity: pure helpers (no React). Limits mirror the
 * backend DTOs; the server stays the authority, these only let a form
 * explain a problem before the round trip.
 */
import type { GrowthSettingsFields } from '../types';

/** The translation namespace root. */
export const K = 'platformGrowth:';

export const CAIRO_TIME_ZONE = 'Africa/Cairo';

/** Longest CAC/spend window the API accepts (months, inclusive). */
export const MAX_RANGE_MONTHS = 36;

/** Largest single spend entry, in piastres (EGP 100,000,000.00). */
export const MAX_SPEND_MINOR_UNITS = 10_000_000_000;
export const SPEND_DESCRIPTION_MAX = 200;
export const CHANNEL_NOTE_MAX = 200;

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  const match = MONTH_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  return year >= 2020 && year <= 2100;
}

/** The Cairo calendar month of an instant, `YYYY-MM`. */
export function cairoMonth(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

/** `YYYY-MM` moved by `delta` months. */
export function addMonths(month: string, delta: number): string {
  const [year, value] = month.split('-').map(Number);
  const index = year * 12 + (value - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/** Months from `from` to `to`, both included (0 or less when reversed). */
export function monthSpan(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return ty * 12 + tm - (fy * 12 + fm) + 1;
}

/** The CAC page's default window: the last 6 Cairo months, current included. */
export function defaultCacRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = cairoMonth(now);
  return { from: addMonths(to, -5), to };
}

/** The spend list's default window: the last 12 Cairo months, current included. */
export function defaultSpendRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = cairoMonth(now);
  return { from: addMonths(to, -11), to };
}

/** Why a month range cannot be asked for (a message key under `K`), or null. */
export function rangeProblem(from: string, to: string): string | null {
  if (!isMonth(from) || !isMonth(to)) return 'range.invalid';
  const span = monthSpan(from, to);
  if (span < 1) return 'range.reversed';
  if (span > MAX_RANGE_MONTHS) return 'range.tooLong';
  return null;
}

// \u2500\u2500\u2500 Money \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Arabic-Indic digits to ASCII, Arabic separators to ASCII ones. */
function asciiNumber(text: string): string {
  return text
    .replace(/[\u0660-\u0669]/g, (d) =>
      String(d.charCodeAt(0) - ARABIC_INDIC_ZERO)
    )
    .replace(/[\u06f0-\u06f9]/g, (d) =>
      String(d.charCodeAt(0) - EXTENDED_ARABIC_INDIC_ZERO)
    )
    .replace(/\u066b/g, '.')
    .replace(/[\u066c,\s\u00a0\u202f]/g, '');
}

/**
 * An amount typed in pounds (`1,250.5`, `\u0661\u0662\u0665\u0660\u066b\u0665`) → integer piastres, or
 * null when it is not a positive amount with at most two decimals within
 * the API's limit.
 */
export function parseAmountToMinorUnits(text: string): number | null {
  const value = asciiNumber(text.trim());
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  if (minor > MAX_SPEND_MINOR_UNITS) return null;
  return minor;
}

/** Piastres → the amount field's text (`1250.50`). */
export function minorUnitsToInput(minor: number): string {
  const whole = Math.trunc(minor / 100);
  const fraction = Math.abs(minor % 100);
  return fraction === 0
    ? String(whole)
    : `${whole}.${String(fraction).padStart(2, '0')}`;
}

/** Piastres as money in the reading language (EGP). */
export function formatMoney(
  minor: number,
  language: string,
  options: { readonly compact?: boolean } = {}
): string {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: options.compact ? 0 : 2,
    minimumFractionDigits: options.compact ? 0 : minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

// \u2500\u2500\u2500 Dates \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** `YYYY-MM` as "March 2027" / «\u0645\u0627\u0631\u0633 \u0662\u0660\u0662\u0667». */
export function formatMonth(
  month: string,
  language: string,
  style: 'long' | 'short' = 'long'
): string {
  const [year, value] = month.split('-').map(Number);
  if (!year || !value) return month;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    month: style,
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, value - 1, 1)));
}

/** A calendar day `YYYY-MM-DD` as "1 Jun 2027" (no time-zone shift). */
export function formatDay(
  day: string,
  language: string,
  style: 'medium' | 'short' = 'medium'
): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(style === 'medium' ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, date)));
}

// \u2500\u2500\u2500 Settings \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

type NumericSetting = Exclude<
  keyof GrowthSettingsFields,
  'seasonStart' | 'seasonEnd'
>;

export const SETTINGS_LIMITS: Readonly<
  Record<
    NumericSetting,
    { readonly min: number; readonly max: number; readonly step: number }
  >
> = {
  weeklyOwnerHours: { min: 1, max: 80, step: 0.1 },
  onboardingCapPerWeek: { min: 1, max: 50, step: 1 },
  minutesPerOnboarding: { min: 15, max: 600, step: 5 },
  supportMinutesPerPayingOrgPerWeek: { min: 0, max: 240, step: 1 },
  hireWarnPayingOrgs: { min: 1, max: 10_000, step: 1 },
  hireNowPayingOrgs: { min: 1, max: 10_000, step: 1 },
};

export const NUMERIC_SETTINGS = Object.keys(
  SETTINGS_LIMITS
) as NumericSetting[];

/** The settings form's text fields. */
export type SettingsDraft = Record<keyof GrowthSettingsFields, string>;

export function settingsDraftOf(settings: GrowthSettingsFields): SettingsDraft {
  return {
    seasonStart: settings.seasonStart,
    seasonEnd: settings.seasonEnd,
    weeklyOwnerHours: String(settings.weeklyOwnerHours),
    onboardingCapPerWeek: String(settings.onboardingCapPerWeek),
    minutesPerOnboarding: String(settings.minutesPerOnboarding),
    supportMinutesPerPayingOrgPerWeek: String(
      settings.supportMinutesPerPayingOrgPerWeek
    ),
    hireWarnPayingOrgs: String(settings.hireWarnPayingOrgs),
    hireNowPayingOrgs: String(settings.hireNowPayingOrgs),
  };
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseSetting(field: NumericSetting, text: string): number | null {
  const value = Number(asciiNumber(text.trim()));
  if (text.trim() === '' || !Number.isFinite(value)) return null;
  const limits = SETTINGS_LIMITS[field];
  if (value < limits.min || value > limits.max) return null;
  if (field === 'weeklyOwnerHours') {
    return Math.round(value * 10) === value * 10 ? value : null;
  }
  return Number.isInteger(value) ? value : null;
}

/** Field → message key (under `K`), for the settings form. */
export function validateSettings(
  draft: SettingsDraft
): Partial<Record<keyof GrowthSettingsFields, string>> {
  const errors: Partial<Record<keyof GrowthSettingsFields, string>> = {};
  if (!DAY_PATTERN.test(draft.seasonStart))
    errors.seasonStart = 'settings.errors.date';
  if (!DAY_PATTERN.test(draft.seasonEnd))
    errors.seasonEnd = 'settings.errors.date';
  else if (!errors.seasonStart && draft.seasonEnd <= draft.seasonStart)
    errors.seasonEnd = 'settings.errors.seasonOrder';
  for (const field of NUMERIC_SETTINGS) {
    if (parseSetting(field, draft[field]) === null)
      errors[field] =
        field === 'weeklyOwnerHours'
          ? 'settings.errors.hours'
          : 'settings.errors.range';
  }
  const warn = parseSetting('hireWarnPayingOrgs', draft.hireWarnPayingOrgs);
  const now = parseSetting('hireNowPayingOrgs', draft.hireNowPayingOrgs);
  if (warn !== null && now !== null && now < warn)
    errors.hireNowPayingOrgs = 'settings.errors.hireOrder';
  return errors;
}

/** The changed fields of a valid draft, as the PATCH body (without `version`). */
export function settingsChanges(
  draft: SettingsDraft,
  saved: GrowthSettingsFields
): Partial<GrowthSettingsFields> {
  const changes: Record<string, string | number> = {};
  if (draft.seasonStart !== saved.seasonStart)
    changes.seasonStart = draft.seasonStart;
  if (draft.seasonEnd !== saved.seasonEnd) changes.seasonEnd = draft.seasonEnd;
  for (const field of NUMERIC_SETTINGS) {
    const value = parseSetting(field, draft[field]);
    if (value !== null && value !== saved[field]) changes[field] = value;
  }
  return changes as Partial<GrowthSettingsFields>;
}

// \u2500\u2500\u2500 Errors \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** A 409 on a versioned write: someone else saved first. */
export function isStaleError(
  error: { status?: number; messageKey?: string } | null | undefined
): boolean {
  if (!error) return false;
  return (
    (error.status === 409 &&
      /stale|version|conflict/i.test(error.messageKey ?? '')) ||
    /Stale$|\.stale$/.test(error.messageKey ?? '')
  );
}
