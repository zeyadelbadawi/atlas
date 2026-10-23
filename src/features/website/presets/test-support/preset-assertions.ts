/**
 * Assertions the preset and page-template tests share: a section config is
 * accepted by the API exactly as built, its design uses choices the type
 * offers, and its copy follows the presets' rules.
 */
import { expect } from 'vitest';
import type { SectionDesign, SectionType, WebsiteThemeKey } from '@types';
import {
  getSectionConfigSchema,
  sectionDesignSchema,
  withRequiredLocale,
} from '@/features/website/schemas/website-section.schemas';
import {
  SECTION_DESIGN_SUPPORT,
  backgroundsFor,
} from '@/features/website/sections/section-design';
import type { PresetBuildContext } from '../section-presets.types';

export const THEMES: readonly WebsiteThemeKey[] = [
  'modern-education',
  'atelier',
  'manara',
  'riwaq',
];

export const PAGES: PresetBuildContext['pages'] = [
  { id: 'page-home', coreType: 'home' },
  { id: 'page-courses', coreType: 'courses' },
  { id: 'page-contact', coreType: 'contact' },
  { id: 'page-faqs', coreType: 'faqs' },
  { id: 'page-about', coreType: 'about' },
];

/** Every string anywhere in a value, with its path. */
export function strings(
  value: unknown,
  path = '',
  out: [string, string][] = []
): [string, string][] {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) {
    value.forEach((child, index) => strings(child, `${path}.${index}`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      strings(child, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

/** Every `{ en, ar }` pair anywhere in a value. */
export function localizedPairs(
  value: unknown,
  path = '',
  out: [string, { en: string; ar: string }][] = []
): [string, { en: string; ar: string }][] {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      localizedPairs(child, `${path}.${index}`, out)
    );
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (
      keys.length === 2 &&
      typeof record.en === 'string' &&
      typeof record.ar === 'string'
    ) {
      out.push([path, record as { en: string; ar: string }]);
    } else {
      for (const [key, child] of Object.entries(record)) {
        localizedPairs(child, path ? `${path}.${key}` : key, out);
      }
    }
  }
  return out;
}

/** A config exactly as the API would store it — or the issues that would refuse it. */
export function expectAccepted(
  type: SectionType,
  config: unknown,
  locale: 'en' | 'ar'
): void {
  const result = withRequiredLocale(locale, () =>
    getSectionConfigSchema(type).safeParse(config)
  );
  expect(
    result.success ? [] : result.error.issues,
    `${type} on an ${locale}-default site`
  ).toEqual([]);
  // Nothing stripped, nothing coerced: what was built is what is stored.
  expect(result.data).toEqual(JSON.parse(JSON.stringify(config)));
}

/** A design the type offers, in named choices only. */
export function expectDesignAllowed(
  type: SectionType,
  design: SectionDesign | undefined
): void {
  if (!design) return;
  expect(sectionDesignSchema.strict().safeParse(design).success).toBe(true);
  const support = SECTION_DESIGN_SUPPORT[type];
  if (design.spacing || design.spacingMobile)
    expect(support.spacing).toBe(true);
  if (design.width) expect(support.width).toBe(true);
  if (design.align) expect(support.align).toBe(true);
  if (design.reverseOnMobile !== undefined) {
    expect(support.reverseOnMobile).toBe(true);
  }
  if (design.background) {
    // A ground at least one theme draws for this type (the others keep
    // the section's own ground, as for any section).
    expect(
      THEMES.some((theme) =>
        backgroundsFor(theme, type).includes(design.background!)
      ),
      `${type} background ${design.background}`
    ).toBe(true);
  }
}

/** The copy rules every preset and template follows. */
export function expectCopyRules(label: string, config: unknown): void {
  for (const [path, value] of strings(config)) {
    expect(value, `${label} ${path}`).not.toMatch(/[<>]/);
    expect(value, `${label} ${path}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  }
  for (const [path, pair] of localizedPairs(config)) {
    // Bilingual: a side is written exactly when the other is.
    expect(!!pair.en.trim(), `${label} ${path}`).toBe(!!pair.ar.trim());
    // A placeholder is a placeholder in both languages.
    expect(pair.en.startsWith('['), `${label} ${path}`).toBe(
      pair.ar.startsWith('[')
    );
    // Arabic copy is Arabic: no Latin words inside it.
    expect(pair.ar, `${label} ${path}`).not.toMatch(/[A-Za-z]{2,}/);
  }
}
