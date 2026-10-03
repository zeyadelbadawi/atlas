/**
 * Role × locale × viewport evidence for the journeys.
 *
 * `VARIANTS` is the matrix every new surface is checked in: English and
 * Arabic, on a desktop and on a 390 px phone. `applyVariant` puts a page in
 * one of them (viewport + the app's own language preference, then a reload
 * so the whole tree re-renders in that language and direction), and
 * `expectNoSidewaysScroll` is the shared "fits the screen" check.
 *
 * `captureEvidence` saves a screenshot only when `E2E_EVIDENCE_DIR` is set,
 * so an ordinary run writes nothing outside Playwright's own output folder.
 */
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export type Language = 'en' | 'ar';

export interface Variant {
  readonly name: string;
  readonly language: Language;
  readonly width: number;
  readonly height: number;
}

export const VARIANTS: readonly Variant[] = [
  { name: 'en-desktop', language: 'en', width: 1280, height: 800 },
  { name: 'ar-desktop', language: 'ar', width: 1280, height: 800 },
  { name: 'en-phone', language: 'en', width: 390, height: 844 },
  { name: 'ar-phone', language: 'ar', width: 390, height: 844 },
];

/** Stores the app's language preference (the same key the switcher writes). */
export async function setStoredLanguage(
  page: Page,
  language: Language
): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
}

/**
 * Puts an already-open page into `variant` and reloads it. The page must
 * be on the app's origin (localStorage is per origin).
 */
export async function applyVariant(
  page: Page,
  variant: Variant
): Promise<void> {
  await page.setViewportSize({ width: variant.width, height: variant.height });
  await setStoredLanguage(page, variant.language);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'dir',
    variant.language === 'ar' ? 'rtl' : 'ltr',
    { timeout: 30_000 }
  );
}

/** The document never scrolls sideways (1 px of sub-pixel rounding allowed). */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** Saves `<E2E_EVIDENCE_DIR>/<name>.png` when that directory is configured. */
export async function captureEvidence(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  const dir = process.env.E2E_EVIDENCE_DIR;
  if (!dir) return;
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: options.fullPage ?? false,
  });
}
