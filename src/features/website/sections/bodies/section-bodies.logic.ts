/**
 * CMS phase 3d — what the logos, map, schedule and results sections show,
 * resolved from their config for one locale: the data half of the shared
 * bodies (`LogoGrid`, `MapPanel`, `ScheduleTimetable`, `ResultsGrid`),
 * kept apart from the components so each theme's renderer can decide
 * whether there is anything to draw before it draws its frame.
 */
import { hasRenderableImage } from '@/features/website/theme-assets';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { isSafeExternalUrl } from '@/features/website/utils/url-safety.utils';
import { SCHEDULE_TIME_PATTERN } from '@/features/website/constants/website.constants';
import {
  SCHEDULE_DAYS,
  type LogosSectionConfig,
  type MapSectionConfig,
  type PublicWebsiteLocale,
  type ResultsSectionConfig,
  type ScheduleDay,
  type ScheduleSectionConfig,
} from '@types';

export interface ResolvedLogo {
  readonly id: string;
  readonly image: string;
  readonly alt: string;
  /** Present only for a safe, non-empty web address. */
  readonly href?: string;
}

/** The logos a visitor can see, in the Owner's order (an entry without an image is skipped). */
export function resolveLogos(
  config: LogosSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedLogo[] {
  return (config.items ?? [])
    .filter((item) => hasRenderableImage(item.image))
    .map((item) => {
      const url = item.url?.trim();
      return {
        id: item.id,
        image: item.image,
        alt: resolveLocalizedText(item.alt, locale),
        href: url && isSafeExternalUrl(url) ? url : undefined,
      };
    });
}

export interface ResolvedMap {
  readonly title: string;
  /** One entry per line the Owner typed. */
  readonly addressLines: readonly string[];
  readonly note: string;
  /** What the map and directions search for; empty means nothing to show. */
  readonly query: string;
}

export function resolveMap(
  config: MapSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedMap {
  const addressLines = resolveLocalizedText(config.address, locale)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    title: resolveLocalizedText(config.title, locale),
    addressLines,
    note: resolveLocalizedText(config.note, locale),
    query: config.query?.trim() || addressLines.join(', '),
  };
}

/** Google Maps directions/search for `query` (opens in a new tab). */
export function googleMapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** The embeddable map for `query` — the only frame `src` this section uses. */
export function googleMapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export interface ResolvedScheduleRow {
  readonly id: string;
  readonly start: string;
  readonly end: string;
  readonly title: string;
  readonly teacher: string;
  readonly location: string;
  readonly sample: boolean;
}

export interface ScheduleDayGroup {
  readonly day: ScheduleDay;
  readonly rows: readonly ResolvedScheduleRow[];
}

const timeFormatters = new Map<PublicWebsiteLocale, Intl.DateTimeFormat>();

/** `HH:MM` in the visitor's locale and digits ("4:00 PM", "٤:٠٠ م"). */
export function formatScheduleTime(
  value: string,
  locale: PublicWebsiteLocale
): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  let formatter = timeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    timeFormatters.set(locale, formatter);
  }
  return formatter.format(
    new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2])))
  );
}

/**
 * The rows a visitor sees, grouped by day in week order and sorted by
 * start time within a day. A row without a title or with an unreadable
 * time is left out rather than drawn half-empty.
 */
export function groupScheduleRows(
  config: ScheduleSectionConfig,
  locale: PublicWebsiteLocale,
  isPublic: boolean
): ScheduleDayGroup[] {
  const byDay = new Map<ScheduleDay, ResolvedScheduleRow[]>();
  for (const row of config.items ?? []) {
    if (isPublic && row.sample) continue;
    if (!SCHEDULE_DAYS.includes(row.day)) continue;
    if (
      !SCHEDULE_TIME_PATTERN.test(row.start) ||
      !SCHEDULE_TIME_PATTERN.test(row.end)
    ) {
      continue;
    }
    const title = resolveLocalizedText(row.title, locale);
    if (!title) continue;
    const rows = byDay.get(row.day) ?? [];
    rows.push({
      id: row.id,
      start: row.start,
      end: row.end,
      title,
      teacher: resolveLocalizedText(row.teacher, locale),
      location: resolveLocalizedText(row.location, locale),
      sample: row.sample === true,
    });
    byDay.set(row.day, rows);
  }
  return SCHEDULE_DAYS.filter((day) => byDay.has(day)).map((day) => ({
    day,
    rows: [...byDay.get(day)!].sort(
      (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)
    ),
  }));
}

export interface ResolvedResult {
  readonly id: string;
  readonly studentName: string;
  readonly result: string;
  readonly detail: string;
  readonly photo?: string;
  readonly photoAlt: string;
  readonly top: boolean;
  readonly sample: boolean;
}

export function resolveResults(
  config: ResultsSectionConfig,
  locale: PublicWebsiteLocale,
  isPublic: boolean
): ResolvedResult[] {
  return (config.items ?? [])
    .filter((item) => !(isPublic && item.sample))
    .map((item) => ({
      id: item.id,
      studentName: item.studentName?.trim() ?? '',
      result: resolveLocalizedText(item.result, locale),
      detail: resolveLocalizedText(item.detail, locale),
      photo: hasRenderableImage(item.photo) ? item.photo : undefined,
      photoAlt: resolveLocalizedText(item.photoAlt, locale),
      top: item.top === true,
      sample: item.sample === true,
    }))
    .filter((item) => item.studentName && item.result);
}
