/**
 * Website SEO domain types (Prompt 10).
 *
 * SEO is an independent architectural domain from the Theme Engine
 * (Prompt 9) — nothing here reads a `WebsiteThemeKey` or any theme
 * token, and nothing in the Theme Engine reads any of these types (see
 * `Reports/ARCHITECTURE.md`, Prompt 10, "SEO / Theme Independence").
 *
 * `ResolvedSeoMetadata` is the OUTPUT of the resolution hierarchy
 * (`resolvePageSeo`/`resolveCourseSeo`/`resolveBlogPostSeo` in
 * `seo-resolution.utils.ts`): Page/Entity Override → Website Global
 * Default → Atlas System Fallback. It is never itself persisted — it is
 * computed fresh from `WebsiteConfiguration.seo`, a `WebsitePage.seo` (or
 * a Course/BlogPost's own fields), and a last-resort fallback, every time
 * it's needed.
 *
 * The structured-data (`*JsonLd`) shapes below are plain, typed schema.org
 * fragments produced by pure builder functions from real Atlas data —
 * never hand-authored or injected as raw HTML/script. No renderer in this
 * prompt writes them into the DOM (there is no public runtime yet to
 * crawl them); they are shown as a read-only JSON preview in the Website
 * SEO surface and documented as the exact contract a future public
 * runtime will emit.
 */

/** Where a resolved SEO value ultimately came from — surfaced in the read-only preview so an Academy Owner can see why a value is what it is, never persisted. */
export type SeoResolutionSource = 'override' | 'global' | 'fallback';

export interface ResolvedSeoMetadata {
  readonly title: string;
  readonly description: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogImage?: string;
  /** A path, e.g. `/about` — never a full origin; real host/DNS is a future public-runtime concern (see `Reports/ARCHITECTURE.md`, Prompt 10, "Public Runtime Boundary"). */
  readonly canonicalPath?: string;
  readonly indexable: boolean;
  readonly titleSource: SeoResolutionSource;
  readonly descriptionSource: SeoResolutionSource;
}

/** https://schema.org/Organization — built from the existing Academy record only. */
export interface OrganizationJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Organization';
  readonly name: string;
  readonly description?: string;
  readonly logo?: string;
  readonly email?: string;
  readonly telephone?: string;
}

/** https://schema.org/Course — built from the existing Course domain only, never a duplicated projection stored in the CMS. */
export interface CourseJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Course';
  readonly name: string;
  readonly description?: string;
  readonly provider: { readonly '@type': 'Organization'; readonly name: string };
}

/** https://schema.org/Article — built from an existing `BlogPost` (`@features/blog`) only. */
export interface ArticleJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Article';
  readonly headline: string;
  readonly description?: string;
  readonly image?: string;
  readonly author?: { readonly '@type': 'Person'; readonly name: string };
  readonly datePublished?: string;
  readonly dateModified?: string;
}

/**
 * Named `Seo*` (not bare `BreadcrumbItem`) to avoid colliding with the
 * pre-existing, unrelated `BreadcrumbItem` in `navigation.types.ts` (the
 * dashboard's own UI breadcrumb trail) — same naming discipline Prompt 9
 * established for `Website*` vs. the dashboard `Theme` system.
 */
export interface SeoBreadcrumbItem {
  readonly name: string;
  /** A path, not a full URL — same boundary as `ResolvedSeoMetadata.canonicalPath`. */
  readonly path: string;
}

/** https://schema.org/BreadcrumbList */
export interface BreadcrumbJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'BreadcrumbList';
  readonly itemListElement: ReadonlyArray<{
    readonly '@type': 'ListItem';
    readonly position: number;
    readonly name: string;
    readonly item: string;
  }>;
}



/** How often a page's content is expected to change — the standard sitemap.xml vocabulary. */
export type SitemapChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * One row of the future sitemap — a documented contract/preview only.
 * This prompt does not serve `sitemap.xml`; see "Robots / Sitemap
 * Contracts" in `Reports/ARCHITECTURE.md`, Prompt 10.
 */
export interface SitemapEntry {
  readonly path: string;
  readonly lastModified: string;
  readonly changeFrequency: SitemapChangeFrequency;
  /** 0.0–1.0, schema.org/sitemap.xml convention. */
  readonly priority: number;
}
