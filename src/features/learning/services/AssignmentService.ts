/**
 * Assignment Service — student-facing reads/submission, plus Phase 4
 * authoring and real-file-upload wiring. Nested under the same flat
 * `courses/:courseId/...` tree as `ProgressService`/`QuizService`.
 *
 * `uploadSubmissionAttachment` uploads a real file through the media
 * pipeline. P64 Phase 3 (§D.4) made the attachment PROTECTED: the upload
 * answers with the asset id only, the student references that id at
 * submit time, and every read of the file is a short-lived signed link
 * minted for whoever is allowed to see it. There is no public URL.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  Assignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
  CreateAssignmentSubmissionPayload,
  PaginatedResult,
  SaveAssignmentDraftPayload,
  SubmissionAttachmentUpload,
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

  /** P64 Phase 3 — draft autosave. Never changes a submitted submission's content. */
  async saveDraft(
    courseId: string,
    assignmentId: string,
    payload: SaveAssignmentDraftPayload,
    options?: WriteOptions
  ): Promise<AssignmentSubmission> {
    return this.client.put<AssignmentSubmission, SaveAssignmentDraftPayload>(
      this.path(courseId, 'assignments', assignmentId, 'submission', 'draft'),
      payload,
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
    return this.client.post<
      AssignmentSubmission,
      CreateAssignmentSubmissionPayload
    >(
      this.path(courseId, 'assignments', assignmentId, 'submission'),
      payload,
      options
    );
  }

  /** Uploads a file for the current student's upcoming submission into protected storage. Answers with the asset id to reference at submit time. */
  async uploadSubmissionAttachment(
    courseId: string,
    assignmentId: string,
    payload: UploadMediaAssetPayload,
    options?: WriteOptions
  ): Promise<SubmissionAttachmentUpload> {
    return this.client.post<
      SubmissionAttachmentUpload,
      UploadMediaAssetPayload
    >(
      this.path(
        courseId,
        'assignments',
        assignmentId,
        'submission',
        'attachment'
      ),
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
    await this.client.delete<void>(
      this.path(courseId, 'assignments', assignmentId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const assignmentService = new AssignmentService();
