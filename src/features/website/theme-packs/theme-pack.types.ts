/**
 * Theme packs (Theme 1 plan §F.1): shared content contracts, theme-owned
 * presentation.
 *
 * A `WebsiteThemeDefinition` stays what it is — bounded design TOKENS. A
 * `ThemePack` is the theme's CODE: which components draw each section type,
 * and how the theme-independent brand palette becomes its CSS variables.
 * Every section type has a base renderer; a pack overrides only what it
 * redesigns (`pack.renderers[type] ?? BASE_RENDERERS[type]`), so a theme
 * switch can never meet a section it can't draw, and adding a theme never
 * touches another theme's pack.
 *
 * Chrome (Phase 4): a pack may also replace the header, the footer and the
 * auth-page frame. A replacement footer receives the platform attribution
 * row as a prop and must render it — no theme can remove it; the chrome
 * test asserts it for every pack.
 */
import type { ComponentType, ReactNode } from 'react';
import type { WebsiteHeaderProps } from '../renderer/WebsiteHeader';
import type { WebsiteFooterProps } from '../renderer/WebsiteFooter';
import type {
  PublicWebsiteLocale,
  SectionConfigMap,
  SectionType,
  WebsiteNavigationItem,
  WebsitePage,
  WebsiteThemeDefinition,
  WebsiteThemeKey,
} from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type { BrandPalette } from '../brand-engine';

/** What every section renderer receives — base or theme-owned alike. */
export interface SectionRenderProps<TType extends SectionType> {
  readonly config: SectionConfigMap[TType];
  readonly academyId: string;
  readonly pages: readonly WebsitePage[];
  /** Present only where CTAs may really navigate (the public runtime). */
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export type SectionRendererComponent<TType extends SectionType> = ComponentType<
  SectionRenderProps<TType>
>;

export type SectionRenderers = {
  readonly [TType in SectionType]: SectionRendererComponent<TType>;
};

/** The Academy's colours as the theme scope receives them. */
export interface BrandMappingInput {
  readonly theme: WebsiteThemeDefinition;
  /**
   * The three legacy seeds, already resolved (Academy value, else the
   * theme default) — what every Academy has today.
   */
  readonly seeds: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
  };
  /** The confirmed/proposed semantic palette, once persisted (Phase 2+). */
  readonly palette?: BrandPalette;
}

/** CSS custom properties, applied on the theme scope only. */
export type WebsiteBrandVariables = Readonly<Record<`--${string}`, string>>;

/** A replacement footer: gets the Academy id (live data) and the attribution row it must render last. */
export interface ThemeFooterProps extends WebsiteFooterProps {
  readonly academyId?: string;
  readonly attribution: ReactNode;
}

/** Wraps an auth page's body (sign in/up, reset…). The base frame renders it unchanged. */
export interface ThemeAuthFrameProps {
  readonly children: ReactNode;
}

export interface ThemeChrome {
  readonly Header?: ComponentType<WebsiteHeaderProps>;
  readonly Footer?: ComponentType<ThemeFooterProps>;
  readonly AuthFrame?: ComponentType<ThemeAuthFrameProps>;
}

/** Drawn above an existing page's sections when the page opens with no hero of its own. */
export interface ThemePageIntroProps {
  readonly page: WebsitePage;
  readonly navigation: readonly WebsiteNavigationItem[];
}

/** The Course Details page body (not composed of sections). */
export interface ThemeCourseDetailsProps {
  readonly academyId: string;
  readonly courseId: string;
  readonly locale?: PublicWebsiteLocale;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

/** The body of the published site's "page not found", inside the theme's chrome. */
export interface ThemeNotFoundProps {
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

/** An unpublished Academy's Coming Soon page (identity + brand only). */
export interface ThemeComingSoonProps {
  readonly academyName: string;
  readonly academyLogo?: string;
}

/** Pages a theme may redesign; absent ones use the shared design. */
export interface ThemePages {
  readonly PageIntro?: ComponentType<ThemePageIntroProps>;
  readonly CourseDetails?: ComponentType<ThemeCourseDetailsProps>;
  readonly NotFound?: ComponentType<ThemeNotFoundProps>;
  readonly ComingSoon?: ComponentType<ThemeComingSoonProps>;
}

export interface ThemePack {
  readonly key: WebsiteThemeKey;
  /** Only the section types this theme redesigns. */
  readonly renderers: Partial<SectionRenderers>;
  /** Only the chrome this theme redesigns. */
  readonly chrome?: ThemeChrome;
  /** Only the pages this theme redesigns (Phase 6). */
  readonly pages?: ThemePages;
  /**
   * Palette → this theme's CSS variables (§F.5). Carries no image or
   * extraction knowledge; the palette carries no theme knowledge.
   */
  readonly mapBrandPalette: (input: BrandMappingInput) => WebsiteBrandVariables;
}
