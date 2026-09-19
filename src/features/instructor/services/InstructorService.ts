/**
 * Instructor Service.
 *
 * Every method here answers "what am I, the current authenticated
 * instructor, authorized to see" — never "give me data for an arbitrary
 * course/student id". The backend is expected to resolve the instructor's
 * authorized course scope itself (via `Course.instructors`, already part of
 * the Course domain) rather than trust any id the frontend supplies; this
 * service never accepts an instructor id as a parameter.
 *
 * P64 Phase 1 reframes half of that: the per-course REVIEW reads and the
 * grading write are no longer instructor-only and now target the
 * `review/*` prefix (see `REVIEW_RESOURCE`), which an academy Owner or
 * Manager is authorized for without teaching the course. The two
 * "what am I teaching" endpoints stay on `instructor/*`.
 *
 * Deliberately NOT duplicated here: quiz/assignment *definitions* are
 * identical regardless of viewer role, so pages read them straight from the
 * existing `QuizService`/`AssignmentService`. Only the instructor-specific
 * shapes (dashboard, roster, cross-student submissions, grading) live here.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath, toCollectionParams } from '@api';
import type {
  AssignmentSubmissionReview,
  CollectionQuery,
  GradeSubmissionPayload,
  InstructorCourseOverview,
  InstructorDashboardMetrics,
  InstructorStudent,
  InstructorStudentProgress,
  PaginatedResult,
  QuizAttemptSummary,
  TeachingCourse,
} from '@types';

/**
 * P64 Phase 1 (D-RBAC) — the per-course REVIEW prefix.
 *
 * Reviewing a course's work is no longer an instructor-only capability:
 * `assertCanReviewCourse` admits the course's instructors AND the owning
 * academy's Client Owner / Manager, and the endpoints were renamed
 * `review/*` to say so (`@Controller(['instructor', 'review'])` —
 * `instructor/*` survives as an alias for exactly one release).
 *
 * The rename matters beyond tidiness: an Owner or Manager calling
 * `instructor/courses/:id/...` reads as the product claiming they are an
 * instructor of that course, and the alias is scheduled for removal. Only
 * the endpoints that answer "about THIS course's work" move — see
 * `resource` below for the two that stay.
 */
const REVIEW_RESOURCE = 'review';

export class InstructorService extends BaseService {
  /**
   * `instructor/*` — deliberately NOT `review`. The two endpoints left on
   * this prefix answer "what am *I* teaching": `instructor/dashboard` and
   * `instructor/courses` (the teaching list) return only the caller's own
   * assigned courses, and that is true under either prefix. An Owner who
   * teaches nothing gets an empty teaching list, which is correct — it is
   * not the academy's course list, and pointing it at `review/courses`
   * would not change what it returns.
   */
  protected readonly resource = 'instructor';

  /** `review/<segments>` — the per-course review prefix (see `REVIEW_RESOURCE`). */
  private reviewPath(...segments: readonly string[]): string {
    return resourcePath(REVIEW_RESOURCE, ...segments);
  }

  /** Retrieves the instructor dashboard's aggregated teaching metrics. */
  async getDashboard(
    options?: ReadOptions
  ): Promise<InstructorDashboardMetrics> {
    return this.client.get<InstructorDashboardMetrics>(
      this.path('dashboard'),
      options
    );
  }

  /** Retrieves the courses this instructor is authorized to teach. */
  async getTeachingCourses(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<TeachingCourse>> {
    return this.client.get<PaginatedResult<TeachingCourse>>(
      this.path('courses'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** Retrieves the teaching overview for one authorized course. */
  async getCourseOverview(
    courseId: string,
    options?: ReadOptions
  ): Promise<InstructorCourseOverview> {
    return this.client.get<InstructorCourseOverview>(
      this.reviewPath('courses', courseId),
      options
    );
  }

  /** Retrieves the enrolled-student roster for one authorized course. */
  async getCourseStudents(
    courseId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<InstructorStudent>> {
    return this.client.get<PaginatedResult<InstructorStudent>>(
      this.reviewPath('courses', courseId, 'students'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** Retrieves one enrolled student's detailed, course-scoped progress. */
  async getStudentProgress(
    courseId: string,
    studentId: string,
    options?: ReadOptions
  ): Promise<InstructorStudentProgress> {
    return this.client.get<InstructorStudentProgress>(
      this.reviewPath('courses', courseId, 'students', studentId),
      options
    );
  }

  /** Retrieves every student's attempts at a course quiz. */
  async getQuizAttempts(
    courseId: string,
    quizId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<QuizAttemptSummary>> {
    return this.client.get<PaginatedResult<QuizAttemptSummary>>(
      this.reviewPath('courses', courseId, 'quizzes', quizId, 'attempts'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** Retrieves every student's submissions for a course assignment. */
  async getAssignmentSubmissions(
    courseId: string,
    assignmentId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AssignmentSubmissionReview>> {
    return this.client.get<PaginatedResult<AssignmentSubmissionReview>>(
      this.reviewPath(
        'courses',
        courseId,
        'assignments',
        assignmentId,
        'submissions'
      ),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** Retrieves one submission for review. */
  async getSubmission(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    options?: ReadOptions
  ): Promise<AssignmentSubmissionReview> {
    return this.client.get<AssignmentSubmissionReview>(
      this.reviewPath(
        'courses',
        courseId,
        'assignments',
        assignmentId,
        'submissions',
        submissionId
      ),
      options
    );
  }

  /** Grades a submission. Scoring/pass-fail rules stay entirely server-side. */
  async gradeSubmission(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    payload: GradeSubmissionPayload,
    options?: WriteOptions
  ): Promise<AssignmentSubmissionReview> {
    return this.client.post<AssignmentSubmissionReview, GradeSubmissionPayload>(
      this.reviewPath(
        'courses',
        courseId,
        'assignments',
        assignmentId,
        'submissions',
        submissionId,
        'grade'
      ),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const instructorService = new InstructorService();
