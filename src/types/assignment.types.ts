/**
 * Assignment domain types (student-facing).
 *
 * Authoring payloads live here too. P64 Phase 3 (§D.4, S12) adds drafts,
 * the late policy, the protected attachment and the grade the learner
 * sees once a reviewer has entered it.
 */

import type { AssessmentLatePolicy } from './quiz.types';

/** Whether an assignment is visible to students. */
export type AssignmentStatus = 'draft' | 'published';

/** Assignment entity. */
export interface Assignment {
  readonly id: string;
  readonly courseId: string;
  readonly sectionId?: string;
  readonly lessonId?: string;
  readonly title: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly status: AssignmentStatus;
  /** Present only when the backend contract defines a due date. */
  readonly dueAt?: string;
  readonly allowResubmission: boolean;
  /** P64 Phase 3 (S12): what happens to a submission after `dueAt`. */
  readonly latePolicy: AssessmentLatePolicy;
  /** P64 Phase 3 (AD-11): counts towards the course completion rule. */
  readonly requiredForCompletion: boolean;
}

/** A submission's lifecycle status. */
export type AssignmentSubmissionStatus =
  'draft' | 'submitting' | 'submitted' | 'failed';

export type AssignmentGradingStatus = 'ungraded' | 'graded';

/**
 * P64 Phase 3 (§D.4): a protected attachment. `url` is a short-lived
 * signed link minted for whoever asked — never a storage key, never a
 * public path — and `expiresAt` says when a fresh read is needed.
 */
export interface SubmissionAttachment {
  readonly assetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly url: string;
  readonly expiresAt: string;
}

/** What the attachment upload answers with: the asset to reference at submit time, no URL. */
export interface SubmissionAttachmentUpload {
  readonly assetId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface SubmissionGrade {
  readonly score: number | null;
  readonly feedback: string | null;
  readonly gradedAt: string | null;
}

/** A student's submission for one assignment. */
export interface AssignmentSubmission {
  readonly id: string;
  readonly assignmentId: string;
  readonly studentId: string;
  readonly status: AssignmentSubmissionStatus;
  readonly response?: string;
  /** Pre-Phase-3 public attachment URL, kept for old rows. */
  readonly attachmentUrl?: string;
  readonly attachment: SubmissionAttachment | null;
  readonly submittedAt?: string;
  readonly isLate: boolean;
  readonly draftResponse: string | null;
  readonly draftSavedAt: string | null;
  readonly submittedRevision: number;
  readonly gradingStatus: AssignmentGradingStatus;
  /** Present once graded; the learner sees it too (§D.4). */
  readonly grade: SubmissionGrade | null;
}

/** Submission creation/resubmission payload. */
export interface CreateAssignmentSubmissionPayload {
  readonly response?: string;
  /** The student's own protected asset, from `uploadSubmissionAttachment`. */
  readonly attachmentAssetId?: string;
  /**
   * Academy offline — this submit action's id, the same on every retry
   * (including one sent later from the offline outbox): the server returns
   * the original submission instead of submitting again.
   */
  readonly idempotencyKey?: string;
  /** The `submittedRevision` the learner saw; a server past it refuses (409) rather than re-applies. */
  readonly baseRevision?: number;
}

/** P64 Phase 3 — draft autosave. `attachmentAssetId: null` detaches. */
export interface SaveAssignmentDraftPayload {
  readonly response?: string;
  readonly attachmentAssetId?: string | null;
  /** Academy offline — compare-and-set base: the `draftSavedAt` this text started from (`null` = none). */
  readonly baseDraftSavedAt?: string | null;
}

/** Assignment AUTHORING payload (Phase 4) — reached only by an Owner/Manager/course-assigned Instructor. */
export interface CreateAssignmentPayload {
  readonly title: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly sectionId?: string;
  readonly lessonId?: string;
  readonly status?: AssignmentStatus;
  readonly dueAt?: string;
  readonly allowResubmission?: boolean;
  readonly latePolicy?: AssessmentLatePolicy;
  readonly requiredForCompletion?: boolean;
}

/** Assignment update payload — a general field update, matching `UpdateCoursePayload`'s own shape. */
export interface UpdateAssignmentPayload {
  readonly title?: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly sectionId?: string;
  readonly lessonId?: string;
  readonly status?: AssignmentStatus;
  readonly dueAt?: string;
  readonly allowResubmission?: boolean;
  readonly latePolicy?: AssessmentLatePolicy;
  readonly requiredForCompletion?: boolean;
}
