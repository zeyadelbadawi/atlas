/**
 * Announcement validation schemas.
 */
import { z } from 'zod';

export const MAX_ANNOUNCEMENT_TITLE_LENGTH = 150;
export const MAX_ANNOUNCEMENT_BODY_LENGTH = 5000;

export const announcementSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ANNOUNCEMENT_TITLE_LENGTH, 'validation:maxLength'),
  body: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ANNOUNCEMENT_BODY_LENGTH, 'validation:maxLength'),
  /** Local `datetime-local` input value; converted to ISO on submit. */
  scheduledAt: z.string().optional(),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
