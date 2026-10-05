/**
 * Font preloads for a server-rendered page's theme (server renderer only).
 *
 * Atelier sets its page heading (the Home hero's `<h1 class="at-display">`,
 * usually the page's LCP element) in its own display face, which the
 * browser otherwise discovers only once Atelier's stylesheet has arrived
 * and the heading matched it. Preloading the face(s) THIS heading uses lets
 * them download alongside the stylesheets. Exactly the faces the heading
 * needs, never more (a preload the page does not use is wasted bandwidth):
 *   - its Latin text (a letter or digit) → Fraunces Latin;
 *   - Latin text inside `<em>` (the highlighted words, set in italic) →
 *     Fraunces Latin Italic;
 *   - its Arabic text → Markazi Text Arabic (Atelier has no Arabic italic:
 *     the highlighted words use the same file).
 * The rarer Latin Extended face is left to the stylesheet.
 *
 * The URLs are content-hashed assets, the same files `atelier.css` names
 * (its `@font-face` rules), so the preload is the request the page uses.
 */
import type { WebsiteThemeKey } from '@types';
import frauncesLatin from '@/assets/fonts/fraunces-latin.woff2?url';
import frauncesLatinItalic from '@/assets/fonts/fraunces-latin-italic.woff2?url';
import markaziTextArabic from '@/assets/fonts/markazi-text-arabic.woff2?url';

/** Heading classes set in Atelier's display face (`atelier.css`). */
const ATELIER_DISPLAY_HEADING = /class="[^"]*\bat-(?:display|title)\b/;
const LATIN = /[A-Za-z0-9À-ÿ]/;
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** The text of some markup: tags and character references removed. */
const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/&[#\w]+;/g, ' ');

function preloadLink(href: string): string {
  return `<link rel="preload" as="font" type="font/woff2" crossorigin href="${href}">`;
}

/** The fonts Atelier's page heading uses, as preload links. */
function atelierHeadingFonts(appHtml: string): string[] {
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(appHtml);
  if (!heading || !ATELIER_DISPLAY_HEADING.test(heading[0])) return [];
  const inner = heading[1];
  const emphasised = [...inner.matchAll(/<em\b[^>]*>([\s\S]*?)<\/em>/g)]
    .map((match) => textOf(match[1]))
    .join(' ');
  const plain = textOf(inner.replace(/<em\b[^>]*>[\s\S]*?<\/em>/g, ' '));
  const fonts: string[] = [];
  if (LATIN.test(plain)) fonts.push(frauncesLatin);
  if (LATIN.test(emphasised)) fonts.push(frauncesLatinItalic);
  if (ARABIC.test(plain) || ARABIC.test(emphasised))
    fonts.push(markaziTextArabic);
  return fonts;
}

/**
 * Preload links for the display fonts the page's heading uses, for the
 * themes the page rendered; `''` for a theme without (Theme 1, Themes 3–6).
 */
export function themeFontPreloadHtml(
  themes: ReadonlySet<WebsiteThemeKey>,
  appHtml: string
): string {
  if (!themes.has('atelier')) return '';
  return atelierHeadingFonts(appHtml).map(preloadLink).join('');
}
