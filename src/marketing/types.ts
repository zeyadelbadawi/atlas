/**
 * Contract for the static platform marketing site (B1 / M1a, DL-50).
 *
 * Pages are React components rendered to static HTML at build time
 * (`renderToStaticMarkup`, no React at runtime) and served by Caddy on the
 * platform apex host only. Interactivity (theme, menu, live pricing refresh,
 * contact form) comes from one small vanilla script, `client/main.ts`.
 *
 *   registry.tsx   which pages exist, their copy-bound components and heads
 *   prerender/     turns the registry into full HTML documents (build time)
 */
import type { ReactElement } from 'react';
import type { Plan } from '@/types/plan.types';

export type MarketingLang = 'en' | 'ar';

/** One page of the site in one language. `path` is the public URL path. */
export interface MarketingPageDef {
  /** Stable id shared by the two languages of the same page, e.g. `pricing`. */
  readonly id: string;
  readonly lang: MarketingLang;
  /** Public path, no trailing slash except the root: `/`, `/ar`, `/pricing`, `/ar/pricing`. */
  readonly path: string;
  /** Output file under `dist/marketing/`, e.g. `index.html`, `ar/pricing/index.html`, `404.html`. */
  readonly file: string;
  /** Listed in sitemap.xml (false for 404). */
  readonly inSitemap: boolean;
  readonly head: (ctx: MarketingRenderContext) => MarketingHead;
  readonly render: (ctx: MarketingRenderContext) => ReactElement;
}

export interface MarketingRenderContext {
  /** Customer-facing catalog from `GET /api/v1/public/plans`, fetched at build time. */
  readonly plans: readonly Plan[];
  /** Absolute origin without trailing slash, e.g. `https://atlass.dpdns.org`. */
  readonly siteUrl: string;
  /** ISO date of the build (used for "prices as of"). */
  readonly buildDate: string;
}

export interface MarketingHead {
  readonly title: string;
  readonly description: string;
  /** Path of this page's canonical URL (joined with siteUrl). */
  readonly canonicalPath: string;
  /** Paths of the EN and AR versions, for hreflang (`en`, `ar`, `x-default` = en). Omit for 404. */
  readonly alternates?: { readonly en: string; readonly ar: string };
  /** Absolute path of the 1200×630 Open Graph image, e.g. `/brand/og/og-home-en.png`. */
  readonly ogImage: string;
  /** `og:image:alt` / `twitter:image:alt` in the page language (SPEC §E.1). Defaults to the OG title. */
  readonly ogImageAlt?: string;
  /** JSON-LD objects; each becomes one `<script type="application/ld+json">`. */
  readonly jsonLd?: readonly object[];
  /** Defaults to `index, follow`; 404 uses `noindex, follow`. */
  readonly robots?: string;
  /** B3 — `og:type`; defaults to `website` (a blog post is an `article`). */
  readonly ogType?: 'website' | 'article';
  /** B3 — the OG image's real size when it is not the 1200×630 default (a post cover). */
  readonly ogImageSize?: { readonly width: number; readonly height: number };
  /** B3 — `article:published_time` / `article:modified_time` (ISO) for a post. */
  readonly articleTimes?: {
    readonly published: string;
    readonly modified: string;
  };
}
