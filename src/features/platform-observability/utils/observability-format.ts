/**
 * Formatting for monitoring values.
 *
 * ONE RULE ABOVE ALL: a value the backend did not report is never shown as
 * a number. `null`, `NaN` and non-finite values come back as `null` from
 * every formatter here and the caller prints the translated "Not reported"
 * — a missing latency is not a latency of zero.
 *
 * Percent values arrive as ratios (0..1) and are displayed as percentages.
 */
import type { TFunction } from 'i18next';
import { formatBytes, formatNumber, formatPercentage } from '@utils';
import type { DetailUnit, LanguageCode, MetricUnit } from '@types';

export type ValueUnit = DetailUnit | MetricUnit;

const NS = 'platformObservability';
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

function isReportable(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Humanised duration: the largest unit leads and one smaller unit follows
 * when it adds information ("2 h 15 min"). Returns null for no value.
 */
export function formatDuration(
  seconds: number | null | undefined,
  t: TFunction
): string | null {
  if (!isReportable(seconds) || seconds < 0) return null;
  const whole = Math.round(seconds);
  const unit = (key: string, count: number) =>
    t(`${NS}:duration.${key}`, { count });

  if (whole < SECONDS_PER_MINUTE) return unit('seconds', whole);
  if (whole < SECONDS_PER_HOUR) {
    const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
    const rest = whole % SECONDS_PER_MINUTE;
    return rest > 0
      ? `${unit('minutes', minutes)} ${unit('seconds', rest)}`
      : unit('minutes', minutes);
  }
  if (whole < SECONDS_PER_DAY) {
    const hours = Math.floor(whole / SECONDS_PER_HOUR);
    const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return minutes > 0
      ? `${unit('hours', hours)} ${unit('minutes', minutes)}`
      : unit('hours', hours);
  }
  const days = Math.floor(whole / SECONDS_PER_DAY);
  const hours = Math.floor((whole % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  return hours > 0
    ? `${unit('days', days)} ${unit('hours', hours)}`
    : unit('days', days);
}

/**
 * Formats a numeric value by its unit. Returns null when there is nothing
 * honest to print.
 */
export function formatUnitValue(
  value: number | null | undefined,
  unit: ValueUnit,
  language: LanguageCode,
  t: TFunction,
  options: { readonly compact?: boolean } = {}
): string | null {
  if (!isReportable(value)) return null;
  switch (unit) {
    case 'percent':
      return formatPercentage(
        value,
        language,
        value !== 0 && Math.abs(value) < 0.01 ? 2 : 1
      );
    case 'ms':
      return t(`${NS}:units.ms`, {
        value: formatNumber(value, language, {
          maximumFractionDigits: value < 10 ? 1 : 0,
        }),
      });
    case 'seconds':
      if (options.compact) {
        return t(`${NS}:units.secondsShort`, {
          value: formatNumber(value, language, {
            maximumFractionDigits: value < 10 ? 2 : 0,
          }),
        });
      }
      // Sub-second latencies (a p95 of 0.35 s) read better as a decimal
      // than rounded away to "0 s".
      return value < 1
        ? t(`${NS}:units.secondsShort`, {
            value: formatNumber(value, language, { maximumFractionDigits: 3 }),
          })
        : formatDuration(value, t);
    case 'bytes': {
      const bytes = formatBytes(value, language);
      return `${bytes.value} ${t(bytes.unitKey)}`;
    }
    case 'perSecond':
      return t(`${NS}:units.perSecond`, {
        value: formatNumber(value, language, {
          maximumFractionDigits: value < 10 ? 2 : 1,
        }),
      });
    case 'count':
      return formatNumber(value, language, { maximumFractionDigits: 2 });
    case 'text':
      return formatNumber(value, language);
    default:
      return formatNumber(value, language);
  }
}

/** Text detail values the backend uses for yes/no facts. */
const TEXT_VALUE_KEYS: Readonly<Record<string, string>> = {
  true: 'yes',
  false: 'no',
  yes: 'yes',
  no: 'no',
};

/**
 * Formats a component detail (`number | string | null`). Booleans-as-text
 * are translated; any other text is shown verbatim.
 */
export function formatDetailValue(
  value: number | string | null,
  unit: DetailUnit,
  language: LanguageCode,
  t: TFunction
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const known = TEXT_VALUE_KEYS[value.toLowerCase()];
    return known ? t(`${NS}:values.${known}`) : value;
  }
  return formatUnitValue(value, unit, language, t);
}

/** `{queue="email", state="failed"}` → `queue=email · state=failed`. */
export function describeLabels(
  labels: Readonly<Record<string, string>>,
  omit: readonly string[] = []
): string {
  return Object.entries(labels)
    .filter(([key]) => !omit.includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ');
}

/**
 * Translates a stable key the backend may extend (a new component, detail,
 * reason, metric id…). An unknown key renders as itself — readable, never
 * blank and never a crash. `exists` is checked explicitly because Atlas's
 * missing-key handler would otherwise override a `defaultValue`.
 */
export function translateKey(
  t: TFunction,
  i18n: { exists: (key: string) => boolean },
  base: string,
  key: string
): string {
  const full = `${NS}:${base}.${key}`;
  if (!i18n.exists(full)) return key;
  const value: unknown = t(full);
  return typeof value === 'string' ? value : key;
}
