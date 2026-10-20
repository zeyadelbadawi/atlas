/**
 * The help center's cookieless beacon (DL-57), sent to Atlas's own API
 * (`POST /api/v1/mkt/events`, proxied on the docs host) like the marketing
 * site's: no cookie, no storage, no identifier, `credentials: 'omit'`;
 * nothing at all for a browser sending Global Privacy Control or Do Not
 * Track. Closed vocabulary only (mirrors the backend's
 * `marketing-events.vocabulary.ts`): the page template, the locale, the
 * device class and a value from a fixed list. Never the search text, a
 * path or an article id.
 */
export const DOCS_EVENTS_ENDPOINT = '/api/v1/mkt/events';

export const DOCS_PAGES = ['docs:home', 'docs:category', 'docs:article', 'docs:search', 'docs:404'] as const;
export type DocsPage = (typeof DOCS_PAGES)[number];

export type DocsEvent =
  | { readonly name: 'page_viewed' }
  | { readonly name: 'docs_search_used'; readonly value: 'results' | 'no_results' }
  | { readonly name: 'docs_helpful'; readonly value: 'yes' | 'no' }
  | { readonly name: 'language_switched'; readonly value: 'en' | 'ar' };

export function optedOut(nav: Navigator = navigator): boolean {
  const gpc = (nav as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const dnt = nav.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1';
  return gpc || dnt;
}

export function pageTemplate(doc: Document = document): DocsPage | null {
  const value = doc.body?.dataset.mktPage ?? '';
  return (DOCS_PAGES as readonly string[]).includes(value) ? (value as DocsPage) : null;
}

/** One event per call; batching is unnecessary for a handful of events per visit. */
export function sendDocsEvent(event: DocsEvent, doc: Document = document): void {
  try {
    if (optedOut()) return;
    const page = pageTemplate(doc);
    if (!page) return;
    const locale = doc.documentElement.lang === 'ar' ? 'ar' : 'en';
    const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const body = JSON.stringify({
      events: [{ name: event.name, page, locale, device, ...('value' in event ? { props: { value: event.value } } : {}) }],
    });
    if (navigator.sendBeacon?.(DOCS_EVENTS_ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    void fetch(DOCS_EVENTS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Measurement must never break the page.
  }
}
