/**
 * Course validation schemas.
 *
 * All Course forms use Zod for validation to maintain consistency with the
 * existing Atlas form infrastructure.
 */
import { z } from 'zod';
import {
  MAX_COURSE_TITLE_LENGTH,
  MAX_COURSE_SLUG_LENGTH,
  MAX_COURSE_SHORT_DESCRIPTION_LENGTH,
  MAX_COURSE_DESCRIPTION_LENGTH,
  MAX_SECTION_TITLE_LENGTH,
  MAX_SECTION_DESCRIPTION_LENGTH,
  MAX_LESSON_TITLE_LENGTH,
  MAX_LESSON_DESCRIPTION_LENGTH,
} from '../constants/course.constants';

/** Slug validation regex: lowercase letters, numbers, hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Pricing is authored as flat fields (type/amount/currency) since that maps
 * directly to form controls; pages assemble the `CoursePricing` value from it.
 */
const pricingFields = {
  pricingType: z.enum(['free', 'paid']),
  pricingAmount: z.coerce.number().min(0, 'validation:min').optional(),
  pricingCurrency: z.string().optional(),
};

/** Course creation schema. */
export const createCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_COURSE_TITLE_LENGTH, 'validation:maxLength'),
    slug: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_COURSE_SLUG_LENGTH, 'validation:maxLength')
      .regex(SLUG_REGEX, 'validation:invalidSlug'),
    shortDescription: z
      .string()
      .max(MAX_COURSE_SHORT_DESCRIPTION_LENGTH, 'validation:maxLength')
      .optional(),
    description: z
      .string()
      .max(MAX_COURSE_DESCRIPTION_LENGTH, 'validation:maxLength')
      .optional(),
    thumbnail: z.string().optional(),
    categoryId: z.string().optional(),
    visibility: z.enum(['public', 'private']),
    ...pricingFields,
  })
  .refine(
    (data) =>
      data.pricingType !== 'paid' ||
      (typeof data.pricingAmount === 'number' && data.pricingAmount > 0),
    {
      message: 'course:validation.priceRequired',
      path: ['pricingAmount'],
    }
  );

export type CreateCourseFormData = z.infer<typeof createCourseSchema>;

/** Course update schema. */
export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_COURSE_TITLE_LENGTH, 'validation:maxLength'),
    slug: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_COURSE_SLUG_LENGTH, 'validation:maxLength')
      .regex(SLUG_REGEX, 'validation:invalidSlug'),
    shortDescription: z
      .string()
      .max(MAX_COURSE_SHORT_DESCRIPTION_LENGTH, 'validation:maxLength')
      .optional(),
    description: z
      .string()
      .max(MAX_COURSE_DESCRIPTION_LENGTH, 'validation:maxLength')
      .optional(),
    thumbnail: z.string().optional(),
    categoryId: z.string().optional(),
    visibility: z.enum(['public', 'private']),
    ...pricingFields,
  })
  .refine(
    (data) =>
      data.pricingType !== 'paid' ||
      (typeof data.pricingAmount === 'number' && data.pricingAmount > 0),
    {
      message: 'course:validation.priceRequired',
      path: ['pricingAmount'],
    }
  );

export type UpdateCourseFormData = z.infer<typeof updateCourseSchema>;

/** Course settings schema — status/visibility only; identity fields live on the edit page. */
export const courseSettingsSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'private']),
});

export type CourseSettingsFormData = z.infer<typeof courseSettingsSchema>;

/** Course section creation/update schema. */
export const courseSectionSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_SECTION_TITLE_LENGTH, 'validation:maxLength'),
  description: z
    .string()
    .max(MAX_SECTION_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
});

export type CourseSectionFormData = z.infer<typeof courseSectionSchema>;

/** Course lesson creation/update schema. */
export const courseLessonSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_LESSON_TITLE_LENGTH, 'validation:maxLength'),
  description: z
    .string()
    .max(MAX_LESSON_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  contentType: z.enum(['text', 'video', 'file']),
  contentUrl: z
    .string()
    .url('validation:invalidUrl')
    .optional()
    .or(z.literal('')),
  status: z.enum(['draft', 'published']),
});

export type CourseLessonFormData = z.infer<typeof courseLessonSchema>;
