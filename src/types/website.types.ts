/**
 * Website domain types (Prompt 9).
 *
 * `WebsiteConfiguration` is always Academy-scoped (`academyId`) — the same
 * boundary Course Management (Prompt 3C) already uses, and consistent
 * with Prompt 8's own statement that "Each Academy may have its own
 * Theme/Branding/Domain." It is NOT Organization-scoped: a Tenant that
 * owns multiple Academies configures each Academy's website
 * independently (see `Reports/ARCHITECTURE.md`, Prompt 9, "Tenant
 * Isolation").
 *
 * Primary logo and favicon remain owned by the existing Academy record
 * (`Academy.logo`/`Academy.favicon`, Prompt 3B) — `WebsiteBrandConfig`
 * only adds what Academy branding does not already have (a dark-background
 * logo variant and the website's color tokens). This is a deliberate
 * reuse decision, not an oversight — see `Reports/ARCHITECTURE.md`,
 * Prompt 9, "Brand Reuses Academy Branding".
 */
import type { WebsiteThemeKey } from './website-theme.types';
import type { SectionInstance } from './website-section.types';

export type WebsitePublishStatus = 'draft' | 'published' | 'publishing' | 'failed';

/** A validated HSL triplet string, e.g. `"221 83% 53%"` — the same format Atlas's own `hsl(var(--x))` design tokens use. */
export type HslColorTriplet = string;

export interface WebsiteBrandConfig {
  readonly darkLogo?: string;
  readonly primaryColor: HslColorTriplet;
  readonly secondaryColor: HslColorTriplet;
  readonly accentColor: HslColorTriplet;
}

export interface WebsiteSeoConfig {
  readonly metaTitle?: string;
  readonly metaDescription?: string;
  readonly ogImage?: string;
}

export interface WebsiteNavigationItem {
  readonly id: string;
  /** Tenant-authored display label — real content, not a translation key. */
  readonly label: string;
  readonly pageId: string;
  readonly order: number;
}

export interface WebsiteHeaderConfig {
  readonly cta?: { readonly label: string; readonly pageId?: string; readonly url?: string };
}

export interface WebsiteFooterLink {
  readonly id: string;
  readonly label: string;
  readonly pageId?: string;
  readonly url?: string;
}

export interface WebsiteFooterGroup {
  readonly id: string;
  readonly title: string;
  readonly links: readonly WebsiteFooterLink[];
}

export interface WebsiteFooterConfig {
  readonly groups: readonly WebsiteFooterGroup[];
  readonly socialLinks: readonly WebsiteFooterLink[];
  readonly copyrightText?: string;
}

export interface WebsitePublishError {
  readonly messageKey: string;
  readonly detail?: string;
}

/**
 * The Academy's website configuration — always the current DRAFT working
 * copy (see `Reports/ARCHITECTURE.md`, Prompt 9, "Draft / Publish Model").
 * `themeVersion` captures the `WebsiteThemeDefinition.version` in effect
 * at last save, so a future theme schema change can be detected and
 * migrated deliberately rather than silently reinterpreted.
 */
export interface WebsiteConfiguration {
  readonly id: string;
  readonly academyId: string;
  readonly themeKey: WebsiteThemeKey;
  readonly themeVersion: number;
  readonly configVersion: number;
  readonly brand: WebsiteBrandConfig;
  readonly seo: WebsiteSeoConfig;
  readonly navigation: readonly WebsiteNavigationItem[];
  readonly header: WebsiteHeaderConfig;
  readonly footer: WebsiteFooterConfig;
  readonly status: WebsitePublishStatus;
  readonly publishedAt?: string;
  readonly lastPublishError?: WebsitePublishError;
  readonly updatedAt: string;
}

export interface UpdateWebsiteConfigurationPayload {
  readonly themeKey?: WebsiteThemeKey;
  readonly brand?: Partial<WebsiteBrandConfig>;
  readonly seo?: Partial<WebsiteSeoConfig>;
  readonly navigation?: readonly WebsiteNavigationItem[];
  readonly header?: WebsiteHeaderConfig;
  readonly footer?: WebsiteFooterConfig;
}

/** The six core page contracts every theme supports. `courseDetails` is a template driven entirely by the existing Course domain — it is not composed of sections and is not part of the visibility/navigation toggle set (a course's own existence is what gates reachability). */
export const WEBSITE_CORE_PAGE_TYPES = [
  'home',
  'about',
  'courses',
  'faqs',
  'contact',
  'courseDetails',
] as const;

export type WebsiteCorePageType = (typeof WEBSITE_CORE_PAGE_TYPES)[number];

/** Core pages a Tenant Owner can toggle in navigation/visibility — excludes `courseDetails` (see the doc comment above). */
export const TOGGLEABLE_CORE_PAGE_TYPES: readonly WebsiteCorePageType[] = [
  'home',
  'about',
  'courses',
  'faqs',
  'contact',
];

export type WebsitePageType = 'core' | 'custom';

export interface WebsitePageSeo {
  readonly metaTitle?: string;
  readonly metaDescription?: string;
}

export interface WebsitePage {
  readonly id: string;
  readonly academyId: string;
  readonly pageType: WebsitePageType;
  /** Present only when `pageType === 'core'`. */
  readonly coreType?: WebsiteCorePageType;
  readonly title: string;
  readonly slug: string;
  readonly visible: boolean;
  readonly seo: WebsitePageSeo;
  readonly sections: readonly SectionInstance[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWebsitePagePayload {
  readonly title: string;
  readonly slug: string;
}

export interface UpdateWebsitePagePayload {
  readonly title?: string;
  readonly slug?: string;
  readonly visible?: boolean;
  readonly seo?: WebsitePageSeo;
  readonly sections?: readonly SectionInstance[];
}
