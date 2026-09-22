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

export const assignmentAuthoringSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ASSIGNMENT_TITLE_LENGTH, 'validation:maxLength'),
  description: z
    .string()
    .max(MAX_ASSIGNMENT_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  instructions: z
    .string()
    .max(MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH, 'validation:maxLength')
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
