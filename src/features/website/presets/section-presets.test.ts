/**
 * CMS phase 3e — every section preset is a section the API would accept
 * exactly as built: its config parses with the type's own schema (the one
 * kept in parity with the backend) on an English- and an Arabic-default
 * site, under every theme, and comes out of the parse unchanged (a field
 * the schema does not declare would be silently stripped on save). Its
 * design uses only named choices the type offers, its copy is bilingual
 * and free of markup and colours, and its name is translated.
 */
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES } from '@types';
import type { SectionType } from '@types';
import en from '@/localization/resources/en/website.json';
import ar from '@/localization/resources/ar/website.json';
import {
  SECTION_PRESETS,
  findPreset,
  presetId,
  presetLabelKeys,
  presetsFor,
  sectionFromPreset,
} from './section-presets.registry';
import type { SectionPreset } from './section-presets.types';
import {
  PAGES,
  THEMES,
  expectAccepted,
  expectCopyRules,
  expectDesignAllowed,
  strings,
} from './test-support/preset-assertions';

const ALL_PRESETS = (Object.keys(SECTION_PRESETS) as SectionType[]).flatMap(
  (type) => presetsFor(type) as readonly SectionPreset[]
);

function translation(bundle: unknown, key: string): unknown {
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

describe('section presets', () => {
  it('offers 2–4 named presets for the most-used section types', () => {
    const required: SectionType[] = [
      'hero',
      'about',
      'featureSplit',
      'features',
      'cta',
      'testimonials',
      'faq',
      'pricing',
      'contact',
    ];
    for (const type of required)
      expect(presetsFor(type).length).toBeGreaterThan(0);
    // A few of the phase 3d sections too.
    const phase3d: SectionType[] = [
      'whatsappBar',
      'announcementBar',
      'interestForm',
      'timeline',
      'countdown',
    ];
    for (const type of phase3d)
      expect(presetsFor(type).length).toBeGreaterThan(0);

    for (const type of Object.keys(SECTION_PRESETS) as SectionType[]) {
      expect(SECTION_TYPES).toContain(type);
      const presets = presetsFor(type);
      expect(presets.length, type).toBeGreaterThanOrEqual(2);
      expect(presets.length, type).toBeLessThanOrEqual(4);
      expect(new Set(presets.map((preset) => preset.key)).size).toBe(
        presets.length
      );
      for (const preset of presets) expect(preset.type).toBe(type);
    }
  });

  it.each(ALL_PRESETS.map((preset) => [presetId(preset), preset] as const))(
    '%s is a valid section in every theme and both site languages',
    (_id, preset) => {
      for (const themeKey of THEMES) {
        const start = preset.build({ themeKey, pages: PAGES });
        expectAccepted(preset.type, start.config, 'en');
        expectAccepted(preset.type, start.config, 'ar');
        expectDesignAllowed(preset.type, start.design);
      }
    }
  );

  it.each(ALL_PRESETS.map((preset) => [presetId(preset), preset] as const))(
    '%s follows the copy rules and is translated',
    (id, preset) => {
      const { config } = preset.build({
        themeKey: 'modern-education',
        pages: PAGES,
      });
      expectCopyRules(id, config);
      const keys = presetLabelKeys(preset);
      for (const bundle of [en, ar]) {
        expect(translation(bundle, keys.name), keys.name).toEqual(
          expect.any(String)
        );
        expect(translation(bundle, keys.description), keys.description).toEqual(
          expect.any(String)
        );
      }
    }
  );

  it('builds fresh item ids every time, like items added in the editor', () => {
    const preset = findPreset('faq.registration')!;
    const context = { themeKey: 'manara' as const, pages: PAGES };
    const first = sectionFromPreset(preset, context);
    const second = sectionFromPreset(preset, context);
    expect(first.id).not.toBe(second.id);
    const ids = (section: typeof first) =>
      (section.config as unknown as { items: { id: string }[] }).items.map(
        (item) => item.id
      );
    expect(ids(first)).not.toEqual(ids(second));
  });

  it('points buttons at the Academy’s own pages, and keeps the label without one', () => {
    const preset = findPreset('hero.imageBeside')!;
    const withPages = preset.build({ themeKey: 'riwaq', pages: PAGES });
    expect(withPages.config).toMatchObject({
      cta: { pageId: 'page-courses' },
      secondaryCta: { authAction: 'signUp' },
    });
    const withoutPages = preset.build({ themeKey: 'riwaq', pages: [] });
    expect(
      (withoutPages.config as unknown as { cta: Record<string, unknown> }).cta
    ).toEqual({ label: { en: 'Browse courses', ar: 'تصفّح الدورات' } });
  });

  it('uses the active theme’s photographs, or Theme 1’s slot where the theme names it differently', () => {
    const preset = findPreset('about.approach')!;
    const image = (themeKey: 'riwaq' | 'atelier') =>
      (
        preset.build({ themeKey, pages: PAGES }).config as unknown as {
          image: string;
        }
      ).image;
    expect(image('riwaq')).toBe('theme-asset:riwaq/home-benefit');
    // Atelier calls this slot `home-philosophy`; Theme 1's reference is
    // drawn as it (`adopt-theme-assets.ts`).
    expect(image('atelier')).toBe('theme-asset:modern-education/home-benefit');
  });

  it('never ships an invented testimonial: every one is a sample', () => {
    for (const preset of presetsFor('testimonials')) {
      const { config } = preset.build({ themeKey: 'atelier', pages: PAGES });
      expect(config.items.length).toBeGreaterThan(0);
      for (const item of config.items) expect(item.sample).toBe(true);
    }
  });

  it('leaves numbers only the Academy knows empty, never invented', () => {
    for (const preset of ALL_PRESETS) {
      const { config } = preset.build({
        themeKey: 'modern-education',
        pages: PAGES,
      });
      for (const [path, value] of strings(config)) {
        if (/(^|\.)(whatsapp|phone|email|deadline)$/.test(path)) {
          expect(value, `${presetId(preset)} ${path}`).toBe('');
        }
      }
    }
  });
});
