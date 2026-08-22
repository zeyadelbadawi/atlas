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
 */
import { useEffect } from 'react';
import type { ResolvedSeoMetadata } from '@types';

const MANAGED_ATTR = 'data-atlas-seo';

export interface UseDocumentSeoOptions {
  readonly seo: ResolvedSeoMetadata;
  readonly siteTitle?: string;
  /** Absolute canonical URL — built by the caller from `window.location.origin` (the real hostname the visitor is actually on), never an invented domain. */
  readonly canonicalUrl?: string;
  /** Plain schema.org objects (`OrganizationJsonLd`, `CourseJsonLd`, ...) — each emitted as its own `<script type="application/ld+json">`. Typed as `unknown` only because it accepts a union of several distinct JSON-LD interfaces; every entry is still real, typed Atlas data produced by `@features/website`'s structured-data builders, never an arbitrary/untyped value. */
  readonly structuredData?: readonly unknown[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string | undefined): void {
  const existing = document.head.querySelector(`meta[${attr}="${key}"][${MANAGED_ATTR}]`);
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

export function useDocumentSeo({ seo, siteTitle, canonicalUrl, structuredData }: UseDocumentSeoOptions): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = siteTitle ? `${seo.title} · ${siteTitle}` : seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.indexable ? 'index,follow' : 'noindex,nofollow');

    upsertMeta('property', 'og:title', seo.ogTitle);
    upsertMeta('property', 'og:description', seo.ogDescription);
    upsertMeta('property', 'og:type', 'website');
    if (seo.ogImage) upsertMeta('property', 'og:image', seo.ogImage);
    if (canonicalUrl) upsertMeta('property', 'og:url', canonicalUrl);

    upsertMeta('name', 'twitter:card', seo.ogImage ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', seo.ogTitle);
    upsertMeta('name', 'twitter:description', seo.ogDescription);
    if (seo.ogImage) upsertMeta('name', 'twitter:image', seo.ogImage);

    let canonicalLink: HTMLLinkElement | null = null;
    if (canonicalUrl) {
      canonicalLink =
        document.head.querySelector<HTMLLinkElement>(`link[rel="canonical"][${MANAGED_ATTR}]`) ??
        document.createElement('link');
      canonicalLink.rel = 'canonical';
      canonicalLink.href = canonicalUrl;
      canonicalLink.setAttribute(MANAGED_ATTR, 'true');
      if (!canonicalLink.isConnected) document.head.appendChild(canonicalLink);
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
      document.head.querySelectorAll(`[${MANAGED_ATTR}]`).forEach((node) => node.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seo, siteTitle, canonicalUrl, JSON.stringify(structuredData)]);
}
