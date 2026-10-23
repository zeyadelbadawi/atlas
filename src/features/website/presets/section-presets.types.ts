/**
 * CMS phase 3e — section presets («أشكال جاهزة») and page templates
 * («صفحات جاهزة»).
 *
 * A PRESET is a named starting point for one section type: starter
 * `config` with bilingual content (English and Modern Standard Arabic,
 * written as an Egyptian academy would) plus, optionally, a `design`
 * (CMS phase 3b). It is plain data, built fresh each time it is used (new
 * item ids, the active theme's photographs, links to the Academy's own
 * pages), and it only ever uses fields the type's schema already accepts —
 * `section-presets.test.ts` parses every preset with the same schema the
 * API applies, so a preset can never produce a section that would be
 * refused, or lose a field on save.
 *
 * A PAGE TEMPLATE is an ordered list of sections, each a preset (with any
 * template-specific copy laid over it) or a type's own default content.
 *
 * NOTHING HERE STATES A FACT ABOUT AN ACADEMY. Where a section needs one
 * (a course's name, a price, a teacher's biography) the copy is an
 * obvious, bracketed placeholder for the Owner to replace; testimonials,
 * results, schedules and video reviews are samples (`sample: true`), shown
 * labelled in previews and never on the public site.
 */
import type {
  SectionConfigMap,
  SectionDesign,
  SectionType,
  WebsiteCorePageType,
  WebsitePage,
  WebsiteThemeKey,
} from '@types';

/** What a preset is built against: the theme it is previewed and added in, and the Academy's pages. */
export interface PresetBuildContext {
  readonly themeKey: WebsiteThemeKey;
  /** Used to point buttons at the Academy's own core pages (Courses, Contact…). */
  readonly pages: readonly Pick<WebsitePage, 'id' | 'coreType'>[];
}

/** A section as a preset starts it: what goes into a new `SectionInstance`. */
export interface SectionStart<TType extends SectionType = SectionType> {
  readonly config: SectionConfigMap[TType];
  readonly design?: SectionDesign;
}

export interface SectionPreset<TType extends SectionType = SectionType> {
  readonly type: TType;
  /** Unique within its type; `presetId()` is the global id (`hero.imageBeside`). */
  readonly key: string;
  /** Dashboard label: `website:presets.<type>.<key>.name` / `.description`. */
  readonly build: (context: PresetBuildContext) => SectionStart<TType>;
}

/** Every preset, per section type. A type without presets is added with its default content. */
export type SectionPresetRegistry = {
  readonly [TType in SectionType]?: readonly SectionPreset<TType>[];
};

/** A page template's core page links resolve through this. */
export type PresetPageTarget = Extract<
  WebsiteCorePageType,
  'courses' | 'contact' | 'about' | 'faqs'
>;
