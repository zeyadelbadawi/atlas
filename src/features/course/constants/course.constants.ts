/**
 * Course constants.
 */
import type {
  CourseStatus,
  CourseVisibility,
  CoursePricingType,
  CourseLessonContentType,
  CourseLessonStatus,
  CoursePricing,
} from '@types';

/** Course status options. */
export const COURSE_STATUS_OPTIONS: readonly CourseStatus[] = [
  'draft',
  'published',
  'archived',
] as const;

/** Course visibility options. */
export const COURSE_VISIBILITY_OPTIONS: readonly CourseVisibility[] = [
  'public',
  'private',
] as const;

/** Course pricing type options. */
export const COURSE_PRICING_TYPE_OPTIONS: readonly CoursePricingType[] = [
  'free',
  'paid',
] as const;

/** Lesson content type options. */
export const COURSE_LESSON_CONTENT_TYPE_OPTIONS: readonly CourseLessonContentType[] =
  ['text', 'video', 'file'] as const;

/** Lesson status options. */
export const COURSE_LESSON_STATUS_OPTIONS: readonly CourseLessonStatus[] = [
  'draft',
  'published',
] as const;

/** New courses start unpublished and unlisted until the owner is ready. */
export const DEFAULT_COURSE_STATUS: CourseStatus = 'draft';
export const DEFAULT_COURSE_VISIBILITY: CourseVisibility = 'private';
export const DEFAULT_COURSE_PRICING: CoursePricing = { type: 'free' };
export const DEFAULT_COURSE_PRICING_CURRENCY = 'USD';

/** Maximum course field lengths. */
export const MAX_COURSE_TITLE_LENGTH = 150;
export const MAX_COURSE_SLUG_LENGTH = 100;
export const MAX_COURSE_SHORT_DESCRIPTION_LENGTH = 200;
export const MAX_COURSE_DESCRIPTION_LENGTH = 5000;

/** Maximum section field lengths. */
export const MAX_SECTION_TITLE_LENGTH = 150;
export const MAX_SECTION_DESCRIPTION_LENGTH = 500;

/** Maximum lesson field lengths. */
export const MAX_LESSON_TITLE_LENGTH = 150;
export const MAX_LESSON_DESCRIPTION_LENGTH = 2000;

/** Course thumbnail maximum file size (5MB). */
export const MAX_COURSE_THUMBNAIL_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed thumbnail file types. */
export const ALLOWED_COURSE_THUMBNAIL_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
];
