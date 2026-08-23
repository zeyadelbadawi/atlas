/**
 * Analytics date-range presets.
 *
 * Atlas has no saved/custom date-range picker precedent anywhere in the
 * repository yet, so this introduces the smallest honest control: three
 * fixed presets computed client-side from `new Date()`, never a fake
 * "custom range" UI with no backend behind it.
 */
import type { AnalyticsDateRange } from '@types';

export type AnalyticsDateRangePreset = '7d' | '30d' | '90d';

const PRESET_DAYS: Record<AnalyticsDateRangePreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeDateRange(preset: AnalyticsDateRangePreset, now = new Date()): AnalyticsDateRange {
  const to = toIsoDate(now);
  const from = new Date(now);
  from.setDate(from.getDate() - PRESET_DAYS[preset]);
  return { from: toIsoDate(from), to };
}
