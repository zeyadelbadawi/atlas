/**
 * Section configuration validation schemas.
 *
 * One schema per `SectionType`, matching `SectionConfigMap` exactly. The
 * Section Editor resolves the right schema by type — see
 * `getSectionConfigSchema` — never a single loose "anything goes" schema.
 *
 * Phase 6 (Bilingual Academy Websites) — every field a website VISITOR
 * reads as copy is `LocalizedText { en, ar }`, matching the backend's
 * `section-config.schemas.ts` field for field (see that file's own doc
 * comment for the full reasoning: which fields were widened, which were
 * deliberately left as plain scalars, and why `en` is required while `ar`
 * may be blank). Every one of these schemas also accepts a bare legacy
 * string via `coerceLegacyLocalized`, so a page saved before this phase
 * still loads into the editor correctly (as pre-existing English content
 * with Arabic not yet translated), never as a validation error.
 */
import { z } from 'zod';
import { FEATURE_ICON_OPTIONS, MAX_SECTION_ITEMS } from '../constants/website.constants';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import type { SectionType } from '@types';

const MAX_SHORT_TEXT = 100;
const MAX_LONG_TEXT = 2000;

/** Matches the backend's identically-named helper (`section-config.schemas.ts`) exactly. Exported so `website.schemas.ts` (header/footer/navigation/page SEO) applies the exact same widening rule. */
export function coerceLegacyLocalized(value: unknown): unknown {
  return typeof value === 'string' ? { en: value, ar: '' } : value;
}

/** `en` required non-empty; `ar` may be blank — an incomplete translation degrades to `en` at render time (`resolveLocalizedText`), it never blocks a save. */
export const localizedRequired = (maxLength: number) =>
  z.preprocess(
    coerceLegacyLocalized,
    z.object({
      en: z.string().min(1, 'validation:required').max(maxLength, 'validation:maxLength'),
      ar: z.string().max(maxLength, 'validation:maxLength'),
    })
  );

/** Neither key is required to be non-empty — matches the field's own plain-string equivalent already being optional content. */
export const localizedOptional = (maxLength: number) =>
  z.preprocess(
    coerceLegacyLocalized,
    z.object({
      en: z.string().max(maxLength, 'validation:maxLength'),
      ar: z.string().max(maxLength, 'validation:maxLength'),
    })
  );

/** `url` is checked against `isSafeExternalUrl` (never `javascript:`/`data:`/etc.) in addition to being syntactically a URL — see that util's doc comment. */
const websiteCtaSchema = z.object({
  label: localizedRequired(MAX_SHORT_TEXT),
  pageId: z.string().optional(),
  courseId: z.string().optional(),
  url: z
    .string()
    .url('validation:invalidUrl')
    .refine(isSafeExternalUrl, { message: 'validation:invalidUrl' })
    .optional()
    .or(z.literal('')),
});

export const heroSectionSchema = z.object({
  eyebrow: localizedOptional(MAX_SHORT_TEXT).optional(),
  title: localizedRequired(MAX_SHORT_TEXT),
  subtitle: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  image: z.string().optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  cta: websiteCtaSchema.optional(),
  secondaryCta: websiteCtaSchema.optional(),
});

export const aboutSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  body: localizedRequired(MAX_LONG_TEXT),
  image: z.string().optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
});

export const featuredCoursesSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  mode: z.enum(['latest', 'selected']),
  courseIds: z.array(z.string()).optional(),
  layout: z.enum(['grid', 'carousel']),
  count: z.number().int().min(1).max(MAX_SECTION_ITEMS),
  showPrice: z.boolean(),
  showInstructor: z.boolean(),
});

const statisticItemSchema = z.object({
  id: z.string(),
  // Phase 6 — the form's `metric` select uses `'none'` as its "no live
  // data" option (Radix `Select` rejects an empty-string item value); this
  // preprocess step is the one place that sentinel is translated back to
  // `undefined` before anything is persisted, matching the "validate at
  // the boundary" rule this schema file already follows.
  metric: z.preprocess(
    (value) => (value === 'none' || value === '' ? undefined : value),
    z.enum(['courses', 'students', 'instructors']).optional()
  ),
  value: localizedRequired(20),
  label: localizedRequired(MAX_SHORT_TEXT),
});

export const statisticsSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  items: z.array(statisticItemSchema).max(MAX_SECTION_ITEMS),
});

const featureItemSchema = z.object({
  id: z.string(),
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT),
  icon: z.enum(FEATURE_ICON_OPTIONS as [string, ...string[]]),
});

export const featuresSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  items: z.array(featureItemSchema).max(MAX_SECTION_ITEMS),
});

const testimonialItemSchema = z.object({
  id: z.string(),
  quote: localizedRequired(MAX_LONG_TEXT),
  authorName: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  authorRole: localizedOptional(MAX_SHORT_TEXT).optional(),
  avatar: z.string().optional(),
  avatarAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
});

export const testimonialsSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  items: z.array(testimonialItemSchema).max(MAX_SECTION_ITEMS),
  /** References into the Prompt 10 Testimonial content library — see `TestimonialsSectionConfig.libraryEntryIds`'s doc comment. */
  libraryEntryIds: z.array(z.string()).max(MAX_SECTION_ITEMS).optional(),
});

const faqItemSchema = z.object({
  id: z.string(),
  question: localizedRequired(MAX_SHORT_TEXT),
  answer: localizedRequired(MAX_LONG_TEXT),
});

export const faqSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  items: z.array(faqItemSchema).max(MAX_SECTION_ITEMS),
  /** References into the Prompt 10 FAQ content library — see `FaqSectionConfig.libraryEntryIds`'s doc comment. */
  libraryEntryIds: z.array(z.string()).max(MAX_SECTION_ITEMS).optional(),
});

export const ctaSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  cta: websiteCtaSchema,
});

export const instructorsSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  count: z.number().int().min(1).max(MAX_SECTION_ITEMS),
});

const galleryImageSchema = z.object({
  id: z.string(),
  image: z.string().min(1, 'validation:required'),
  caption: localizedOptional(MAX_SHORT_TEXT).optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
});

export const gallerySectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  images: z.array(galleryImageSchema).max(MAX_SECTION_ITEMS),
});

export const contactSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  email: z.string().email('validation:invalidEmail').optional().or(z.literal('')),
  phone: z.string().max(30, 'validation:maxLength').optional(),
  address: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  showForm: z.boolean(),
});

const SECTION_SCHEMAS = {
  hero: heroSectionSchema,
  about: aboutSectionSchema,
  featuredCourses: featuredCoursesSectionSchema,
  statistics: statisticsSectionSchema,
  features: featuresSectionSchema,
  testimonials: testimonialsSectionSchema,
  faq: faqSectionSchema,
  cta: ctaSectionSchema,
  instructors: instructorsSectionSchema,
  gallery: gallerySectionSchema,
  contact: contactSectionSchema,
} satisfies Record<SectionType, z.ZodTypeAny>;

/** Resolves the right Zod schema for a section type. The Section Editor's ONE dynamic-form entry point — no section's validation is ever hand-rolled inline in a component. */
export function getSectionConfigSchema(type: SectionType): z.ZodTypeAny {
  return SECTION_SCHEMAS[type];
}
