/**
 * Assignment domain types (student-facing).
 *
 * Assignment authoring and grading workflows are out of scope — these types
 * only cover a student viewing an assignment and submitting a response.
 */

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
}

/** A submission's lifecycle status. */
export type AssignmentSubmissionStatus =
  | 'draft'
  | 'submitting'
  | 'submitted'
  | 'failed';

/** A student's submission for one assignment. */
export interface AssignmentSubmission {
  readonly id: string;
  readonly assignmentId: string;
  readonly studentId: string;
  readonly status: AssignmentSubmissionStatus;
  readonly response?: string;
  /** URL of an attached file, produced through the existing upload abstraction. */
  readonly attachmentUrl?: string;
  readonly submittedAt?: string;
}

/** Submission creation/resubmission payload. */
export interface CreateAssignmentSubmissionPayload {
  readonly response?: string;
  readonly attachmentUrl?: string;
}
