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
  /**
   * Local `datetime-local` input value; converted to ISO on submit.
   * B4 (UX audit) V05 — a time already past is refused: the publish sweep
   * would otherwise publish it at once, skipping the publish confirmation.
   */
  scheduledAt: z
    .string()
    .optional()
    .refine((value) => !value || !isScheduleInPast(value), {
      message: 'validation:scheduleInPast',
    }),
});

/** A `datetime-local` value at or before now (a minute's grace for typing). */
export function isScheduleInPast(
  value: string,
  now: Date = new Date()
): boolean {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() < now.getTime() - 60_000;
}

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
