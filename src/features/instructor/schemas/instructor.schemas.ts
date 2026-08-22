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
