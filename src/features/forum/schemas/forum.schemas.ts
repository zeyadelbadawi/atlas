/**
 * Forum validation schemas.
 */
import { z } from 'zod';

export const MAX_THREAD_TITLE_LENGTH = 150;
export const MAX_THREAD_BODY_LENGTH = 5000;
export const MAX_REPLY_BODY_LENGTH = 5000;

export const createThreadSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_THREAD_TITLE_LENGTH, 'validation:maxLength'),
  body: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_THREAD_BODY_LENGTH, 'validation:maxLength'),
});

export type CreateThreadFormData = z.infer<typeof createThreadSchema>;

export const createReplySchema = z.object({
  body: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_REPLY_BODY_LENGTH, 'validation:maxLength'),
});

export type CreateReplyFormData = z.infer<typeof createReplySchema>;
