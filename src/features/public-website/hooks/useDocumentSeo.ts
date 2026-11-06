/**
 * useDocumentSeo hook (Prompt 11).
 *
 * The public runtime's ONLY mechanism for writing SEO metadata into the
 * page — no SSR/head-management library exists anywhere in this stack
 * (verified: no `react-helmet`/`next/head`/equivalent dependency), so
 * this hook manages `document.head` directly via plain DOM APIs. Every
 * element it touches is tagged `data-atlas-seo="true"` and removed
 * before the next write and on unmount, so navigating between public
 * pages never accumulates stale/duplicate tags and this hook can never
 * leak into (or be confused with) the authenticated dashboard's own head
 * state.
 *
 * Structured data (JSON-LD) is written via `document.createElement('script')`
 * + `script.textContent = JSON.stringify(...)` — `textContent` is never
 * HTML-parsed, so this is safe without `dangerouslySetInnerHTML` or any
 * other injection risk (see `Reports/ARCHITECTURE.md`, Prompt 11,
 * "Structured Data Injection Safety").
 *
 * Phase 6 (Bilingual Academy Websites) — also the one place `<html
 * lang>`/`<html dir>` are applied for the public runtime (a real visitor
 * never mounts `AtlasLocalizationProvider`, which only ever sets these for
 * the dashboard), and where `seo.hreflangAlternates` becomes real `<link
 * rel="alternate" hreflang>` tags — one per supported locale, so search
 * engines discover the `/ar/...` twin of every page instead of treating
 * the two languages as unrelated, duplicate-content URLs.
 */
import { createContext, useContext, useEffect } from 'react';
import type { ResolvedSeoMetadata } from '@types';
import {
  usePublicWebsiteDocumentDirection,
  type PublicWebsiteLocale,
} from '@features/website';
import { ACADEMY_FAVICON_ATTR } from './useAcademyFavicon';
import {
  AcademyTitleBaselineContext,
  composeDocumentTitle,
} from './useAcademyDocumentTitle';

const MANAGED_ATTR = 'data-atlas-seo';

/** Search-engine ownership checks the Academy Owner pasted in (Website → SEO). Rendered on the home page only, where Search Console and Bing Webmaster Tools look for them. */
export interface SiteVerificationTokens {
  /** `<meta name="google-site-verification">` (Google Search Console, URL-prefix property). */
  readonly google?: string;
  /** `<meta name="msvalidate.01">` (Bing Webmaster Tools). */
  readonly bing?: string;
}

export interface UseDocumentSeoOptions {
  readonly seo: ResolvedSeoMetadata;
  readonly siteTitle?: string;
  /** Absolute canonical URL — on the Academy's canonical host (`resolveCanonicalOrigin`), never an invented domain. */
  readonly canonicalUrl?: string;
  /** Plain schema.org objects (`OrganizationJsonLd`, `CourseJsonLd`, ...) — each emitted as its own `<script type="application/ld+json">`. Typed as `unknown` only because it accepts a union of several distinct JSON-LD interfaces; every entry is still real, typed Atlas data produced by `@features/website`'s structured-data builders, never an arbitrary/untyped value. */
  readonly structuredData?: readonly unknown[];
  /** The Academy's own favicon URL (`academyFaviconHref`), when it has one. The browser's `<link rel="icon">` is managed by `useAcademyFavicon`; this only puts the same tag in a server-rendered head. */
  readonly faviconHref?: string;
  /** The locale this render is for — sets `<html lang>`/`<html dir>` and is used to build each hreflang alternate's absolute URL from `seo.hreflangAlternates`' paths. */
  readonly locale: PublicWebsiteLocale;
  /** `og:site_name` — the Academy's site name. */
  readonly siteName?: string;
  /** `<meta name="theme-color">` (a `#rrggbb` colour: the Academy's brand). */
  readonly themeColor?: string;
  /** `<link rel="apple-touch-icon">` (an absolute or same-origin PNG). */
  readonly appleTouchIconHref?: string;
  readonly verification?: SiteVerificationTokens;
  /**
   * The page does not exist (unknown path, a course that is not public):
   * `noindex`, no canonical or alternates, and the server renderer answers
   * with HTTP 404 instead of a soft 404.
   */
  readonly notFound?: boolean;
}

/** `og:locale` values (language_TERRITORY, as the Open Graph protocol asks). */
const OG_LOCALE: Record<PublicWebsiteLocale, string> = {
  en: 'en_US',
  ar: 'ar_AR',
};

type SeoHeadTag =
  | {
      readonly tag: 'meta';
      readonly attr: 'name' | 'property';
      readonly key: string;
      readonly content: string;
    }
  | {
      readonly tag: 'link';
      readonly rel: string;
      readonly href: string;
      readonly hreflang?: string;
    }
  | { readonly tag: 'ld'; readonly json: unknown };

/** A verification token as Search Console / Bing hand it out: letters, digits, `-` and `_` only. */
const VERIFICATION_TOKEN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Every managed head tag (except `<title>` and the favicon), in order — the
 * ONE list both the server-rendered head and the browser effect write, so
 * the two can never drift.
 */
export function buildSeoHeadTags({
  seo,
  canonicalUrl,
  structuredData,
  locale,
  siteName,
  themeColor,
  appleTouchIconHref,
  verification,
  notFound,
}: UseDocumentSeoOptions): readonly SeoHeadTag[] {
  const tags: SeoHeadTag[] = [];
  const meta = (attr: 'name' | 'property', key: string, content?: string) => {
    if (content) tags.push({ tag: 'meta', attr, key, content });
  };
  const indexable = seo.indexable && !notFound;
  meta('name', 'description', seo.description);
  meta(
    'name',
    'robots',
    indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'
  );
  // Ownership checks work on a noindex page too, so an owner can verify
  // before letting search engines in.
  if (!notFound) {
    if (verification?.google && VERIFICATION_TOKEN.test(verification.google))
      meta('name', 'google-site-verification', verification.google);
    if (verification?.bing && VERIFICATION_TOKEN.test(verification.bing))
      meta('name', 'msvalidate.01', verification.bing);
  }
  meta('name', 'theme-color', themeColor);
  meta('property', 'og:site_name', siteName);
  meta('property', 'og:title', seo.ogTitle);
  meta('property', 'og:description', seo.ogDescription);
  meta('property', 'og:type', 'website');
  meta('property', 'og:locale', OG_LOCALE[locale]);
  const pageUrl = notFound ? undefined : canonicalUrl;
  if (pageUrl) {
    for (const alternate of seo.hreflangAlternates) {
      if (alternate.locale !== locale)
        meta('property', 'og:locale:alternate', OG_LOCALE[alternate.locale]);
    }
  }
  meta('property', 'og:image', seo.ogImage);
  meta('property', 'og:url', pageUrl);
  meta('name', 'twitter:card', seo.ogImage ? 'summary_large_image' : 'summary');
  meta('name', 'twitter:title', seo.ogTitle);
  meta('name', 'twitter:description', seo.ogDescription);
  meta('name', 'twitter:image', seo.ogImage);
  if (appleTouchIconHref) {
    tags.push({
      tag: 'link',
      rel: 'apple-touch-icon',
      href: appleTouchIconHref,
    });
  }
  if (pageUrl) {
    tags.push({ tag: 'link', rel: 'canonical', href: pageUrl });
    const origin = new URL(pageUrl).origin;
    for (const alternate of seo.hreflangAlternates) {
      tags.push({
        tag: 'link',
        rel: 'alternate',
        hreflang: alternate.locale,
        href: `${origin}${alternate.path}`,
      });
    }
    if (seo.xDefaultPath && seo.hreflangAlternates.length > 0) {
      tags.push({
        tag: 'link',
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${origin}${seo.xDefaultPath}`,
      });
    }
  }
  for (const entry of structuredData ?? [])
    tags.push({ tag: 'ld', json: entry });
  return tags;
}

/**
 * Server rendering only (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #6): a
 * per-request holder the renderer provides. Effects never run on a
 * server, so the hook reports what it WOULD write, and the renderer puts
 * the same tags in the page's head with `renderSeoHeadHtml`.
 */
export const SeoHeadCollectorContext = createContext<{
  current: UseDocumentSeoOptions | null;
} | null>(null);

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** JSON that cannot end the script element or be read as HTML. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * The head tags `useDocumentSeo` writes, as HTML — the same set, the same
 * values, the same `data-atlas-seo` marker, so the browser's effect adopts
 * them instead of adding a second copy.
 */
export function renderSeoHeadHtml(options: UseDocumentSeoOptions): string {
  const { seo, siteTitle, faviconHref } = options;
  const html: string[] = [];
  if (faviconHref) {
    html.push(
      `<link rel="icon" href="${escapeAttribute(faviconHref)}" ${ACADEMY_FAVICON_ATTR}="true">`
    );
  }
  html.push(
    `<title>${escapeText(composeDocumentTitle(seo.title, siteTitle))}</title>`
  );
  for (const tag of buildSeoHeadTags(options)) {
    if (tag.tag === 'meta') {
      html.push(
        `<meta ${tag.attr}="${tag.key}" content="${escapeAttribute(tag.content)}" ${MANAGED_ATTR}="true">`
      );
    } else if (tag.tag === 'link') {
      const hreflang = tag.hreflang
        ? ` hreflang="${escapeAttribute(tag.hreflang)}"`
        : '';
      html.push(
        `<link rel="${tag.rel}"${hreflang} href="${escapeAttribute(tag.href)}" ${MANAGED_ATTR}="true">`
      );
    } else {
      html.push(
        `<script type="application/ld+json" ${MANAGED_ATTR}="true">${safeJson(tag.json)}</script>`
      );
    }
  }
  return html.join('');
}

function appendTag(tag: SeoHeadTag): void {
  let node: HTMLElement;
  if (tag.tag === 'meta') {
    node = document.createElement('meta');
    node.setAttribute(tag.attr, tag.key);
    node.setAttribute('content', tag.content);
  } else if (tag.tag === 'link') {
    const link = document.createElement('link');
    link.rel = tag.rel;
    if (tag.hreflang) link.hreflang = tag.hreflang;
    link.href = tag.href;
    node = link;
  } else {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    // `textContent`, never `innerHTML`/`dangerouslySetInnerHTML` — this
    // is never HTML-parsed, so a value inside the entry cannot break out
    // of the script tag or execute.
    script.textContent = JSON.stringify(tag.json);
    node = script;
  }
  node.setAttribute(MANAGED_ATTR, 'true');
  document.head.appendChild(node);
}

export function useDocumentSeo(options: UseDocumentSeoOptions): void {
  const { seo, siteTitle, locale } = options;
  usePublicWebsiteDocumentDirection(locale);

  const titleBaseline = useContext(AcademyTitleBaselineContext);
  const collector = useContext(SeoHeadCollectorContext);
  if (collector) collector.current = options;

  // Everything the head shows, as one comparable value: the effect runs
  // again only when what it writes changes.
  const tagsKey = JSON.stringify(buildSeoHeadTags(options));

  useEffect(() => {
    // A server-rendered page arrives with these tags already in the head
    // (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #6): they are replaced by the
    // same list, never duplicated.
    document.head
      .querySelectorAll(`[${MANAGED_ATTR}]`)
      .forEach((node) => node.remove());

    const previousTitle = document.title;
    document.title = composeDocumentTitle(seo.title, siteTitle);
    (JSON.parse(tagsKey) as SeoHeadTag[]).forEach(appendTag);

    return () => {
      // On an Academy's site the title to fall back to is the Academy's
      // name, never whatever happened to be there before (e.g. "Atlas").
      document.title = titleBaseline ?? previousTitle;
      document.head
        .querySelectorAll(`[${MANAGED_ATTR}]`)
        .forEach((node) => node.remove());
    };
  }, [seo.title, siteTitle, titleBaseline, tagsKey]);
}
