/**
 * Assembles the server-rendered document from the client build's own
 * `index.html` (Reports/SSR_ARCHITECTURE_ANALYSIS.md §5): the same
 * stylesheet and scripts, with the page's markup in `#root`, its head
 * tags, the right `<html lang dir>`, and the data the page was rendered
 * with, so the browser hydrates instead of rendering from scratch.
 */

/** The element id of the hydration payload. `main.tsx` reads it. */
export const SSR_PAYLOAD_ELEMENT_ID = '__atlas_ssr__';

/** Payload format version; `main.tsx` ignores any other. */
export const SSR_PAYLOAD_VERSION = 1;

export interface SsrPayload {
  readonly v: typeof SSR_PAYLOAD_VERSION;
  readonly locale: 'en' | 'ar';
  readonly renderYear: number;
  readonly consentDecided: boolean;
  /** The dehydrated public-website queries (`@tanstack/react-query`). */
  readonly queries: unknown;
}

/**
 * JSON safe inside `<script type="application/json">`: no `<`, `>` or `&`
 * (so the text can never close the element or open a comment), and no
 * U+2028/U+2029.
 */
export function serializePayload(payload: SsrPayload): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Head tags of the plain `index.html` that page-specific tags replace. */
const DEFAULT_HEAD_TAGS: readonly RegExp[] = [
  /<title>[^<]*<\/title>\s*/,
  /<meta name="description"[^>]*>\s*/,
  /<meta property="og:title"[^>]*>\s*/,
  /<meta property="og:description"[^>]*>\s*/,
  /<meta property="og:type"[^>]*>\s*/,
  /<meta name="twitter:title"[^>]*>\s*/,
  /<meta name="twitter:description"[^>]*>\s*/,
];

export interface SsrDocumentParts {
  readonly locale: 'en' | 'ar';
  readonly direction: 'ltr' | 'rtl';
  /** Page-specific head tags (already escaped), or `''` to keep the defaults. */
  readonly headHtml: string;
  /** `<link rel="modulepreload">` and the like, placed before `</head>`. */
  readonly preloadHtml: string;
  readonly appHtml: string;
  readonly payloadJson: string;
}

export function buildSsrDocument(
  template: string,
  parts: SsrDocumentParts
): string {
  // Replacement functions, never strings: page content may contain `$`
  // sequences that `String.prototype.replace` would otherwise interpret.
  let html = template.replace(
    /<html[^>]*>/,
    () => `<html lang="${parts.locale}" dir="${parts.direction}">`
  );
  if (parts.headHtml) {
    for (const pattern of DEFAULT_HEAD_TAGS)
      html = html.replace(pattern, () => '');
    // The Academy's own favicon replaces the platform icon, never sits
    // beside it (browsers differ in which of two icons they pick).
    if (parts.headHtml.includes('data-atlas-favicon'))
      html = html.replace(/<link rel="icon"[^>]*>\s*/, () => '');
  }
  html = html.replace(
    '</head>',
    () => `${parts.headHtml}${parts.preloadHtml}</head>`
  );
  const root = '<div id="root"></div>';
  if (!html.includes(root)) {
    throw new Error('index.html has no empty #root element');
  }
  return html.replace(
    root,
    () =>
      `<div id="root">${parts.appHtml}</div>` +
      `<script type="application/json" id="${SSR_PAYLOAD_ELEMENT_ID}">${parts.payloadJson}</script>`
  );
}
