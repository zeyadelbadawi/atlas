/**
 * Every section preset, by section type, and how a preset becomes a
 * section. The visual editor's section library and the page editor's
 * "Add section" offer a type's presets beside its default content; page
 * templates (`page-templates.registry.ts`) are built from them.
 *
 * Adding presets for a type is one list here (and its names in
 * `website.json`); `section-presets.test.ts` then checks every one
 * against the type's schema in both languages, its design against what
 * the type offers, and its translations.
 */
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type { SectionInstance, SectionType } from '@types';
import type {
  PresetBuildContext,
  SectionPreset,
  SectionPresetRegistry,
  SectionStart,
} from './section-presets.types';
import {
  ABOUT_PRESETS,
  ANNOUNCEMENT_BAR_PRESETS,
  FEATURE_SPLIT_PRESETS,
  HERO_PRESETS,
} from './intro.presets';
import {
  FAQ_PRESETS,
  FEATURES_PRESETS,
  STATISTICS_PRESETS,
  STEPS_PRESETS,
  TIMELINE_PRESETS,
} from './info.presets';
import { TESTIMONIALS_PRESETS } from './trust.presets';
import {
  CONTACT_PRESETS,
  COUNTDOWN_PRESETS,
  CTA_PRESETS,
  INTEREST_FORM_PRESETS,
  PRICING_PRESETS,
  WHATSAPP_BAR_PRESETS,
} from './action.presets';

export const SECTION_PRESETS: SectionPresetRegistry = {
  hero: HERO_PRESETS,
  about: ABOUT_PRESETS,
  featureSplit: FEATURE_SPLIT_PRESETS,
  announcementBar: ANNOUNCEMENT_BAR_PRESETS,
  features: FEATURES_PRESETS,
  steps: STEPS_PRESETS,
  timeline: TIMELINE_PRESETS,
  faq: FAQ_PRESETS,
  statistics: STATISTICS_PRESETS,
  testimonials: TESTIMONIALS_PRESETS,
  cta: CTA_PRESETS,
  pricing: PRICING_PRESETS,
  countdown: COUNTDOWN_PRESETS,
  interestForm: INTEREST_FORM_PRESETS,
  whatsappBar: WHATSAPP_BAR_PRESETS,
  contact: CONTACT_PRESETS,
};

/** A type's presets, in the order they are offered (none → `[]`). */
export function presetsFor<TType extends SectionType>(
  type: TType
): readonly SectionPreset<TType>[] {
  return (SECTION_PRESETS[type] ?? []) as readonly SectionPreset<TType>[];
}

export function hasPresets(type: SectionType): boolean {
  return presetsFor(type).length > 0;
}

/** The global id of a preset: `<type>.<key>`. */
export function presetId(preset: SectionPreset): string {
  return `${preset.type}.${preset.key}`;
}

/** A preset by its global id (`hero.imageBeside`), or `undefined`. */
export function findPreset(id: string): SectionPreset | undefined {
  const [type, key] = id.split('.');
  return presetsFor(type as SectionType).find(
    (preset) => preset.key === key
  ) as SectionPreset | undefined;
}

/** The dashboard's translation keys for a preset's name and one-line description. */
export function presetLabelKeys(preset: Pick<SectionPreset, 'type' | 'key'>): {
  readonly name: string;
  readonly description: string;
} {
  const base = `website:presets.${preset.type}.${preset.key}`;
  return { name: `${base}.name`, description: `${base}.description` };
}

/** A section instance from a start (a preset's, or a template's), with a fresh id. */
export function sectionFromStart<TType extends SectionType>(
  type: TType,
  start: SectionStart<TType>,
  id: string = crypto.randomUUID()
): SectionInstance {
  return {
    id,
    type,
    enabled: true,
    visibility: DEFAULT_RESPONSIVE_VISIBILITY,
    config: start.config,
    ...(start.design ? { design: start.design } : {}),
  } as SectionInstance;
}

/** A preset built into a new section (fresh ids, the active theme's photographs). */
export function sectionFromPreset(
  preset: SectionPreset,
  context: PresetBuildContext,
  id?: string
): SectionInstance {
  return sectionFromStart(preset.type, preset.build(context), id);
}
