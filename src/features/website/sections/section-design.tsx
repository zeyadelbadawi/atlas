/**
 * CMS phase 3 — a section's design (`SectionInstance.design`): the ground
 * it sits on, its spacing (with a phone override), alignment, width and,
 * for a two-column section, the order its columns stack in on phones.
 *
 * Named choices only. Each theme draws them with what it already has:
 *   - SPACING: every theme's section shell multiplies its own rhythm by
 *     `--ws-space` (`section-design.css`), so "compact" is the theme's
 *     rhythm, tighter — never a number an Owner typed.
 *   - WIDTH: "wide" widens the theme's own container variable.
 *   - BACKGROUND: one of the theme's own grounds, whose text, link and
 *     button colours the theme has already contrast-checked against the
 *     Academy's brand. A theme offers only the grounds it has, and only for
 *     the sections that read correctly on them (`SECTION_BACKGROUND_SUPPORT`,
 *     checked by an automated contrast pass over every section, ground and
 *     theme); anything else draws the section on its usual ground.
 *
 * Nothing here adds an element to the page: the shells (`T1Section`,
 * `AtelierChapter`, `ManaraBlock`, `RiwaqBand`, and the heroes' roots) put
 * the design's data attributes on their own root, so the themes' rules for
 * neighbouring sections keep working.
 */
import { createContext, useContext } from 'react';
import type {
  SectionBackground,
  SectionDesign,
  SectionType,
  WebsiteThemeKey,
} from '@types';

/** Which design controls a section type offers. */
export interface SectionDesignSupport {
  readonly spacing: boolean;
  readonly width: boolean;
  readonly align: boolean;
  /** Two-column sections: the order the columns stack in on phones. */
  readonly reverseOnMobile: boolean;
}

const FULL: SectionDesignSupport = {
  spacing: true,
  width: true,
  align: true,
  reverseOnMobile: false,
};
const NO_ALIGN: SectionDesignSupport = { ...FULL, align: false };
const SPLIT: SectionDesignSupport = { ...FULL, reverseOnMobile: true };

/**
 * The controls per section type. The hero and an inner page's title band
 * are each theme's opening scene, with their own height and ground: only
 * the stacking order is theirs to change. Lists, forms, catalogues and the
 * FAQ read down the page, so they keep their alignment.
 */
export const SECTION_DESIGN_SUPPORT: Record<SectionType, SectionDesignSupport> =
  {
    hero: {
      spacing: false,
      width: false,
      align: false,
      reverseOnMobile: true,
    },
    pageHeader: {
      spacing: false,
      width: false,
      align: false,
      reverseOnMobile: false,
    },
    about: SPLIT,
    featureSplit: SPLIT,
    // The band's photograph stands on its lower edge: its place is fixed.
    cta: FULL,
    features: FULL,
    statistics: FULL,
    testimonials: FULL,
    instructors: FULL,
    featuredCourses: FULL,
    courseCategories: FULL,
    gallery: FULL,
    faq: NO_ALIGN,
    steps: NO_ALIGN,
    contact: NO_ALIGN,
    courseCatalog: NO_ALIGN,
    courseSpotlight: NO_ALIGN,
    // CMS phase 3d.
    logos: FULL,
    results: FULL,
    schedule: NO_ALIGN,
    map: NO_ALIGN,
  };

/**
 * The grounds each theme has, by the name its shell gives them. A theme
 * without a separate brand ground (or whose brand ground is its dark one)
 * does not offer "brand".
 */
export const THEME_GROUNDS: Partial<
  Record<WebsiteThemeKey, Partial<Record<SectionBackground, string>>>
> = {
  'modern-education': { light: 'default', soft: 'soft' },
  atelier: { light: 'paper', soft: 'deep' },
  manara: { light: 'day', soft: 'soft', brand: 'block', dark: 'night' },
  riwaq: { light: 'porcelain', soft: 'stone', dark: 'deep' },
};

/**
 * The types the contrast pass has covered: every type but the openings
 * (the hero and an inner page's title band keep their scene). A new section
 * type joins only once it has been through the same pass.
 */
const GROUNDED_TYPES: readonly SectionType[] = [
  'about',
  'featuredCourses',
  'statistics',
  'features',
  'testimonials',
  'faq',
  'cta',
  'instructors',
  'gallery',
  'contact',
  'courseCatalog',
  'courseCategories',
  'steps',
  'featureSplit',
  'courseSpotlight',
];
const except = (...types: SectionType[]) =>
  GROUNDED_TYPES.filter((type) => !types.includes(type));

/**
 * Per theme, the section types a background may be chosen for — the ones
 * that read correctly on every ground the theme offers. Checked by an axe
 * colour-contrast pass and a visual review of every section on every
 * ground in all four themes (CMS phase 3). Manara and Riwaq colour text,
 * links and buttons from the ground itself, so every section moves
 * freely. Theme 1 and Atelier draw their dark bands (the CTA band; Atelier
 * also its figures and testimonials) with colours fixed for that band,
 * which would vanish on a light ground: those keep their own.
 */
export const SECTION_BACKGROUND_SUPPORT: Partial<
  Record<WebsiteThemeKey, readonly SectionType[]>
> = {
  'modern-education': except('cta'),
  atelier: except('cta', 'statistics', 'testimonials'),
  manara: GROUNDED_TYPES,
  riwaq: GROUNDED_TYPES,
};

/** Themes whose container is narrower than "wide" (88rem); the others already are that wide. */
const THEMES_WITH_WIDTH: readonly WebsiteThemeKey[] = ['modern-education'];

/** The design controls a section offers under a theme. */
export function designControlsFor(
  themeKey: WebsiteThemeKey,
  type: SectionType
): SectionDesignSupport & {
  readonly backgrounds: readonly SectionBackground[];
} {
  const support = SECTION_DESIGN_SUPPORT[type];
  return {
    ...support,
    width: support.width && THEMES_WITH_WIDTH.includes(themeKey),
    backgrounds: backgroundsFor(themeKey, type),
  };
}

/** The backgrounds an Owner can choose for a section under a theme. */
export function backgroundsFor(
  themeKey: WebsiteThemeKey,
  type: SectionType
): readonly SectionBackground[] {
  if (!SECTION_BACKGROUND_SUPPORT[themeKey]?.includes(type)) return [];
  const grounds = THEME_GROUNDS[themeKey] ?? {};
  return (['light', 'soft', 'brand', 'dark'] as const).filter(
    (background) => !!grounds[background]
  );
}

/** What a section's shell reads: its design, with the ground resolved. */
export interface ResolvedSectionDesign {
  readonly design?: SectionDesign;
  /** The theme's own name for the chosen ground, when it applies here. */
  readonly ground?: string;
}

export const SectionDesignContext = createContext<ResolvedSectionDesign>({});

/** Resolves a section's design for its theme (`SectionRenderer`). */
export function resolveSectionDesign(
  design: SectionDesign | undefined,
  themeKey: WebsiteThemeKey,
  type: SectionType
): ResolvedSectionDesign {
  if (!design) return {};
  const ground =
    design.background &&
    backgroundsFor(themeKey, type).includes(design.background)
      ? THEME_GROUNDS[themeKey]?.[design.background]
      : undefined;
  return { design, ground };
}

export function useSectionDesign(): ResolvedSectionDesign {
  return useContext(SectionDesignContext);
}

/** The data attributes a section's root carries for its design (`section-design.css`). */
export function sectionDesignAttributes(
  design: SectionDesign | undefined
): Record<string, string | undefined> {
  return {
    'data-ws-space':
      design?.spacing && design.spacing !== 'default'
        ? design.spacing
        : undefined,
    'data-ws-space-mobile': design?.spacingMobile,
    'data-ws-align': design?.align === 'center' ? 'center' : undefined,
    'data-ws-width': design?.width === 'wide' ? 'wide' : undefined,
    'data-ws-reverse-mobile': design?.reverseOnMobile ? '' : undefined,
  };
}

/** The design attributes for the section being rendered. */
export function useSectionDesignAttributes(): Record<
  string,
  string | undefined
> {
  return sectionDesignAttributes(useSectionDesign().design);
}
