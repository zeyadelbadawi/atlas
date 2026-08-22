/**
 * Website validation schemas — page, brand, SEO.
 */
import { z } from 'zod';
import {
  HSL_TRIPLET_REGEX,
  MAX_PAGE_SLUG_LENGTH,
  MAX_PAGE_TITLE_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MIN_PAGE_SLUG_LENGTH,
  PAGE_SLUG_REGEX,
} from '../constants/website.constants';

export const createWebsitePageSchema = z.object({
  title: z.string().min(1, 'validation:required').max(MAX_PAGE_TITLE_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(MIN_PAGE_SLUG_LENGTH, 'validation:minLength')
    .max(MAX_PAGE_SLUG_LENGTH, 'validation:maxLength')
    .regex(PAGE_SLUG_REGEX, 'validation:invalidSlug'),
});
export type CreateWebsitePageFormData = z.infer<typeof createWebsitePageSchema>;

export const pageSeoSchema = z.object({
  metaTitle: z.string().max(MAX_SEO_TITLE_LENGTH, 'validation:maxLength').optional(),
  metaDescription: z
    .string()
    .max(MAX_SEO_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
});
export type PageSeoFormData = z.infer<typeof pageSeoSchema>;

export const globalSeoSchema = pageSeoSchema;
export type GlobalSeoFormData = z.infer<typeof globalSeoSchema>;

const hslColor = z.string().regex(HSL_TRIPLET_REGEX, 'validation:invalidColor');

export const websiteBrandSchema = z.object({
  primaryColor: hslColor,
  secondaryColor: hslColor,
  accentColor: hslColor,
});
export type WebsiteBrandFormData = z.infer<typeof websiteBrandSchema>;
