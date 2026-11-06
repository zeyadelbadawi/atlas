/**
 * Website validation schemas — page, brand, SEO.
 */
import { z } from 'zod';
import {
  CANONICAL_PATH_REGEX,
  HSL_TRIPLET_REGEX,
  MAX_CANONICAL_PATH_LENGTH,
  MAX_OG_DESCRIPTION_LENGTH,
  MAX_OG_TITLE_LENGTH,
  MAX_PAGE_SLUG_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MAX_SITE_TITLE_LENGTH,
  MIN_PAGE_SLUG_LENGTH,
  PAGE_SLUG_REGEX,
} from '../constants/website.constants';
import { localizedOptional } from './website-section.schemas';
import { validationMessage } from '@/shared/forms/validation-message';

export const createWebsitePageSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_PAGE_TITLE_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_PAGE_TITLE_LENGTH,
      })
    ),
  slug: z
    .string()
    .min(
      MIN_PAGE_SLUG_LENGTH,
      validationMessage('validation:minLength', { count: MIN_PAGE_SLUG_LENGTH })
    )
    .max(
      MAX_PAGE_SLUG_LENGTH,
      validationMessage('validation:maxLength', { count: MAX_PAGE_SLUG_LENGTH })
    )
    .regex(PAGE_SLUG_REGEX, 'validation:invalidSlug'),
});
export type CreateWebsitePageFormData = z.infer<typeof createWebsitePageSchema>;

const canonicalPathSchema = z
  .string()
  .max(
    MAX_CANONICAL_PATH_LENGTH,
    validationMessage('validation:maxLength', {
      count: MAX_CANONICAL_PATH_LENGTH,
    })
  )
  .regex(CANONICAL_PATH_REGEX, 'validation:sitePath')
  .optional()
  .or(z.literal(''));

/** Phase 6 — every title/description a search engine or share preview shows is `LocalizedText`; see `seo-resolution.utils.ts`'s own doc comment for why (`/about` and `/ar/about` are two distinct indexed URLs). */
export const pageSeoSchema = z.object({
  metaTitle: localizedOptional(MAX_SEO_TITLE_LENGTH).optional(),
  metaDescription: localizedOptional(MAX_SEO_DESCRIPTION_LENGTH).optional(),
  ogTitle: localizedOptional(MAX_OG_TITLE_LENGTH).optional(),
  ogDescription: localizedOptional(MAX_OG_DESCRIPTION_LENGTH).optional(),
  canonicalPath: canonicalPathSchema,
  indexable: z.boolean().optional(),
});
export type PageSeoFormData = z.infer<typeof pageSeoSchema>;

/** A full `http(s)://host…` address whose host has a dot (`https://` alone or `https://localhost` is not a site). */
export function isAbsoluteWebAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      /^[^.]+(\.[^.]+)+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * A search-engine ownership token (Google Search Console's
 * `google-site-verification`, Bing's `msvalidate.01`). The owner may paste
 * the whole `<meta ... content="…">` tag those tools hand out; only its
 * `content` is kept. Letters, digits, `-` and `_` only (never markup).
 */
export function normalizeSiteVerificationToken(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const content = /content\s*=\s*["']([^"']*)["']/i.exec(trimmed);
  return (content ? content[1] : trimmed).trim();
}

const siteVerificationToken = z.preprocess(
  normalizeSiteVerificationToken,
  z
    .string()
    .max(128, validationMessage('validation:maxLength', { count: 128 }))
    .regex(/^[A-Za-z0-9_-]*$/, 'validation:invalid')
    .optional()
);

export const globalSeoSchema = z.object({
  siteTitle: localizedOptional(MAX_SITE_TITLE_LENGTH).optional(),
  metaTitle: localizedOptional(MAX_SEO_TITLE_LENGTH).optional(),
  metaDescription: localizedOptional(MAX_SEO_DESCRIPTION_LENGTH).optional(),
  robotsIndexable: z.boolean().optional(),
  sitemapEnabled: z.boolean().optional(),
  /**
   * Not a verified domain (see the field's doc comment in `website.types.ts`),
   * but it composes every canonical link, so it must be a full http(s)
   * address with a real host. B2 (UX audit): "not a url", "example.com" and
   * "ftp://…" used to save with "SEO settings saved".
   */
  canonicalBaseUrl: z
    .string()
    .trim()
    .max(
      MAX_CANONICAL_PATH_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_CANONICAL_PATH_LENGTH,
      })
    )
    .refine(
      (value) => value === '' || isAbsoluteWebAddress(value),
      'validation:absoluteUrl'
    )
    .optional(),
  googleSiteVerification: siteVerificationToken,
  bingSiteVerification: siteVerificationToken,
});
export type GlobalSeoFormData = z.infer<typeof globalSeoSchema>;

const hslColor = z.string().regex(HSL_TRIPLET_REGEX, 'validation:invalidColor');

export const websiteBrandSchema = z.object({
  primaryColor: hslColor,
  secondaryColor: hslColor,
  accentColor: hslColor,
});
export type WebsiteBrandFormData = z.infer<typeof websiteBrandSchema>;
