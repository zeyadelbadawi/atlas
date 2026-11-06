/**
 * Instructor validation schemas.
 *
 * B6 (UX audit) V09/V10/V20 — every number field says what to enter in the
 * app's own words (the forms are `noValidate`, so the browser's English
 * bubble never stands in for them), an empty or non-numeric value included,
 * and the limits are the server's.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

/** Grading feedback limit — the server's (`GradeSubmissionDto`: 4,000). */
export const MAX_GRADING_FEEDBACK_LENGTH = 4000;

/** A submission score: 0–100, stored as `Decimal(5,2)` by the server. */
export const MIN_SUBMISSION_SCORE = 0;
export const MAX_SUBMISSION_SCORE = 100;

/** At most two decimals, compared with a tolerance for float noise. */
export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
}

const SCORE_RANGE = validationMessage('instructor:grading.scoreRange', {
  min: MIN_SUBMISSION_SCORE,
  max: MAX_SUBMISSION_SCORE,
});

/**
 * Grade submission schema.
 *
 * The backend contract (`GradeSubmissionPayload`) allows an undefined
 * score, but the grading form itself requires one — an instructor
 * "grading" a submission without entering a score isn't a real workflow.
 * 92.5 is a valid score (the server keeps two decimals).
 */
export const gradeSubmissionSchema = z.object({
  score: z
    .number({ required_error: SCORE_RANGE, invalid_type_error: SCORE_RANGE })
    .min(MIN_SUBMISSION_SCORE, SCORE_RANGE)
    .max(MAX_SUBMISSION_SCORE, SCORE_RANGE)
    .refine(hasAtMostTwoDecimals, SCORE_RANGE),
  feedback: z
    .string()
    .max(
      MAX_GRADING_FEEDBACK_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_GRADING_FEEDBACK_LENGTH,
      })
    )
    .optional(),
});

export type GradeSubmissionFormData = z.infer<typeof gradeSubmissionSchema>;

/* ---------- P64 Phase 3 — attempt review, overrides ---------- */

/** Maximum length for a void or override reason — a generous cap, not a backend rule. */
export const MAX_REVIEW_REASON_LENGTH = 500;

export const MIN_TIME_MULTIPLIER = 1;
export const MAX_TIME_MULTIPLIER = 4;
export const TIME_MULTIPLIER_STEP = 0.25;

/**
 * Per-student override form. Dates are `datetime-local` strings here; the
 * page converts them to ISO before calling the service.
 */
const MULTIPLIER_RANGE = 'instructor:quizResults.overrides.timeMultiplierRange';
const EXTRA_ATTEMPTS = 'instructor:quizResults.overrides.extraAttemptsRange';

export const quizOverrideSchema = z
  .object({
    studentId: z
      .string()
      .min(1, 'instructor:quizResults.overrides.studentRequired'),
    // The server keeps the multiplier as `Decimal(4,2)`.
    timeMultiplier: z
      .number({
        required_error: MULTIPLIER_RANGE,
        invalid_type_error: MULTIPLIER_RANGE,
      })
      .min(MIN_TIME_MULTIPLIER, MULTIPLIER_RANGE)
      .max(MAX_TIME_MULTIPLIER, MULTIPLIER_RANGE)
      .refine(hasAtMostTwoDecimals, MULTIPLIER_RANGE),
    extraAttempts: z
      .number({
        required_error: EXTRA_ATTEMPTS,
        invalid_type_error: EXTRA_ATTEMPTS,
      })
      .int(EXTRA_ATTEMPTS)
      .min(0, EXTRA_ATTEMPTS),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional(),
    reason: z
      .string()
      .max(
        MAX_REVIEW_REASON_LENGTH,
        'instructor:quizResults.overrides.reasonTooLong'
      )
      .optional(),
  })
  .refine(
    (data) =>
      !data.availableFrom ||
      !data.availableUntil ||
      new Date(data.availableUntil) > new Date(data.availableFrom),
    {
      message: 'instructor:quizResults.overrides.windowOrder',
      path: ['availableUntil'],
    }
  )
  // B6 (UX audit) V18 — a window that has already ended gives the student
  // nothing; it used to save without a word.
  .refine(
    (data) =>
      !data.availableUntil ||
      Number.isNaN(new Date(data.availableUntil).getTime()) ||
      new Date(data.availableUntil).getTime() > Date.now(),
    {
      message: 'instructor:quizResults.overrides.windowEnded',
      path: ['availableUntil'],
    }
  );

export type QuizOverrideFormData = z.infer<typeof quizOverrideSchema>;

/** Voiding an attempt always needs a reason — it is audited (§I). */
export const voidAttemptSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'instructor:attemptReview.void.reasonRequired')
    .max(
      MAX_REVIEW_REASON_LENGTH,
      'instructor:attemptReview.void.reasonTooLong'
    ),
});

export type VoidAttemptFormData = z.infer<typeof voidAttemptSchema>;

/**
 * Manual grades: one points field per question that needs a manual
 * grade, each capped at that question's own points. Built per attempt
 * because the question set — and every cap — comes from the data.
 *
 * B6 (UX audit):
 *   V03 whole points only — the server's `@IsInt`; 7.5 used to pass here
 *       and come back as a generic failure;
 *   V27 grading can be saved in parts — the server merges what it gets
 *       with the grades already saved and finalises once all are in — so
 *       an empty field is allowed, unless that question already has a
 *       saved grade (clearing it would not remove it on the server);
 *       at least one grade must be entered.
 */
export interface ManualGradeRule {
  readonly max: number;
  /** Already graded on the server: may change, not be cleared. */
  readonly saved: boolean;
}

export const MANUAL_GRADES_EMPTY =
  'instructor:attemptReview.grading.noneEntered';

function pointsRange(max: number): string {
  return validationMessage('instructor:attemptReview.grading.pointsRange', {
    max,
  });
}

export function buildManualGradesSchema(
  rules: Readonly<Record<string, ManualGradeRule>>
) {
  return z
    .object({
      grades: z.object(
        Object.fromEntries(
          Object.entries(rules).map(([questionId, { max, saved }]) => {
            const message = pointsRange(max);
            const points = z
              .number({ required_error: message, invalid_type_error: message })
              .int(message)
              .min(0, message)
              .max(max, message);
            return [questionId, saved ? points : points.optional()];
          })
        )
      ),
    })
    .superRefine((data, context) => {
      const entered = Object.values(data.grades).some(
        (value) => typeof value === 'number'
      );
      const first = Object.keys(rules)[0];
      if (!entered && first) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: MANUAL_GRADES_EMPTY,
          path: ['grades', first],
        });
      }
    });
}

export interface ManualGradesFormData {
  grades: Record<string, number | undefined>;
}
