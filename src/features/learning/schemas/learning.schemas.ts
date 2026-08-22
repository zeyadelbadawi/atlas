/**
 * Student Learning validation schemas.
 */
import { z } from 'zod';
import { MAX_ASSIGNMENT_RESPONSE_LENGTH } from '../constants/learning.constants';

/**
 * Assignment submission schema.
 *
 * At least a written response or an attachment must be provided.
 */
export const assignmentSubmissionSchema = z
  .object({
    response: z
      .string()
      .max(MAX_ASSIGNMENT_RESPONSE_LENGTH, 'validation:maxLength')
      .optional(),
    attachmentUrl: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.response?.trim()) || Boolean(data.attachmentUrl),
    { message: 'validation:required', path: ['response'] }
  );

export type AssignmentSubmissionFormData = z.infer<
  typeof assignmentSubmissionSchema
>;

/**
 * Builds a quiz attempt schema for a specific set of question ids.
 *
 * Quiz questions are only known once loaded from the server, so the
 * "every question must be answered" rule is expressed as a schema factory
 * rather than a static schema — the same dynamic-schema pattern RHF+Zod
 * already supports.
 */
export function buildQuizAttemptSchema(questionIds: readonly string[]) {
  return z.object({
    answers: z.record(z.string(), z.array(z.string())).refine(
      (answers) =>
        questionIds.every((id) => (answers[id]?.length ?? 0) > 0),
      { message: 'validation:required' }
    ),
  });
}

export type QuizAttemptFormData = {
  readonly answers: Record<string, readonly string[]>;
};
