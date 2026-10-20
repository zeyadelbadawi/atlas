/**
 * The marketing site's HTML document template (build time, B1 / M1a).
 *
 * `renderDocument` wraps one page's static markup (`renderToStaticMarkup`)
 * in a complete document: language and direction from the server, the
 * metadata of SPEC §E.1/§E.2 generated from the page's `head()` (never
 * hand-written per page), the hashed stylesheet, the render-blocking theme
 * script, the deferred module script and the page's JSON-LD.
 *
 * CSP (`script-src 'self'`): the only `<script>` elements are external
 * files from this origin and `type="application/ld+json"` data blocks,
 * which browsers never execute. Nothing here emits an inline handler or an
 * inline executable script.
 *
 * Pure: no file system, no network, so it is unit-tested directly.
 */
import type {
  MarketingHead,
  MarketingLang,
  MarketingPageDef,
  MarketingRenderContext,
} from '../types';

/** Hashed build outputs a document links to (from the client build manifest). */
export interface MarketingAssets {
  /** Stylesheet hrefs, in cascade order. */
  readonly stylesheets: readonly string[];
  /** Module entry scripts (`type="module"`, deferred by nature). */
  readonly moduleScripts: readonly string[];
  /** Chunks the entry imports statically (`modulepreload`). */
  readonly modulePreloads: readonly string[];
  /** The render-blocking theme script (sets `.dark` before first paint). */
  readonly themeScript: string;
  /** Above-the-fold font files to preload, per language (SPEC §F.1: at most 2). */
  readonly fontPreloads: Readonly<Record<MarketingLang, readonly string[]>>;
}

/** `theme-color` per colour scheme (brand navy / dark surface). */
export const THEME_COLORS = { light: '#1B3A8C', dark: '#0A1222' } as const;

/** `og:site_name` — the brand in the page's language (SPEC §E.1). */
export const SITE_NAME: Record<MarketingLang, string> = {
  en: 'Atlas',
  ar: 'أطلس',
};

const OG_LOCALE: Record<MarketingLang, string> = { en: 'en_US', ar: 'ar_EG' };

/** The robots value the contract defaults to; SPEC §E.1 omits the tag for it. */
const DEFAULT_ROBOTS = 'index, follow';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * JSON for a `<script type="application/ld+json">` block. `<`, `>` and `&`
 * are escaped as JSON unicode escapes (still the same JSON value), so no
 * string in the data can close the element or open a comment; U+2028/9 for
 * old parsers.
 */
export function serializeJsonLd(value: object): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** `https://atlass.dpdns.org` + `/pricing` (the root stays `/`). */
export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = siteUrl.replace(/\/+$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** `og:title` is the title without the brand suffix (SPEC §E.1). */
export function ogTitle(title: string): string {
  return title.replace(/\s*\|\s*(Atlas|أطلس)\s*$/u, '').trim() || title;
}

export function dirFor(lang: MarketingLang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** Whether a robots value keeps the page out of the index. */
export function isNoindex(robots: string | undefined): boolean {
  return /\bnoindex\b/i.test(robots ?? '');
}

function normaliseRobots(robots: string | undefined): string | undefined {
  if (!robots) return undefined;
  const value = robots
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .join(', ');
  return value === DEFAULT_ROBOTS ? undefined : value;
}

function meta(attr: 'name' | 'property', key: string, content: string): string {
  return `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
}

function link(attrs: Record<string, string | undefined>): string {
  const rendered = Object.entries(attrs)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) =>
      value === '' ? key : `${key}="${escapeHtml(value)}"`
    )
    .join(' ');
  return `<link ${rendered}>`;
}

/** The `<head>` contents for one page (exported for tests). */
export function renderHead(
  page: Pick<MarketingPageDef, 'lang'>,
  head: MarketingHead,
  ctx: Pick<MarketingRenderContext, 'siteUrl'>,
  assets: MarketingAssets,
  options: { readonly markdownAlternate?: string } = {}
): string {
  const { lang } = page;
  const robots = normaliseRobots(head.robots);
  const noindex = isNoindex(robots);
  const canonical = absoluteUrl(ctx.siteUrl, head.canonicalPath);
  const ogImage = absoluteUrl(ctx.siteUrl, head.ogImage);
  const otherLang: MarketingLang = lang === 'en' ? 'ar' : 'en';
  const lines: string[] = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(head.title)}</title>`,
    meta('name', 'description', head.description),
    `<meta http-equiv="content-language" content="${lang}">`,
  ];

  // Canonical and hreflang only on indexable pages: a 404 is served at many
  // URLs and has no canonical one; SPEC §E.2 keeps hreflang off noindex pages.
  if (!noindex) {
    lines.push(link({ rel: 'canonical', href: canonical }));
    if (head.alternates) {
      lines.push(
        link({
          rel: 'alternate',
          hreflang: 'en',
          href: absoluteUrl(ctx.siteUrl, head.alternates.en),
        }),
        link({
          rel: 'alternate',
          hreflang: 'ar',
          href: absoluteUrl(ctx.siteUrl, head.alternates.ar),
        }),
        link({
          rel: 'alternate',
          hreflang: 'x-default',
          href: absoluteUrl(ctx.siteUrl, head.alternates.en),
        })
      );
    }
  }
  if (robots) lines.push(meta('name', 'robots', robots));
  if (options.markdownAlternate) {
    // GEO: the same content as Markdown (`/pricing.md`).
    lines.push(
      link({ rel: 'alternate', type: 'text/markdown', href: options.markdownAlternate })
    );
  }

  lines.push(
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLORS.light}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${THEME_COLORS.dark}">`,
    '<meta name="color-scheme" content="light dark">',
    // Render-blocking on purpose (classic script, no async/defer): sets
    // `.dark` on <html> before the first paint, so there is no flash.
    `<script src="${escapeHtml(assets.themeScript)}"></script>`
  );
  for (const href of assets.fontPreloads[lang]) {
    lines.push(
      link({
        rel: 'preload',
        href,
        as: 'font',
        type: 'font/woff2',
        crossorigin: '',
      })
    );
  }
  for (const href of assets.stylesheets) {
    lines.push(link({ rel: 'stylesheet', href }));
  }
  for (const href of assets.modulePreloads) {
    lines.push(link({ rel: 'modulepreload', href }));
  }
  for (const src of assets.moduleScripts) {
    lines.push(`<script type="module" src="${escapeHtml(src)}"></script>`);
  }
  lines.push(
    link({ rel: 'icon', href: '/favicon.ico', sizes: '32x32' }),
    link({ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }),
    link({ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }),
    link({ rel: 'manifest', href: '/site.webmanifest' })
  );

  // Open Graph + Twitter (SPEC §E.1; no `twitter:site`).
  const title = ogTitle(head.title);
  const imageAlt = head.ogImageAlt ?? title;
  lines.push(
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', SITE_NAME[lang]),
    meta('property', 'og:title', title),
    meta('property', 'og:description', head.description),
    ...(noindex ? [] : [meta('property', 'og:url', canonical)]),
    meta('property', 'og:image', ogImage),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', imageAlt),
    meta('property', 'og:locale', OG_LOCALE[lang]),
    ...(head.alternates && !noindex
      ? [meta('property', 'og:locale:alternate', OG_LOCALE[otherLang])]
      : []),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', head.description),
    meta('name', 'twitter:image', ogImage),
    meta('name', 'twitter:image:alt', imageAlt)
  );

  for (const block of head.jsonLd ?? []) {
    lines.push(
      `<script type="application/ld+json">${serializeJsonLd(block)}</script>`
    );
  }
  return lines.join('\n');
}

/** A complete HTML document for one page. */
export function renderDocument(input: {
  readonly page: Pick<MarketingPageDef, 'lang'>;
  readonly head: MarketingHead;
  readonly ctx: Pick<MarketingRenderContext, 'siteUrl'>;
  readonly assets: MarketingAssets;
  /** The page's static markup (`renderToStaticMarkup(page.render(ctx))`). */
  readonly bodyHtml: string;
  /** A Markdown alternate of this page (the pricing page: `/pricing.md`). */
  readonly markdownAlternate?: string;
}): string {
  const { page, head, ctx, assets, bodyHtml } = input;
  return [
    '<!doctype html>',
    `<html lang="${page.lang}" dir="${dirFor(page.lang)}">`,
    '<head>',
    renderHead(page, head, ctx, assets, {
      markdownAlternate: input.markdownAlternate,
    }),
    '</head>',
    `<body class="mk">${bodyHtml}</body>`,
    '</html>',
    '',
  ].join('\n');
}
