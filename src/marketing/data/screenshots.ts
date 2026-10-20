/**
 * Real product screenshots (SPEC §D.1): captured from the local full stack
 * with demo data, never mocked or mirrored. EN and AR are separate captures.
 * Files live under public/marketing-assets/screenshots/v1/ as
 * `<key>-<lang>-<width>w.webp`; `scripts/marketing/screenshots.mjs`
 * produces the widths from the master PNGs.
 */
import type { MarketingLang } from '../types';

export interface ScreenshotAsset {
  /** Path prefix; the file is `${base}-${width}w.webp`. */
  readonly base: string;
  /** Available widths, ascending. */
  readonly widths: readonly number[];
  /** Intrinsic size of the largest width (sets the aspect ratio). */
  readonly width: number;
  readonly height: number;
}

const ROOT = '/marketing-assets/screenshots/v1';
const DESKTOP_WIDTHS = [640, 960, 1280, 1600] as const;
const MOBILE_WIDTHS = [390, 780] as const;

function desktop(key: string): Record<MarketingLang, ScreenshotAsset> {
  const asset = (lang: MarketingLang): ScreenshotAsset => ({
    base: `${ROOT}/${key}-${lang}`,
    widths: DESKTOP_WIDTHS,
    width: 1600,
    height: 1000,
  });
  return { en: asset('en'), ar: asset('ar') };
}

function mobile(key: string): Record<MarketingLang, ScreenshotAsset> {
  const asset = (lang: MarketingLang): ScreenshotAsset => ({
    base: `${ROOT}/${key}-${lang}`,
    widths: MOBILE_WIDTHS,
    width: 780,
    height: 1688,
  });
  return { en: asset('en'), ar: asset('ar') };
}

export const SCREENSHOTS = {
  'dashboard-overview': desktop('dashboard-overview'),
  'course-builder': desktop('course-builder'),
  'quiz-builder': desktop('quiz-builder'),
  'website-editor': desktop('website-editor'),
  'academy-site-home': desktop('academy-site-home'),
  'academy-site-home-mobile': mobile('academy-site-home-mobile'),
  'academy-site-course': desktop('academy-site-course'),
  'payments-review': desktop('payments-review'),
  'payment-methods': desktop('payment-methods'),
  'students-list': desktop('students-list'),
  'learner-course-player': desktop('learner-course-player'),
  'learner-course-player-mobile': mobile('learner-course-player-mobile'),
  reports: desktop('reports'),
} as const satisfies Record<string, Record<MarketingLang, ScreenshotAsset>>;

export type ScreenshotKey = keyof typeof SCREENSHOTS;
