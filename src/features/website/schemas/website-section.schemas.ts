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
import {
  FEATURE_ICON_OPTIONS,
  MAX_CHIP_TEXT,
  MAX_COURSE_CATALOG_PAGE_SIZE,
  MAX_CTA_LABEL_LENGTH,
  MAX_FEATURE_SPLIT_ITEMS,
  MAX_HERO_DESCRIPTION_LENGTH,
  MAX_HERO_EYEBROW_LENGTH,
  MAX_HERO_HIGHLIGHTS,
  MAX_HERO_SUBTITLE_LENGTH,
  MAX_HERO_TITLE_LENGTH,
  MAX_LONG_TEXT,
  MAX_SECTION_ITEMS,
  MAX_SECTION_STEPS,
  MAX_SHORT_TEXT,
  MAX_STATISTIC_LABEL_LENGTH,
  MAX_STATISTIC_VALUE_LENGTH,
  MAX_STATISTICS_TITLE_LENGTH,
  MAX_STEP_DESCRIPTION_LENGTH,
  MAX_STEP_TITLE_LENGTH,
  MAX_STEPS_DESCRIPTION_LENGTH,
  MAX_STEPS_TITLE_LENGTH,
  MIN_COURSE_CATALOG_PAGE_SIZE,
  MIN_COURSE_CATEGORIES,
} from '../constants/website.constants';
import { isAllowedImageValue } from '../utils/image-value.utils';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import { COURSE_CATALOG_SORT_VALUES, type SectionType } from '@types';

/** Matches the backend's identically-named helper (`section-config.schemas.ts`) exactly. Exported so `website.schemas.ts` (header/footer/navigation/page SEO) applies the exact same widening rule. */
export function coerceLegacyLocalized(value: unknown): unknown {
  return typeof value === 'string' ? { en: value, ar: '' } : value;
}

/** `en` required non-empty; `ar` may be blank — an incomplete translation degrades to `en` at render time (`resolveLocalizedText`), it never blocks a save. */
export const localizedRequired = (maxLength: number) =>
  z.preprocess(
    coerceLegacyLocalized,
    z.object({
      en: z
        .string()
        .min(1, 'validation:required')
        .max(maxLength, 'validation:maxLength'),
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

/** `url` is checked against `isSafeExternalUrl` (never `javascript:`/`data:`/etc.) in addition to being syntactically a URL — see that util's doc comment. The label cap applies to every section CTA (hero, FAQ, CTA banner, feature split). */
const websiteCtaSchema = z.object({
  label: localizedRequired(MAX_CTA_LABEL_LENGTH),
  pageId: z.string().optional(),
  courseId: z.string().optional(),
  url: z
    .string()
    .url('validation:invalidUrl')
    .refine(isSafeExternalUrl, { message: 'validation:invalidUrl' })
    .optional()
    .or(z.literal('')),
});

/** Any image field — see `image-value.utils.ts`. */
const imageValueSchema = z
  .string()
  .refine(isAllowedImageValue, { message: 'validation:invalidImage' });

const heroHighlightSchema = z.object({
  id: z.string(),
  label: localizedRequired(MAX_CHIP_TEXT),
});

/** Content limits: see `website.constants.ts` ("Section content limits"). */
export const heroSectionSchema = z.object({
  eyebrow: localizedOptional(MAX_HERO_EYEBROW_LENGTH).optional(),
  title: localizedRequired(MAX_HERO_TITLE_LENGTH),
  subtitle: localizedOptional(MAX_HERO_SUBTITLE_LENGTH).optional(),
  description: localizedOptional(MAX_HERO_DESCRIPTION_LENGTH).optional(),
  image: imageValueSchema.optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  cta: websiteCtaSchema.optional(),
  secondaryCta: websiteCtaSchema.optional(),
  highlight: localizedOptional(MAX_HERO_TITLE_LENGTH).optional(),
  highlights: z.array(heroHighlightSchema).max(MAX_HERO_HIGHLIGHTS).optional(),
  showSearch: z.boolean().optional(),
});

export const aboutSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  body: localizedRequired(MAX_LONG_TEXT),
  image: imageValueSchema.optional(),
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

const statisticItemSchema = z
  .object({
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
    // Theme 1 plan §D.4 — a live item (`metric` set) needs no authored
    // number, so starter content carries none; without `metric` the value
    // is the item and stays required.
    value: localizedOptional(MAX_STATISTIC_VALUE_LENGTH),
    label: localizedRequired(MAX_STATISTIC_LABEL_LENGTH),
  })
  .refine((item) => !!item.metric || item.value.en.trim().length > 0, {
    message: 'validation:required',
    path: ['value', 'en'],
  });

export const statisticsSectionSchema = z.object({
  title: localizedOptional(MAX_STATISTICS_TITLE_LENGTH).optional(),
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
  layout: z.enum(['cards', 'strip']).optional(),
});

const testimonialItemSchema = z.object({
  id: z.string(),
  quote: localizedRequired(MAX_LONG_TEXT),
  authorName: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_SHORT_TEXT, 'validation:maxLength'),
  authorRole: localizedOptional(MAX_SHORT_TEXT).optional(),
  avatar: imageValueSchema.optional(),
  avatarAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  sample: z.boolean().optional(),
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
  maxItems: z.number().int().min(1).max(MAX_SECTION_ITEMS).optional(),
  cta: websiteCtaSchema.optional(),
});

export const ctaSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  cta: websiteCtaSchema,
  secondaryCta: websiteCtaSchema.optional(),
  image: imageValueSchema.optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
});

export const instructorsSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  count: z.number().int().min(1).max(MAX_SECTION_ITEMS),
});

const galleryImageSchema = z.object({
  id: z.string(),
  image: imageValueSchema.pipe(z.string().min(1, 'validation:required')),
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
  email: z
    .string()
    .email('validation:invalidEmail')
    .optional()
    .or(z.literal('')),
  phone: z.string().max(30, 'validation:maxLength').optional(),
  address: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  showForm: z.boolean(),
});

/** P64 Phase 4 §E.1 — see `CourseCatalogSectionConfig`. `pageSize` is bounded by the catalog's own request-size constants, not `MAX_SECTION_ITEMS` (it is a page, not an item list). */
export const courseCatalogSectionSchema = z.object({
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  pageSize: z
    .number()
    .int()
    .min(MIN_COURSE_CATALOG_PAGE_SIZE)
    .max(MAX_COURSE_CATALOG_PAGE_SIZE),
  defaultSort: z.enum(COURSE_CATALOG_SORT_VALUES),
  showSearch: z.boolean(),
  showLevelFilter: z.boolean(),
  showPricingFilter: z.boolean(),
  showSort: z.boolean(),
});

export const pageHeaderSectionSchema = z.object({
  eyebrow: localizedOptional(MAX_SHORT_TEXT).optional(),
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  image: imageValueSchema.optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  search: z.enum(['none', 'courses', 'faq']).optional(),
});

export const courseCategoriesSectionSchema = z.object({
  title: localizedOptional(MAX_SHORT_TEXT).optional(),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  maxItems: z.number().int().min(MIN_COURSE_CATEGORIES).max(MAX_SECTION_ITEMS),
  showCounts: z.boolean(),
});

const stepItemSchema = z.object({
  id: z.string(),
  title: localizedRequired(MAX_STEP_TITLE_LENGTH),
  description: localizedOptional(MAX_STEP_DESCRIPTION_LENGTH).optional(),
});

/** `image`/`imageAlt` validate exactly like `featureSplit`'s; only themes that draw the plate (Atelier) offer them in the editor. */
export const stepsSectionSchema = z.object({
  title: localizedOptional(MAX_STEPS_TITLE_LENGTH).optional(),
  description: localizedOptional(MAX_STEPS_DESCRIPTION_LENGTH).optional(),
  image: imageValueSchema.optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  items: z.array(stepItemSchema).max(MAX_SECTION_STEPS),
});

const featureSplitItemSchema = z.object({
  id: z.string(),
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
});

export const featureSplitSectionSchema = z.object({
  eyebrow: localizedOptional(MAX_SHORT_TEXT).optional(),
  title: localizedRequired(MAX_SHORT_TEXT),
  description: localizedOptional(MAX_LONG_TEXT).optional(),
  image: imageValueSchema.optional(),
  imageAlt: localizedOptional(MAX_SHORT_TEXT).optional(),
  imagePosition: z.enum(['start', 'end']),
  items: z.array(featureSplitItemSchema).max(MAX_FEATURE_SPLIT_ITEMS),
  cta: websiteCtaSchema.optional(),
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
  courseCatalog: courseCatalogSectionSchema,
  pageHeader: pageHeaderSectionSchema,
  courseCategories: courseCategoriesSectionSchema,
  steps: stepsSectionSchema,
  featureSplit: featureSplitSectionSchema,
} satisfies Record<SectionType, z.ZodTypeAny>;

/** Resolves the right Zod schema for a section type. The Section Editor's ONE dynamic-form entry point — no section's validation is ever hand-rolled inline in a component. */
export function getSectionConfigSchema(type: SectionType): z.ZodTypeAny {
  return SECTION_SCHEMAS[type];
}
