/**
 * Live Session form validation.
 *
 * FRONTEND VALIDATION IS FOR UX ONLY. Every rule here is enforced again by
 * the API (`CreateLiveSessionDto` + `LiveSessionService.assertValidSchedule`),
 * which is the authority — a caller with `curl` gets the same refusal. The
 * point of duplicating it is to tell the instructor before they submit,
 * not to be the control.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

/** Mirrors the backend's own bounds so the two cannot quietly disagree. */
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 12 * 60;
/** B5 (UX audit) — the backend refuses a start more than 60 s in the past. */
export const PAST_START_GRACE_MS = 60_000;
export const SESSION_TITLE_MAX = 200;
export const SESSION_DESCRIPTION_MAX = 2000;

export interface LiveSessionSchemaOptions {
  /**
   * The start the session already has (`datetime-local` value), when
   * editing. An unchanged start is never refused for being in the past —
   * the backend checks only a CHANGED start, so editing the title of a
   * session that has started is still allowed.
   */
  readonly originalStart?: string;
  /** For tests. */
  readonly now?: () => number;
}

export const createLiveSessionFormSchema = (
  options: LiveSessionSchemaOptions = {}
) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, { message: 'validation:required' })
        .max(SESSION_TITLE_MAX, {
          message: validationMessage('validation:maxLength', {
            count: SESSION_TITLE_MAX,
          }),
        }),
      description: z
        .string()
        .trim()
        .max(SESSION_DESCRIPTION_MAX, {
          message: validationMessage('validation:maxLength', {
            count: SESSION_DESCRIPTION_MAX,
          }),
        })
        .optional()
        .or(z.literal('')),
      scheduledStartAt: z.string().min(1, { message: 'validation:required' }),
      scheduledEndAt: z.string().min(1, { message: 'validation:required' }),
      recordingEnabled: z.boolean(),
    })
    // Cross-field rules live in `superRefine` for the same reason they live
    // in the service rather than the DTO on the backend: a rule split across
    // two places is a rule nobody can find.
    .superRefine((data, ctx) => {
      const start = new Date(data.scheduledStartAt);
      const end = new Date(data.scheduledEndAt);

      if (
        !Number.isNaN(start.getTime()) &&
        data.scheduledStartAt !== options.originalStart &&
        start.getTime() < (options.now ?? Date.now)() - PAST_START_GRACE_MS
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledStartAt'],
          message: 'liveSessions:validation.startInPast',
        });
      }

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      if (end.getTime() <= start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledEndAt'],
          message: 'liveSessions:validation.endBeforeStart',
        });
        return;
      }

      const minutes = (end.getTime() - start.getTime()) / 60_000;
      if (minutes < MIN_SESSION_MINUTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledEndAt'],
          message: 'liveSessions:validation.tooShort',
        });
      }
      if (minutes > MAX_SESSION_MINUTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduledEndAt'],
          message: 'liveSessions:validation.tooLong',
        });
      }
    });

/** The schema for a new session (no original start). */
export const liveSessionFormSchema = createLiveSessionFormSchema();

export type LiveSessionFormData = z.infer<typeof liveSessionFormSchema>;
