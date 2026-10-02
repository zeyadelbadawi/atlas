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

const MANAGED_ATTR = 'data-atlas-seo';

export interface UseDocumentSeoOptions {
  readonly seo: ResolvedSeoMetadata;
  readonly siteTitle?: string;
  /** Absolute canonical URL — built by the caller from `window.location.origin` (the real hostname the visitor is actually on), never an invented domain. */
  readonly canonicalUrl?: string;
  /** Plain schema.org objects (`OrganizationJsonLd`, `CourseJsonLd`, ...) — each emitted as its own `<script type="application/ld+json">`. Typed as `unknown` only because it accepts a union of several distinct JSON-LD interfaces; every entry is still real, typed Atlas data produced by `@features/website`'s structured-data builders, never an arbitrary/untyped value. */
  readonly structuredData?: readonly unknown[];
  /** The Academy's own favicon URL (`academyFaviconHref`), when it has one. The browser's `<link rel="icon">` is managed by `useAcademyFavicon`; this only puts the same tag in a server-rendered head. */
  readonly faviconHref?: string;
  /** The locale this render is for — sets `<html lang>`/`<html dir>` and is used to build each hreflang alternate's absolute URL from `seo.hreflangAlternates`' paths. */
  readonly locale: PublicWebsiteLocale;
}

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string | undefined
): void {
  const existing = document.head.querySelector(
    `meta[${attr}="${key}"][${MANAGED_ATTR}]`
  );
  if (!content) {
    existing?.remove();
    return;
  }
  const tag = existing ?? document.createElement('meta');
  tag.setAttribute(attr, key);
  tag.setAttribute('content', content);
  tag.setAttribute(MANAGED_ATTR, 'true');
  if (!existing) document.head.appendChild(tag);
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
export function renderSeoHeadHtml({
  seo,
  siteTitle,
  canonicalUrl,
  structuredData,
  faviconHref,
}: UseDocumentSeoOptions): string {
  const tags: string[] = [];
  if (faviconHref) {
    tags.push(
      `<link rel="icon" href="${escapeAttribute(faviconHref)}" ${ACADEMY_FAVICON_ATTR}="true">`
    );
  }
  const title = siteTitle ? `${seo.title} · ${siteTitle}` : seo.title;
  tags.push(`<title>${escapeText(title)}</title>`);
  const meta = (attr: 'name' | 'property', key: string, content?: string) => {
    if (content) {
      tags.push(
        `<meta ${attr}="${key}" content="${escapeAttribute(content)}" ${MANAGED_ATTR}="true">`
      );
    }
  };
  meta('name', 'description', seo.description);
  meta('name', 'robots', seo.indexable ? 'index,follow' : 'noindex,nofollow');
  meta('property', 'og:title', seo.ogTitle);
  meta('property', 'og:description', seo.ogDescription);
  meta('property', 'og:type', 'website');
  meta('property', 'og:image', seo.ogImage);
  meta('property', 'og:url', canonicalUrl);
  meta('name', 'twitter:card', seo.ogImage ? 'summary_large_image' : 'summary');
  meta('name', 'twitter:title', seo.ogTitle);
  meta('name', 'twitter:description', seo.ogDescription);
  meta('name', 'twitter:image', seo.ogImage);
  if (canonicalUrl) {
    tags.push(
      `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" ${MANAGED_ATTR}="true">`
    );
    const origin = new URL(canonicalUrl).origin;
    for (const alternate of seo.hreflangAlternates) {
      tags.push(
        `<link rel="alternate" hreflang="${escapeAttribute(alternate.locale)}" href="${escapeAttribute(`${origin}${alternate.path}`)}" ${MANAGED_ATTR}="true">`
      );
    }
  }
  for (const entry of structuredData ?? []) {
    tags.push(
      `<script type="application/ld+json" ${MANAGED_ATTR}="true">${safeJson(entry)}</script>`
    );
  }
  return tags.join('');
}

export function useDocumentSeo({
  seo,
  siteTitle,
  canonicalUrl,
  structuredData,
  faviconHref,
  locale,
}: UseDocumentSeoOptions): void {
  usePublicWebsiteDocumentDirection(locale);

  const collector = useContext(SeoHeadCollectorContext);
  if (collector) {
    collector.current = {
      seo,
      siteTitle,
      canonicalUrl,
      structuredData,
      faviconHref,
      locale,
    };
  }

  useEffect(() => {
    // A server-rendered page arrives with these tags already in the head
    // (Reports/SSR_ARCHITECTURE_ANALYSIS.md §4 #6). Meta and canonical tags
    // are reused below; the list-like ones are replaced, never duplicated.
    document.head
      .querySelectorAll(
        `link[rel="alternate"][${MANAGED_ATTR}], script[type="application/ld+json"][${MANAGED_ATTR}]`
      )
      .forEach((node) => node.remove());

    const previousTitle = document.title;
    document.title = siteTitle ? `${seo.title} · ${siteTitle}` : seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta(
      'name',
      'robots',
      seo.indexable ? 'index,follow' : 'noindex,nofollow'
    );

    upsertMeta('property', 'og:title', seo.ogTitle);
    upsertMeta('property', 'og:description', seo.ogDescription);
    upsertMeta('property', 'og:type', 'website');
    if (seo.ogImage) upsertMeta('property', 'og:image', seo.ogImage);
    if (canonicalUrl) upsertMeta('property', 'og:url', canonicalUrl);

    upsertMeta(
      'name',
      'twitter:card',
      seo.ogImage ? 'summary_large_image' : 'summary'
    );
    upsertMeta('name', 'twitter:title', seo.ogTitle);
    upsertMeta('name', 'twitter:description', seo.ogDescription);
    if (seo.ogImage) upsertMeta('name', 'twitter:image', seo.ogImage);

    let canonicalLink: HTMLLinkElement | null = null;
    if (canonicalUrl) {
      canonicalLink =
        document.head.querySelector<HTMLLinkElement>(
          `link[rel="canonical"][${MANAGED_ATTR}]`
        ) ?? document.createElement('link');
      canonicalLink.rel = 'canonical';
      canonicalLink.href = canonicalUrl;
      canonicalLink.setAttribute(MANAGED_ATTR, 'true');
      if (!canonicalLink.isConnected) document.head.appendChild(canonicalLink);
    }

    if (canonicalUrl) {
      const origin = new URL(canonicalUrl).origin;
      seo.hreflangAlternates.forEach((alternate) => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = alternate.locale;
        link.href = `${origin}${alternate.path}`;
        link.setAttribute(MANAGED_ATTR, 'true');
        document.head.appendChild(link);
      });
    }

    (structuredData ?? []).forEach((entry) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(MANAGED_ATTR, 'true');
      // `textContent`, never `innerHTML`/`dangerouslySetInnerHTML` — this
      // is never HTML-parsed, so a value inside `entry` cannot break out
      // of the script tag or execute.
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
    });

    return () => {
      document.title = previousTitle;
      document.head
        .querySelectorAll(`[${MANAGED_ATTR}]`)
        .forEach((node) => node.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seo, siteTitle, canonicalUrl, locale, JSON.stringify(structuredData)]);
}
