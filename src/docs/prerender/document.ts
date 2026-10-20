/**
 * The help center's HTML document (build time). Same CSP contract as the
 * marketing site: the only scripts are same-origin files and JSON-LD data
 * blocks; nothing inline executes.
 */
import { escapeHtml, serializeJsonLd } from '@/marketing/prerender/document';
import type { DocLang } from '../types';

export interface DocsAssets {
  readonly stylesheets: readonly string[];
  readonly moduleScripts: readonly string[];
  readonly modulePreloads: readonly string[];
  readonly themeScript: string;
  readonly fontPreloads: Readonly<Record<DocLang, readonly string[]>>;
}

export interface DocsHead {
  readonly title: string;
  readonly description: string;
  /** Absolute canonical URL; omitted on noindex pages. */
  readonly canonical?: string;
  readonly alternates?: { readonly en: string; readonly ar: string };
  readonly robots?: string;
  readonly ogImage: string;
  readonly jsonLd?: readonly object[];
}

export const DOCS_THEME_COLORS = { light: '#1B3A8C', dark: '#0A1222' } as const;
const OG_LOCALE: Record<DocLang, string> = { en: 'en_US', ar: 'ar_EG' };
const SITE_NAME: Record<DocLang, string> = { en: 'Atlas Help Center', ar: 'مركز مساعدة أطلس' };

function meta(attr: 'name' | 'property', key: string, content: string): string {
  return `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
}

export function renderDocsDocument(input: {
  readonly lang: DocLang;
  readonly head: DocsHead;
  readonly assets: DocsAssets;
  readonly bodyHtml: string;
  /** Analytics page template (beacon closed vocabulary), e.g. `docs:article`. */
  readonly page: string;
}): string {
  const { lang, head, assets } = input;
  const noindex = /\bnoindex\b/.test(head.robots ?? '');
  const lines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(head.title)}</title>`,
    meta('name', 'description', head.description),
  ];
  if (!noindex && head.canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtml(head.canonical)}">`);
    if (head.alternates) {
      lines.push(
        `<link rel="alternate" hreflang="en" href="${escapeHtml(head.alternates.en)}">`,
        `<link rel="alternate" hreflang="ar" href="${escapeHtml(head.alternates.ar)}">`,
        `<link rel="alternate" hreflang="x-default" href="${escapeHtml(head.alternates.en)}">`,
      );
    }
  }
  if (head.robots) lines.push(meta('name', 'robots', head.robots));
  lines.push(
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${DOCS_THEME_COLORS.light}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${DOCS_THEME_COLORS.dark}">`,
    '<meta name="color-scheme" content="light dark">',
    `<script src="${escapeHtml(assets.themeScript)}"></script>`,
  );
  for (const href of assets.fontPreloads[lang]) {
    lines.push(`<link rel="preload" href="${escapeHtml(href)}" as="font" type="font/woff2" crossorigin>`);
  }
  for (const href of assets.stylesheets) lines.push(`<link rel="stylesheet" href="${escapeHtml(href)}">`);
  for (const href of assets.modulePreloads) lines.push(`<link rel="modulepreload" href="${escapeHtml(href)}">`);
  for (const src of assets.moduleScripts) lines.push(`<script type="module" src="${escapeHtml(src)}"></script>`);
  lines.push(
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', SITE_NAME[lang]),
    meta('property', 'og:title', head.title),
    meta('property', 'og:description', head.description),
    ...(noindex || !head.canonical ? [] : [meta('property', 'og:url', head.canonical)]),
    meta('property', 'og:image', head.ogImage),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:locale', OG_LOCALE[lang]),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', head.title),
    meta('name', 'twitter:description', head.description),
    meta('name', 'twitter:image', head.ogImage),
  );
  for (const block of head.jsonLd ?? []) {
    lines.push(`<script type="application/ld+json">${serializeJsonLd(block)}</script>`);
  }
  return [
    '<!doctype html>',
    `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`,
    '<head>',
    lines.join('\n'),
    '</head>',
    `<body class="doc" data-mkt-page="${escapeHtml(input.page)}">${input.bodyHtml}</body>`,
    '</html>',
    '',
  ].join('\n');
}
