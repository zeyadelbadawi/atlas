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
 * Phase 6 — `title`/`description`/`ogTitle`/`ogDescription` sources
 * (`WebsitePageSeo`/`WebsiteSeoConfig`) are `LocalizedText`; resolution now
 * takes an explicit `locale` and resolves each field to that locale
 * before applying the same Override → Global → Fallback precedence.
 *
 * The structured-data (`*JsonLd`) shapes below are plain, typed schema.org
 * fragments produced by pure builder functions from real Atlas data —
 * never hand-authored or injected as raw HTML/script. No renderer in this
 * prompt writes them into the DOM (there is no public runtime yet to
 * crawl them); they are shown as a read-only JSON preview in the Website
 * SEO surface and documented as the exact contract a future public
 * runtime will emit.
 */
import type { PublicWebsiteLocale } from './public-website-locale.types';

/** Where a resolved SEO value ultimately came from — surfaced in the read-only preview so an Academy Owner can see why a value is what it is, never persisted. */
export type SeoResolutionSource = 'override' | 'global' | 'fallback';

/** One `<link rel="alternate" hreflang="...">` entry per supported public-website locale (Phase 6) — matches Google's documented "self-referencing hreflang" requirement (the resolved page's own locale is included). */
export interface HreflangAlternate {
  readonly locale: PublicWebsiteLocale;
  /** Always a full, already-locale-prefixed path (`/ar/about`, or `/about` for `en`). */
  readonly path: string;
}

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
  /** Phase 6 — which locale this resolution is for; every title/description field above is already resolved to this locale (falling back to English when the Arabic side is blank). */
  readonly locale: PublicWebsiteLocale;
  readonly hreflangAlternates: readonly HreflangAlternate[];
  /** The `hreflang="x-default"` path: the site's default-language URL of this page. Absent when the page has no alternates (a not-found page). */
  readonly xDefaultPath?: string;
}

/** A schema.org node another node can point at by `@id` alone. */
export interface JsonLdReference {
  readonly '@id': string;
}

/** https://schema.org/PostalAddress */
export interface PostalAddressJsonLd {
  readonly '@type': 'PostalAddress';
  readonly streetAddress?: string;
  readonly addressLocality?: string;
  readonly addressRegion?: string;
  readonly postalCode?: string;
  readonly addressCountry: string;
}

/**
 * https://schema.org/EducationalOrganization — the Academy (Google:
 * "use the most specific schema.org subtype of Organization"), built from
 * its published identity only. `@id` (`<origin>/#organization`) lets every
 * other node name it without repeating it.
 */
export interface OrganizationJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'EducationalOrganization';
  readonly '@id'?: string;
  readonly name: string;
  readonly url?: string;
  readonly description?: string;
  readonly logo?: string;
  readonly image?: string;
  readonly email?: string;
  readonly telephone?: string;
  readonly address?: PostalAddressJsonLd;
  readonly sameAs?: readonly string[];
}

/** https://schema.org/WebSite — the site name search engines show (home page only, per Google's site-name guidance). */
export interface WebSiteJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'WebSite';
  readonly '@id': string;
  readonly name: string;
  readonly url: string;
  readonly inLanguage: readonly string[];
  readonly publisher: JsonLdReference;
}

/** https://schema.org/Person — a course's instructor. */
export interface PersonJsonLd {
  readonly '@type': 'Person';
  readonly name: string;
  readonly image?: string;
}

/** https://schema.org/Offer — what enrolling costs, as the course page states it. */
export interface OfferJsonLd {
  readonly '@type': 'Offer';
  readonly category: 'Free' | 'Paid';
  readonly price: number;
  readonly priceCurrency?: string;
  readonly url: string;
  readonly availability: 'https://schema.org/InStock';
}

/** https://schema.org/CourseInstance — the course as it runs: online, self-paced, its workload and instructors. */
export interface CourseInstanceJsonLd {
  readonly '@type': 'CourseInstance';
  readonly courseMode: 'Online';
  readonly courseWorkload?: string;
  readonly instructor?: readonly PersonJsonLd[];
}

/** https://schema.org/AggregateRating — only from approved reviews the page itself shows. */
export interface AggregateRatingJsonLd {
  readonly '@type': 'AggregateRating';
  readonly ratingValue: number;
  readonly reviewCount: number;
  readonly bestRating: 5;
  readonly worstRating: 1;
}

/** https://schema.org/Course — built from the existing Course domain only, never a duplicated projection stored in the CMS. */
export interface CourseJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Course';
  readonly '@id'?: string;
  readonly name: string;
  readonly description?: string;
  readonly url?: string;
  readonly image?: string;
  readonly inLanguage?: string;
  readonly educationalLevel?: string;
  readonly teaches?: readonly string[];
  readonly coursePrerequisites?: readonly string[];
  readonly provider: {
    readonly '@type': 'EducationalOrganization';
    readonly '@id'?: string;
    readonly name: string;
    readonly url?: string;
  };
  readonly offers?: readonly OfferJsonLd[];
  readonly hasCourseInstance?: readonly CourseInstanceJsonLd[];
  readonly aggregateRating?: AggregateRatingJsonLd;
}

/** https://schema.org/ItemList — the course catalog: one `ListItem` per course page (Google "Course list" summary page). */
export interface ItemListJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'ItemList';
  readonly itemListElement: ReadonlyArray<{
    readonly '@type': 'ListItem';
    readonly position: number;
    readonly url: string;
    readonly name?: string;
  }>;
}

/** https://schema.org/FAQPage — the FAQs page's own visible questions and answers. */
export interface FaqPageJsonLd {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'FAQPage';
  readonly mainEntity: ReadonlyArray<{
    readonly '@type': 'Question';
    readonly name: string;
    readonly acceptedAnswer: {
      readonly '@type': 'Answer';
      readonly text: string;
    };
  }>;
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
