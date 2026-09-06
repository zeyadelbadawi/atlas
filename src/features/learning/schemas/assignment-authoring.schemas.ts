/**
 * Assignment authoring validation schema (Phase 4).
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
});

export type AssignmentAuthoringFormData = z.infer<typeof assignmentAuthoringSchema>;
