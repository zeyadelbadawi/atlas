/**
 * Website CMS content validation schemas — FAQ and Testimonial library
 * entries (Prompt 10). Real validation happens here, at the domain
 * boundary, exactly like every other Atlas form — the UI's own
 * constraints (`maxLength` attributes etc.) are a convenience, never the
 * enforcement.
 */
import { z } from 'zod';
import {
  MAX_FAQ_ANSWER_LENGTH,
  MAX_FAQ_QUESTION_LENGTH,
  MAX_TESTIMONIAL_AUTHOR_NAME_LENGTH,
  MAX_TESTIMONIAL_AUTHOR_ROLE_LENGTH,
  MAX_TESTIMONIAL_QUOTE_LENGTH,
} from '../constants/website.constants';

/** Both English and Arabic values are required — an entry that only exists in one language would silently disappear when a visitor's locale doesn't match it. */
const localizedText = (maxLength: number) =>
  z.object({
    en: z.string().min(1, 'validation:required').max(maxLength, 'validation:maxLength'),
    ar: z.string().min(1, 'validation:required').max(maxLength, 'validation:maxLength'),
  });

const localizedTextOptional = (maxLength: number) =>
  z.object({
    en: z.string().max(maxLength, 'validation:maxLength'),
    ar: z.string().max(maxLength, 'validation:maxLength'),
  });

export const faqEntrySchema = z.object({
  question: localizedText(MAX_FAQ_QUESTION_LENGTH),
  answer: localizedText(MAX_FAQ_ANSWER_LENGTH),
});
export type FaqEntryFormData = z.infer<typeof faqEntrySchema>;

export const testimonialEntrySchema = z.object({
  quote: localizedText(MAX_TESTIMONIAL_QUOTE_LENGTH),
  authorName: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_TESTIMONIAL_AUTHOR_NAME_LENGTH, 'validation:maxLength'),
  authorRole: localizedTextOptional(MAX_TESTIMONIAL_AUTHOR_ROLE_LENGTH).optional(),
});
export type TestimonialEntryFormData = z.infer<typeof testimonialEntrySchema>;
