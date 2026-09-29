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
 * Header/footer/auth-shell overrides are deliberately not here yet: the
 * footer carries the platform attribution that no theme may remove, so that
 * extension point is designed with Theme 1's chrome (Phase 4).
 */
import type { ComponentType } from 'react';
import type {
  SectionConfigMap,
  SectionType,
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

export interface ThemePack {
  readonly key: WebsiteThemeKey;
  /** Only the section types this theme redesigns. */
  readonly renderers: Partial<SectionRenderers>;
  /**
   * Palette → this theme's CSS variables (§F.5). Carries no image or
   * extraction knowledge; the palette carries no theme knowledge.
   */
  readonly mapBrandPalette: (input: BrandMappingInput) => WebsiteBrandVariables;
}
