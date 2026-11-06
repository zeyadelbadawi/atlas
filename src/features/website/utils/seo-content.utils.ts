/**
 * SEO defaults drawn from what a page already says (SEO/AEO/GEO pass,
 * Nov 2026).
 *
 * A just-published Academy has no SEO fields of its own (provisioning
 * writes `seo: {}`), so every page used to describe itself with the
 * Academy's name alone (`<meta name="description" content="Horizon
 * Academy">`). Search engines then write their own snippet, and answer
 * engines get nothing to quote. These helpers derive the default from the
 * page's own visible copy — its opening section's description (hero or
 * page header), which every theme template writes for every core page —
 * and from the Academy's own description, in the page's language. The
 * owner's own meta description, when set, still wins (`resolvePageSeo`).
 */
import type {
  FaqSectionConfig,
  PublicWebsiteLocale,
  SectionInstance,
  WebsitePage,
} from '@types';
import { resolveLocalizedText } from './localized-text.utils';

/** Google shows roughly this much of a description; longer text is cut at a word. */
export const SEO_DESCRIPTION_MAX_LENGTH = 160;
/** Shorter than this, a page's own sentence is followed by the Academy's description. */
const SEO_DESCRIPTION_MIN_LENGTH = 70;

/** Config fields that hold a section's descriptive sentence, most specific first. */
const DESCRIPTION_FIELDS = ['description', 'subtitle', 'body', 'text'] as const;

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `text` cut to `max` characters at a word boundary, with an ellipsis when cut. */
export function truncateForSnippet(
  text: string,
  max: number = SEO_DESCRIPTION_MAX_LENGTH
): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}

function sectionText(
  section: SectionInstance,
  locale: PublicWebsiteLocale
): string {
  const config = section.config as unknown as Record<string, unknown>;
  for (const field of DESCRIPTION_FIELDS) {
    const value = config?.[field];
    if (
      typeof value === 'string' ||
      (value && typeof value === 'object' && !Array.isArray(value))
    ) {
      const text = plainText(
        resolveLocalizedText(
          value as Parameters<typeof resolveLocalizedText>[0],
          locale
        )
      );
      // Unfilled template placeholders are not copy.
      if (text && !text.includes('{{')) return text;
    }
  }
  return '';
}

/** The page's first visible descriptive sentence (hero or page header), in `locale`. */
export function derivePageDescription(
  page: WebsitePage,
  locale: PublicWebsiteLocale
): string {
  for (const section of page.sections ?? []) {
    if ((section as { visible?: boolean }).visible === false) continue;
    const text = sectionText(section, locale);
    if (text) return text;
  }
  return '';
}

/**
 * The default meta description: the page's own sentence, topped up with
 * the Academy's description when it is short; else the Academy's
 * description; else `generic` (a localized sentence naming the Academy).
 */
export function composeSeoDescription(
  parts: {
    readonly pageText?: string;
    readonly academyDescription?: string;
    readonly generic: string;
  },
  max: number = SEO_DESCRIPTION_MAX_LENGTH
): string {
  const pageText = plainText(parts.pageText ?? '');
  const academyText = plainText(parts.academyDescription ?? '');
  if (pageText) {
    if (
      pageText.length < SEO_DESCRIPTION_MIN_LENGTH &&
      academyText &&
      academyText !== pageText
    ) {
      const joined = /[.!?؟…]$/.test(pageText)
        ? `${pageText} ${academyText}`
        : `${pageText}. ${academyText}`;
      return truncateForSnippet(joined, max);
    }
    return truncateForSnippet(pageText, max);
  }
  if (academyText) return truncateForSnippet(academyText, max);
  return truncateForSnippet(parts.generic, max);
}

export interface PageFaqItem {
  readonly question: string;
  readonly answer: string;
}

/**
 * The questions and answers a page shows, in `locale`, exactly as its FAQ
 * sections draw them on the public site (`FaqSection` and every theme's
 * own): the section's server-resolved library entries first, then its
 * inline items, cut to `maxItems`; each question once.
 */
export function collectPageFaqItems(
  page: WebsitePage,
  locale: PublicWebsiteLocale
): readonly PageFaqItem[] {
  const seen = new Set<string>();
  const items: PageFaqItem[] = [];
  for (const section of page.sections ?? []) {
    if (section.type !== 'faq') continue;
    if ((section as { visible?: boolean }).visible === false) continue;
    const config = section.config as unknown as FaqSectionConfig;
    const all = [
      ...(config.libraryEntries ?? []),
      ...(config.items ?? []),
    ].slice(0, config.maxItems ?? undefined);
    for (const entry of all) {
      const question = plainText(resolveLocalizedText(entry.question, locale));
      const answer = plainText(resolveLocalizedText(entry.answer, locale));
      if (!question || !answer || seen.has(question)) continue;
      seen.add(question);
      items.push({ question, answer });
    }
  }
  return items;
}
