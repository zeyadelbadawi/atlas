/**
 * Assignment Service (student-facing).
 *
 * Reads assignments belonging to a course and manages the current
 * student's own submission. Assignment authoring and grading stay out of
 * scope. Nested under the same flat `courses/:courseId/...` tree as
 * `ProgressService`/`QuizService`.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  Assignment,
  AssignmentSubmission,
  CreateAssignmentSubmissionPayload,
  PaginatedResult,
} from '@types';

export class AssignmentService extends BaseService {
  protected readonly resource = 'courses';

  /** Retrieves the assignments belonging to a course. */
  async getAssignments(
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<Assignment>> {
    return this.client.get<PaginatedResult<Assignment>>(
      this.path(courseId, 'assignments'),
      options
    );
  }

  /** Retrieves a single assignment. */
  async getAssignment(
    courseId: string,
    assignmentId: string,
    options?: ReadOptions
  ): Promise<Assignment> {
    return this.client.get<Assignment>(
      this.path(courseId, 'assignments', assignmentId),
      options
    );
  }

  /** Retrieves the current student's submission for an assignment, if any. */
  async getSubmission(
    courseId: string,
    assignmentId: string,
    options?: ReadOptions
  ): Promise<AssignmentSubmission | null> {
    return this.client.get<AssignmentSubmission | null>(
      this.path(courseId, 'assignments', assignmentId, 'submission'),
      options
    );
  }

  /** Creates or replaces the current student's submission. */
  async submitAssignment(
    courseId: string,
    assignmentId: string,
    payload: CreateAssignmentSubmissionPayload,
    options?: WriteOptions
  ): Promise<AssignmentSubmission> {
    return this.client.post<AssignmentSubmission, CreateAssignmentSubmissionPayload>(
      this.path(courseId, 'assignments', assignmentId, 'submission'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const assignmentService = new AssignmentService();
