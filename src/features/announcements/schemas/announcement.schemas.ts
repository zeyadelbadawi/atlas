/**
 * Announcement validation schemas.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

export const MAX_ANNOUNCEMENT_TITLE_LENGTH = 150;
export const MAX_ANNOUNCEMENT_BODY_LENGTH = 5000;

export const announcementSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ANNOUNCEMENT_TITLE_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ANNOUNCEMENT_TITLE_LENGTH,
      })
    ),
  body: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ANNOUNCEMENT_BODY_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ANNOUNCEMENT_BODY_LENGTH,
      })
    ),
  /** Local `datetime-local` input value; converted to ISO on submit. */
  scheduledAt: z.string().optional(),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
