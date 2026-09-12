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
import type { LocalizedText } from './website-content.types';

export type WebsitePublishStatus =
  'draft' | 'published' | 'publishing' | 'failed';

/** A validated HSL triplet string, e.g. `"221 83% 53%"` — the same format Atlas's own `hsl(var(--x))` design tokens use. */
export type HslColorTriplet = string;

export interface WebsiteBrandConfig {
  readonly darkLogo?: string;
  readonly primaryColor: HslColorTriplet;
  readonly secondaryColor: HslColorTriplet;
  readonly accentColor: HslColorTriplet;
}

/**
 * Global SEO defaults for the whole website. `robotsIndexable`/
 * `sitemapEnabled`/`canonicalBaseUrl` are CONFIGURATION DATA the future
 * public runtime will read to decide what it serves — this prompt does
 * not itself serve `robots.txt`/`sitemap.xml` (see
 * `Reports/ARCHITECTURE.md`, Prompt 10, "Robots / Sitemap Contracts").
 * `canonicalBaseUrl` is a plain string field, never a real, verified,
 * DNS-backed domain — it is the same kind of "display-state, not
 * infrastructure" contract Prompt 8 established for
 * `DomainConnection.hostname`.
 *
 * Phase 6 — `siteTitle`/`metaTitle`/`metaDescription` are `LocalizedText`:
 * a search engine indexes `/about` and `/ar/about` as two distinct pages
 * (`seo-resolution.util.ts`'s hreflang alternates), so each needs its own
 * language's title/description, not one string reused verbatim for both.
 */
export interface WebsiteSeoConfig {
  readonly siteTitle?: LocalizedText;
  readonly metaTitle?: LocalizedText;
  readonly metaDescription?: LocalizedText;
  readonly ogImage?: string;
  /** Site-wide default; a page's own `WebsitePageSeo.indexable` overrides it. Defaults to `true`. */
  readonly robotsIndexable?: boolean;
  readonly sitemapEnabled?: boolean;
  readonly canonicalBaseUrl?: string;
}

export interface WebsiteNavigationItem {
  readonly id: string;
  /** Tenant-authored display label — real content, not a translation key. */
  readonly label: LocalizedText;
  readonly pageId: string;
  readonly order: number;
}

/** Per-page copy override for one of the public Sign In/Sign Up pages — both optional; an unset field falls back to the app's own generic default copy (see `PublicWebsiteSignInPage`/`PublicWebsiteSignUpPage`). */
export interface WebsiteAuthPageCopy {
  readonly title?: LocalizedText;
  readonly subtitle?: LocalizedText;
}

export interface WebsiteHeaderConfig {
  readonly cta?: {
    readonly label: LocalizedText;
    readonly pageId?: string;
    readonly url?: string;
    /** Phase 1 (Extended Scope, Decision 11, dependency C) — see `WebsiteCta.authAction`. */
    readonly authAction?: 'signIn' | 'signUp';
  };
  /**
   * Sign In/Sign Up are fixed, dedicated pages — not `WebsitePage` records
   * — so they never appear in the Pages list and have no sections to
   * compose. This is the deliberately narrow customization surface for
   * them instead: just their heading copy, editable from the Navigation
   * tab (the same tab that already configures the header CTA linking to
   * them). Branding/theme/nav/footer already apply via the shared
   * `WebsiteChrome` every public page renders inside.
   */
  readonly authPages?: {
    readonly signIn?: WebsiteAuthPageCopy;
    readonly signUp?: WebsiteAuthPageCopy;
  };
}

export interface WebsiteFooterLink {
  readonly id: string;
  readonly label: LocalizedText;
  readonly pageId?: string;
  readonly url?: string;
}

export interface WebsiteFooterGroup {
  readonly id: string;
  readonly title: LocalizedText;
  readonly links: readonly WebsiteFooterLink[];
}

export interface WebsiteFooterConfig {
  readonly groups: readonly WebsiteFooterGroup[];
  readonly socialLinks: readonly WebsiteFooterLink[];
  readonly copyrightText?: LocalizedText;
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

/**
 * Page-level SEO — independently editable from `WebsiteSeoConfig`
 * (global). A page that leaves these unset simply falls through the
 * resolution hierarchy to the global default, then the system fallback
 * (see `resolvePageSeo` in `seo-resolution.utils.ts`).
 */
export interface WebsitePageSeo {
  readonly metaTitle?: LocalizedText;
  readonly metaDescription?: LocalizedText;
  readonly ogTitle?: LocalizedText;
  readonly ogDescription?: LocalizedText;
  readonly ogImage?: string;
  /** A path, e.g. `/about` — never a full origin (see `WebsiteSeoConfig.canonicalBaseUrl`'s doc comment for the boundary this respects). */
  readonly canonicalPath?: string;
  /** Defaults to `true`. Explicitly `false` for a draft-only or intentionally unlisted page. */
  readonly indexable?: boolean;
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
  /**
   * Optimistic-concurrency token. Send it back as `expectedVersion` on
   * update and a save that lost a race is refused with a 409 instead of
   * overwriting whoever saved in between.
   */
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Someone with this page's editor open right now. Advisory only — see `useEditingPresence`. */
export interface EditingParticipant {
  readonly userId: string;
  readonly name: string;
  readonly role: string;
  readonly startedAt: string;
  readonly lastSeenAt: string;
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
  /**
   * The `version` this edit was based on.
   *
   * Optional in the type only because the server still accepts its
   * absence for callers that predate the field. Every Atlas caller sends
   * it — the section editor, the SEO dialog and the visibility toggle —
   * and a new one should too: omitting it means last-write-wins, and the
   * cost of that is paid by whoever's work gets silently replaced.
   */
  readonly expectedVersion?: number;
}
