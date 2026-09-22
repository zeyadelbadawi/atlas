/**
 * Instructor validation schemas.
 */
import { z } from 'zod';

/** Maximum length for grading feedback — a generous cap, not a backend rule. */
export const MAX_GRADING_FEEDBACK_LENGTH = 2000;

/**
 * Grade submission schema.
 *
 * The backend contract (`GradeSubmissionPayload`) allows an undefined
 * score, but the grading form itself requires one — an instructor
 * "grading" a submission without entering a score isn't a real workflow.
 */
export const gradeSubmissionSchema = z.object({
  score: z
    .number({ invalid_type_error: 'validation:required' })
    .min(0, 'validation:min')
    .max(100, 'validation:max'),
  feedback: z
    .string()
    .max(MAX_GRADING_FEEDBACK_LENGTH, 'validation:maxLength')
    .optional(),
});

export type GradeSubmissionFormData = z.infer<typeof gradeSubmissionSchema>;

/* ---------- P64 Phase 3 — attempt review, overrides ---------- */

/** Maximum length for a void or override reason — a generous cap, not a backend rule. */
export const MAX_REVIEW_REASON_LENGTH = 500;

export const MIN_TIME_MULTIPLIER = 1;
export const MAX_TIME_MULTIPLIER = 5;
export const TIME_MULTIPLIER_STEP = 0.25;

/**
 * Per-student override form. Dates are `datetime-local` strings here; the
 * page converts them to ISO before calling the service.
 */
export const quizOverrideSchema = z
  .object({
    studentId: z
      .string()
      .min(1, 'instructor:quizResults.overrides.studentRequired'),
    timeMultiplier: z
      .number({ invalid_type_error: 'validation:number' })
      .min(
        MIN_TIME_MULTIPLIER,
        'instructor:quizResults.overrides.timeMultiplierRange'
      )
      .max(
        MAX_TIME_MULTIPLIER,
        'instructor:quizResults.overrides.timeMultiplierRange'
      ),
    extraAttempts: z
      .number({ invalid_type_error: 'validation:numeric.count' })
      .int('validation:numeric.count')
      .min(0, 'validation:numeric.count'),
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
 */
export function buildManualGradesSchema(
  maxPointsByQuestion: Readonly<Record<string, number>>
) {
  return z.object({
    grades: z.object(
      Object.fromEntries(
        Object.entries(maxPointsByQuestion).map(([questionId, max]) => [
          questionId,
          z
            .number({ invalid_type_error: 'validation:number' })
            .min(0, 'instructor:attemptReview.grading.pointsRange')
            .max(max, 'instructor:attemptReview.grading.pointsRange'),
        ])
      )
    ),
  });
}

export interface ManualGradesFormData {
  grades: Record<string, number>;
}
