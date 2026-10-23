/**
 * CMS phase 3e — every page template builds sections the API accepts as
 * built, in every theme and both site languages; uses only section types
 * this base has; keeps every testimonial, result, timetable row and video
 * review a sample; and is translated. Its suggested address is valid and
 * made unique against the Academy's pages.
 */
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES } from '@types';
import en from '@/localization/resources/en/website.json';
import ar from '@/localization/resources/ar/website.json';
import {
  PAGE_SLUG_REGEX,
  RESERVED_PAGE_SLUGS,
} from '../constants/website.constants';
import {
  PAGE_TEMPLATES,
  availableTemplateSlug,
  buildTemplateSections,
  findPageTemplate,
  fromStart,
  pageTemplateLabelKeys,
} from './page-templates.registry';
import { findPreset } from './section-presets.registry';
import {
  PAGES,
  THEMES,
  expectAccepted,
  expectCopyRules,
  expectDesignAllowed,
} from './test-support/preset-assertions';

/** Section types whose list items are invented unless the Owner adds them. */
const SAMPLE_ONLY_TYPES = new Set([
  'testimonials',
  'results',
  'schedule',
  'videoTestimonials',
]);

function lookup(bundle: unknown, key: string): unknown {
  return key
    .replace(/^website:/, '')
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundle
    );
}

describe('page templates', () => {
  it('offers the four templates the plan names', () => {
    for (const key of [
      'courseLanding',
      'teacherProfile',
      'offers',
      'aboutAcademy',
    ]) {
      expect(findPageTemplate(key), key).toBeDefined();
    }
    expect(new Set(PAGE_TEMPLATES.map((t) => t.key)).size).toBe(
      PAGE_TEMPLATES.length
    );
  });

  it.each(PAGE_TEMPLATES.map((template) => [template.key, template] as const))(
    '%s builds sections the API accepts, in every theme and both languages',
    (key, template) => {
      for (const themeKey of THEMES) {
        const sections = buildTemplateSections(template, {
          themeKey,
          pages: PAGES,
        });
        expect(sections.length).toBeGreaterThanOrEqual(5);
        expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
        for (const section of sections) {
          // Only types this base has (no `custom` section yet).
          expect(SECTION_TYPES).toContain(section.type);
          expect(section.enabled).toBe(true);
          expectAccepted(section.type, section.config, 'en');
          expectAccepted(section.type, section.config, 'ar');
          expectDesignAllowed(section.type, section.design);
          expectCopyRules(`${key}/${section.type}`, section.config);
        }
      }
    }
  );

  it.each(PAGE_TEMPLATES.map((template) => [template.key, template] as const))(
    '%s never puts an invented testimonial, result, class time or review on the site',
    (_key, template) => {
      const sections = buildTemplateSections(template, {
        themeKey: 'manara',
        pages: PAGES,
      });
      for (const section of sections) {
        if (!SAMPLE_ONLY_TYPES.has(section.type)) continue;
        const items = (
          section.config as unknown as { items: { sample?: boolean }[] }
        ).items;
        for (const item of items) expect(item.sample).toBe(true);
      }
    }
  );

  it.each(PAGE_TEMPLATES.map((template) => [template.key, template] as const))(
    '%s names its presets correctly and is translated',
    (_key, template) => {
      for (const section of template.sections) {
        if (section.presetId) {
          expect(findPreset(section.presetId)?.type).toBe(section.type);
        }
      }
      const keys = pageTemplateLabelKeys(template);
      for (const bundle of [en, ar]) {
        for (const key of Object.values(keys)) {
          expect(lookup(bundle, key), key).toEqual(expect.any(String));
        }
      }
      expect(template.slug).toMatch(PAGE_SLUG_REGEX);
      expect(RESERVED_PAGE_SLUGS).not.toContain(template.slug);
    }
  );

  it('suggests an address no page has yet', () => {
    const template = findPageTemplate('offers')!;
    expect(availableTemplateSlug(template, [{ slug: 'home' }])).toBe('offers');
    expect(
      availableTemplateSlug(template, [
        { slug: 'offers' },
        { slug: 'offers-2' },
      ])
    ).toBe('offers-3');
  });

  it('drops the fields a template removes, so nothing undefined is saved', () => {
    const sections = buildTemplateSections(findPageTemplate('courseLanding')!, {
      themeKey: 'modern-education',
      pages: PAGES,
    });
    const split = sections.find((s) => s.type === 'featureSplit')!;
    expect(Object.keys(split.config)).not.toContain('cta');
    const hero = sections.find((s) => s.type === 'hero')!;
    expect(Object.keys(hero.config)).not.toContain('highlight');
  });

  it('builds a section written out in full (the extension point for new types)', () => {
    const section = fromStart('video', () => ({
      config: { videoId: '' },
      design: { spacing: 'compact' },
    }));
    const start = section.build({ themeKey: 'riwaq', pages: [] });
    expect(start).toEqual({
      config: { videoId: '' },
      design: { spacing: 'compact' },
    });
  });
});
