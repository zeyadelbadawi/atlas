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

/** Mirrors the backend's own bounds so the two cannot quietly disagree. */
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 12 * 60;

export const liveSessionFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'validation:required' })
      .max(200, { message: 'validation:maxLength' }),
    description: z
      .string()
      .trim()
      .max(2000, { message: 'validation:maxLength' })
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

export type LiveSessionFormData = z.infer<typeof liveSessionFormSchema>;

/**
 * Zoom connection credentials.
 *
 * Only the API trio is required. The SDK pair and webhook token are
 * optional because an academy can usefully connect without them — what
 * each one unlocks is explained in the form rather than enforced by
 * making every field mandatory.
 *
 * Deliberately NOT format-validated beyond presence and length: Zoom has
 * changed credential formats before, and a clever regex that rejects a
 * valid new-format secret would be indistinguishable from a Zoom outage
 * to the person trying to connect. The backend verifies them against Zoom
 * itself, which is the only check that actually means anything.
 */
export const zoomConnectionSchema = z.object({
  accountId: z
    .string()
    .trim()
    .min(1, { message: 'validation:required' })
    .max(200, { message: 'validation:maxLength' }),
  clientId: z
    .string()
    .trim()
    .min(1, { message: 'validation:required' })
    .max(200, { message: 'validation:maxLength' }),
  clientSecret: z
    .string()
    .trim()
    .min(1, { message: 'validation:required' })
    .max(500, { message: 'validation:maxLength' }),
  sdkKey: z.string().trim().max(200, { message: 'validation:maxLength' }).optional().or(z.literal('')),
  sdkSecret: z.string().trim().max(500, { message: 'validation:maxLength' }).optional().or(z.literal('')),
  webhookSecretToken: z
    .string()
    .trim()
    .max(500, { message: 'validation:maxLength' })
    .optional()
    .or(z.literal('')),
});

export type ZoomConnectionFormData = z.infer<typeof zoomConnectionSchema>;
