/**
 * Section configuration validation schemas.
 *
 * One schema per `SectionType`, matching `SectionConfigMap` exactly. The
 * Section Editor resolves the right schema by type — see
 * `getSectionConfigSchema` — never a single loose "anything goes" schema.
 */
import { z } from 'zod';
import { FEATURE_ICON_OPTIONS, MAX_SECTION_ITEMS } from '../constants/website.constants';
import type { SectionType } from '@types';

const MAX_SHORT_TEXT = 100;
const MAX_LONG_TEXT = 2000;

const websiteCtaSchema = z.object({
  label: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  pageId: z.string().optional(),
  url: z.string().url('validation:invalidUrl').optional().or(z.literal('')),
});

export const heroSectionSchema = z.object({
  title: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  subtitle: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
  image: z.string().optional(),
  cta: websiteCtaSchema.optional(),
  secondaryCta: websiteCtaSchema.optional(),
});

export const aboutSectionSchema = z.object({
  title: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  body: z.string().min(1, 'validation:required').max(MAX_LONG_TEXT, 'validation:maxLength'),
  image: z.string().optional(),
});

export const featuredCoursesSectionSchema = z.object({
  title: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
  mode: z.enum(['latest', 'selected']),
  courseIds: z.array(z.string()).optional(),
  layout: z.enum(['grid', 'carousel']),
  count: z.number().int().min(1).max(MAX_SECTION_ITEMS),
  showPrice: z.boolean(),
  showInstructor: z.boolean(),
});

const statisticItemSchema = z.object({
  id: z.string(),
  value: z.string().min(1, 'validation:required').max(20, 'validation:maxLength'),
  label: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
});

export const statisticsSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  items: z.array(statisticItemSchema).max(MAX_SECTION_ITEMS),
});

const featureItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength'),
  icon: z.enum(FEATURE_ICON_OPTIONS as [string, ...string[]]),
});

export const featuresSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
  items: z.array(featureItemSchema).max(MAX_SECTION_ITEMS),
});

const testimonialItemSchema = z.object({
  id: z.string(),
  quote: z.string().min(1, 'validation:required').max(MAX_LONG_TEXT, 'validation:maxLength'),
  authorName: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  authorRole: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  avatar: z.string().optional(),
});

export const testimonialsSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  items: z.array(testimonialItemSchema).max(MAX_SECTION_ITEMS),
});

const faqItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  answer: z.string().min(1, 'validation:required').max(MAX_LONG_TEXT, 'validation:maxLength'),
});

export const faqSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  items: z.array(faqItemSchema).max(MAX_SECTION_ITEMS),
});

export const ctaSectionSchema = z.object({
  title: z.string().min(1, 'validation:required').max(MAX_SHORT_TEXT, 'validation:maxLength'),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
  cta: websiteCtaSchema,
});

export const instructorsSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
  count: z.number().int().min(1).max(MAX_SECTION_ITEMS),
});

const galleryImageSchema = z.object({
  id: z.string(),
  image: z.string().min(1, 'validation:required'),
  caption: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
});

export const gallerySectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  images: z.array(galleryImageSchema).max(MAX_SECTION_ITEMS),
});

export const contactSectionSchema = z.object({
  title: z.string().max(MAX_SHORT_TEXT, 'validation:maxLength').optional(),
  description: z.string().max(MAX_LONG_TEXT, 'validation:maxLength').optional(),
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
