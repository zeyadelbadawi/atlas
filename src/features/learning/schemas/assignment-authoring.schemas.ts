/**
 * Assignment authoring validation schema (Phase 4, extended in P64 Phase 3).
 *
 * P64 Phase 3 (§D.4, AD-11) adds the late policy — what the server does
 * with a submission after `dueAt` — and whether the assignment counts
 * towards the course completion rule. Both are enforced server-side; the
 * schema only keeps the form honest about the allowed values.
 */
import { z } from 'zod';
import {
  MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
  MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH,
  MAX_ASSIGNMENT_TITLE_LENGTH,
} from '../constants/learning.constants';
import { validationMessage } from '@/shared/forms/validation-message';

export const assignmentAuthoringSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ASSIGNMENT_TITLE_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ASSIGNMENT_TITLE_LENGTH,
      })
    ),
  description: z
    .string()
    .max(
      MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
      })
    )
    .optional(),
  instructions: z
    .string()
    .max(
      MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH,
      })
    )
    .optional(),
  status: z.enum(['draft', 'published']),
  /** A `datetime-local` input value (`YYYY-MM-DDTHH:mm`) — converted to/from an ISO timestamp at the page boundary, matching `InstructorAnnouncementsPage`'s own `scheduledAt` convention. */
  dueAt: z.string().optional(),
  allowResubmission: z.boolean(),
  /** `block` rejects submissions after `dueAt`; `accept_flagged` accepts them and marks them late for reviewers. */
  latePolicy: z.enum(['block', 'accept_flagged']),
  /** Whether the course completion rule counts this assignment (AD-11). */
  requiredForCompletion: z.boolean(),
});

export type AssignmentAuthoringFormData = z.infer<
  typeof assignmentAuthoringSchema
>;

/**
 * B3 (UX audit, V21) — a date the author has just set must not already be
 * in the past. An existing date left untouched passes, so editing an old
 * assignment's title is never blocked by its past due date. Values are
 * `datetime-local` strings.
 */
export function isNewPastDate(
  value: string | undefined | null,
  initial: string | undefined | null,
  now: number = Date.now()
): boolean {
  if (!value) return false;
  if (initial && value === initial) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time < now;
}

/**
 * The assignment schema for one dialog opening: `initialDueAt` is the due
 * date the assignment already had (as a `datetime-local` value), which may
 * stay in the past; a new or changed due date must be in the future.
 */
export function assignmentAuthoringSchemaFor(initialDueAt?: string) {
  return assignmentAuthoringSchema.superRefine((data, ctx) => {
    if (isNewPastDate(data.dueAt, initialDueAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:assignmentAuthoring.validation.dueInPast',
        path: ['dueAt'],
      });
    }
  });
}
