/**
 * The server-rendered document links the page's theme stylesheet in
 * FRONT of the app's own, so theme rules keep losing to Tailwind utilities
 * of equal specificity (theme-stylesheets.ts).
 */
import { describe, expect, it } from 'vitest';
import { buildSsrDocument, type SsrDocumentParts } from './ssr-document';

const TEMPLATE = `<!doctype html><html lang="en"><head>
<title>Atlas</title>
<script type="module" crossorigin src="/assets/index-a.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-b.css">
<link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">
</head><body><div id="root"></div></body></html>`;

const THEME_LINK =
  '<link rel="stylesheet" crossorigin href="/assets/atelier.stylesheet-c.css" data-theme-stylesheet="atelier">';

const parts = (
  overrides: Partial<SsrDocumentParts> = {}
): SsrDocumentParts => ({
  locale: 'en',
  direction: 'ltr',
  headHtml: '',
  preloadHtml: '',
  appHtml: '<main>page</main>',
  payloadJson: '{}',
  ...overrides,
});

describe('buildSsrDocument — theme stylesheets', () => {
  it('links the theme stylesheet immediately before the app stylesheet', () => {
    const html = buildSsrDocument(
      TEMPLATE,
      parts({ themeStylesheetHtml: THEME_LINK })
    );
    expect(html).toContain(
      `${THEME_LINK}<link rel="stylesheet" crossorigin href="/assets/index-b.css">`
    );
    expect(html.match(/rel="stylesheet"/g)).toHaveLength(2);
  });

  it('adds nothing for a theme without a stylesheet', () => {
    const html = buildSsrDocument(TEMPLATE, parts({ themeStylesheetHtml: '' }));
    expect(html.match(/rel="stylesheet"/g)).toHaveLength(1);
  });

  it('falls back to the end of the head when the template links no stylesheet', () => {
    const html = buildSsrDocument(
      TEMPLATE.replace(/<link rel="stylesheet"[^>]*>/, ''),
      parts({ themeStylesheetHtml: THEME_LINK })
    );
    expect(html).toContain(`${THEME_LINK}</head>`);
  });
});
