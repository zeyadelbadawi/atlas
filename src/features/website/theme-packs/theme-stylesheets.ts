/**
 * Theme stylesheets: each theme pack's CSS is its own hashed file, linked
 * only where that theme renders — a Theme 1 site never downloads Atelier's
 * CSS, and the reverse.
 *
 * WHY LINKS, AND WHY BEFORE THE ENTRY STYLESHEET. A theme's rules must lose
 * to Tailwind utilities of equal specificity (e.g. `.t1-lead`'s `65ch`
 * measure must not beat `max-w-xl`), which they do by coming earlier in
 * the cascade: they were in the entry stylesheet before `index.css`
 * (Reports/LCP_ROOT_CAUSE.md §8). A stylesheet Vite attaches to a lazy
 * chunk is appended AFTER `index.css`, so instead each theme's CSS is
 * emitted as a plain asset (`?url`) and linked here, in front of the app's
 * own stylesheet:
 *   - by the server renderer, in the document head
 *     (`themeStylesheetLinksHtml`), render-blocking, so a server-rendered
 *     page is styled at first paint;
 *   - in the browser (`ensureThemeStylesheets`), before a theme renders.
 *     A link the server already wrote is reused, never duplicated.
 *
 * The theme modules' own `import './x.css'` statements are no-ops in the
 * build (`themeStylesheetsAsLinks` in vite.config.ts): that is what keeps
 * the CSS out of the chunks, so these links are its only delivery.
 */
import type { WebsiteThemeKey } from '@types';
import modernEducationStylesheet from '../modern-education/modern-education.css?url';
import atelierStylesheet from '../atelier/atelier.stylesheet.css?url';
import manaraStylesheet from '../manara/manara.stylesheet.css?url';
import riwaqStylesheet from '../riwaq/riwaq.stylesheet.css?url';

/**
 * The stylesheets of the themes that have their own, in cascade order
 * (when a dashboard shows several themes, Theme 1's comes first, as it did
 * in the entry stylesheet). The retired themes (base pack) have none.
 */
export const THEME_STYLESHEETS: Readonly<
  Partial<Record<WebsiteThemeKey, readonly string[]>>
> = {
  'modern-education': [modernEducationStylesheet],
  atelier: [atelierStylesheet],
  manara: [manaraStylesheet],
  riwaq: [riwaqStylesheet],
};

/** The attribute that marks a theme stylesheet link (value: the theme key). */
export const THEME_STYLESHEET_ATTRIBUTE = 'data-theme-stylesheet';

const THEME_ORDER = Object.keys(THEME_STYLESHEETS) as WebsiteThemeKey[];

/** The themes in `keys` that have a stylesheet, in cascade order, once each. */
function themesWithStylesheets(
  keys: Iterable<WebsiteThemeKey>
): WebsiteThemeKey[] {
  const wanted = new Set(keys);
  return THEME_ORDER.filter((key) => wanted.has(key));
}

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** `<link rel="stylesheet">` tags for these themes, for a document head. */
export function themeStylesheetLinksHtml(
  keys: Iterable<WebsiteThemeKey>
): string {
  return themesWithStylesheets(keys)
    .flatMap((key) =>
      (THEME_STYLESHEETS[key] ?? []).map(
        (href) =>
          `<link rel="stylesheet" crossorigin href="${escapeAttribute(href)}" ${THEME_STYLESHEET_ATTRIBUTE}="${key}">`
      )
    )
    .join('');
}

/** One promise per stylesheet this document has (or is) loading. */
const stylesheetLoads = new Map<string, Promise<void>>();

function findStylesheetLink(href: string): HTMLLinkElement | undefined {
  return Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  ).find((link) => link.getAttribute('href') === href);
}

/**
 * Where a theme's link goes: before the app's own first stylesheet (the
 * entry's `index.css` link in a build; its `<style>` elements in
 * development), or before a theme that comes later in cascade order.
 */
function insertionPoint(key: WebsiteThemeKey): Element | null {
  const order = THEME_ORDER.indexOf(key);
  const candidates = document.head.querySelectorAll(
    'link[rel="stylesheet"], style'
  );
  for (const element of Array.from(candidates)) {
    const theme = element.getAttribute(THEME_STYLESHEET_ATTRIBUTE);
    if (!theme) return element;
    if (THEME_ORDER.indexOf(theme as WebsiteThemeKey) > order) return element;
  }
  return null;
}

function linkStylesheet(key: WebsiteThemeKey, href: string): Promise<void> {
  const known = stylesheetLoads.get(href);
  if (known) return known;

  let load: Promise<void>;
  if (findStylesheetLink(href)) {
    // Written by the server renderer: the head's stylesheets have loaded
    // (or failed) before any module script runs.
    load = Promise.resolve();
  } else {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.crossOrigin = '';
    link.href = href;
    link.setAttribute(THEME_STYLESHEET_ATTRIBUTE, key);
    load = new Promise<void>((resolve) => {
      // A failed stylesheet must not keep the theme from rendering.
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
    document.head.insertBefore(link, insertionPoint(key));
  }
  stylesheetLoads.set(href, load);
  return load;
}

/**
 * Links the theme's stylesheet(s) in cascade position and resolves once
 * they have loaded (or failed). Resolves at once for a theme without its
 * own stylesheet, and outside a browser.
 */
export function ensureThemeStylesheets(key: WebsiteThemeKey): Promise<void> {
  const hrefs = THEME_STYLESHEETS[key];
  if (!hrefs?.length || typeof document === 'undefined') {
    return Promise.resolve();
  }
  return Promise.all(hrefs.map((href) => linkStylesheet(key, href))).then(
    () => undefined
  );
}
