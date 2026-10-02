/**
 * The browser title and the default head tags on an Academy's public site
 * (2 Oct 2026).
 *
 * `index.html` carries Atlas's own `<title>Atlas</title>` and marketing
 * description/Open Graph tags. Only the website pages replaced them
 * (`useDocumentSeo`), so Coming Soon, sign-in, the learner area and the
 * error states of an Academy's site read "Atlas", and the Atlas
 * description stayed beside the Academy's own in the browser. On an
 * Academy host:
 *   - `useAcademyHeadDefaults` (router root) sets the Academy's name as the
 *     baseline title and sets Atlas's static description/Open Graph tags
 *     aside, restoring both when the Academy site unmounts;
 *   - pages with their own title (`useDocumentSeo`, `useAcademyPageTitle`)
 *     set it and fall back to that baseline, never to "Atlas".
 * A server-rendered page already arrives with the Academy's head
 * (`renderSeoHeadHtml`, `buildSsrDocument`).
 */
import { createContext, useContext, useEffect, useRef } from 'react';
import { APP_CONFIG } from '@config';

/** The Academy's name while its public site is mounted, else undefined. */
export const AcademyTitleBaselineContext = createContext<string | undefined>(undefined);

/** Atlas's own head tags in `index.html`, which say nothing about an Academy. */
const ATLAS_DEFAULT_TAGS = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:type"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
]
  .map((selector) => `${selector}:not([data-atlas-seo])`)
  .join(', ');

export function useAcademyHeadDefaults(academyName: string | undefined): void {
  const lastBaseline = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!academyName) return;
    // A page that already set its own title (its effect runs first) keeps
    // it; only the platform default or the previous Academy's baseline is
    // replaced (Academy switching).
    if (
      !document.title ||
      document.title === APP_CONFIG.name ||
      document.title === lastBaseline.current
    ) {
      document.title = academyName;
    }
    lastBaseline.current = academyName;
  }, [academyName]);

  useEffect(() => {
    if (!academyName) return;
    const defaults = Array.from(document.head.querySelectorAll(ATLAS_DEFAULT_TAGS));
    defaults.forEach((node) => node.remove());
    return () => {
      defaults.forEach((node) => document.head.appendChild(node));
      if (document.title === lastBaseline.current) document.title = APP_CONFIG.name;
    };
  }, [academyName]);
}

/** A page's own title; on leaving it, the Academy's name (never "Atlas"). */
export function useAcademyPageTitle(title: string | undefined): void {
  const baseline = useContext(AcademyTitleBaselineContext);
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = baseline ?? previous;
    };
  }, [title, baseline]);
}

/** `Page · Site` — or just one of them when they are the same or one is missing. */
export function composeDocumentTitle(pageTitle: string, siteTitle?: string): string {
  const page = pageTitle.trim();
  const site = siteTitle?.trim();
  if (!site || site === page) return page || site || '';
  if (!page) return site;
  return `${page} · ${site}`;
}
