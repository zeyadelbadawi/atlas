/**
 * Forum validation schemas.
 *
 * B6 (UX audit) V04/V20 — the limits are the server's
 * (`CreateForumThreadDto`/`CreateForumReplyDto`: title 200, body 10,000),
 * and the text is trimmed first, as the server does: a post of only spaces
 * is refused here with a message instead of being saved as a blank card.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

export const MAX_THREAD_TITLE_LENGTH = 200;
export const MAX_THREAD_BODY_LENGTH = 10000;
export const MAX_REPLY_BODY_LENGTH = 10000;

export const createThreadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'forum:validation.titleRequired')
    .max(
      MAX_THREAD_TITLE_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_THREAD_TITLE_LENGTH,
      })
    ),
  body: z
    .string()
    .trim()
    .min(1, 'forum:validation.bodyRequired')
    .max(
      MAX_THREAD_BODY_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_THREAD_BODY_LENGTH,
      })
    ),
});

export type CreateThreadFormData = z.infer<typeof createThreadSchema>;

export const createReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'forum:validation.replyRequired')
    .max(
      MAX_REPLY_BODY_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_REPLY_BODY_LENGTH,
      })
    ),
});

export type CreateReplyFormData = z.infer<typeof createReplySchema>;
