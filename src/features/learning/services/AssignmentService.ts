/**
 * Assignment Service — student-facing reads/submission, plus Phase 4
 * authoring and real-file-upload wiring. Nested under the same flat
 * `courses/:courseId/...` tree as `ProgressService`/`QuizService`.
 *
 * `uploadSubmissionAttachment` (Phase 4) replaces the previous
 * `FileReader.readAsDataURL` base64-in-database approach: it uploads a
 * real file through the existing R2 media pipeline and returns a real,
 * permanent URL, to be passed as `attachmentUrl` in the `submitAssignment`
 * call that follows — the same "upload, then reference the resulting URL
 * in an otherwise-ordinary form submission" flow `LessonFormDialog`'s own
 * `MediaLibraryDialog` integration (Phase 0) already established.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  Assignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
  CreateAssignmentSubmissionPayload,
  MediaAssetDetail,
  PaginatedResult,
  UpdateAssignmentPayload,
  UploadMediaAssetPayload,
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

  /** Phase 4 — uploads a real file for the current student's upcoming submission through the existing R2 media pipeline, returning its real, permanent URL. */
  async uploadSubmissionAttachment(
    courseId: string,
    assignmentId: string,
    payload: UploadMediaAssetPayload,
    options?: WriteOptions
  ): Promise<MediaAssetDetail> {
    return this.client.post<MediaAssetDetail, UploadMediaAssetPayload>(
      this.path(courseId, 'assignments', assignmentId, 'submission', 'attachment'),
      payload,
      options
    );
  }

  /** Phase 4 — every status (draft + published), author-only. */
  async getAssignmentsForAuthoring(
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<Assignment>> {
    return this.client.get<PaginatedResult<Assignment>>(
      this.path(courseId, 'assignments', 'authoring'),
      options
    );
  }

  /** Phase 4 — the authoring counterpart of `getAssignment` (any status). Author-only. */
  async getAssignmentForAuthoring(
    courseId: string,
    assignmentId: string,
    options?: ReadOptions
  ): Promise<Assignment> {
    return this.client.get<Assignment>(
      this.path(courseId, 'assignments', assignmentId, 'authoring'),
      options
    );
  }

  /** Phase 4 — creates an assignment. */
  async createAssignment(
    courseId: string,
    payload: CreateAssignmentPayload,
    options?: WriteOptions
  ): Promise<Assignment> {
    return this.client.post<Assignment, CreateAssignmentPayload>(
      this.path(courseId, 'assignments'),
      payload,
      options
    );
  }

  /** Phase 4 — updates an assignment. */
  async updateAssignment(
    courseId: string,
    assignmentId: string,
    payload: UpdateAssignmentPayload,
    options?: WriteOptions
  ): Promise<Assignment> {
    return this.client.patch<Assignment, UpdateAssignmentPayload>(
      this.path(courseId, 'assignments', assignmentId),
      payload,
      options
    );
  }

  /** Phase 4 — deletes an assignment. */
  async deleteAssignment(
    courseId: string,
    assignmentId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(this.path(courseId, 'assignments', assignmentId), options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const assignmentService = new AssignmentService();
