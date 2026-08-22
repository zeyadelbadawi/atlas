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
 * Deliberately NOT duplicated here: quiz/assignment *definitions* are
 * identical regardless of viewer role, so pages read them straight from the
 * existing `QuizService`/`AssignmentService`. Only the instructor-specific
 * shapes (dashboard, roster, cross-student submissions, grading) live here.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AssignmentSubmissionReview,
  CollectionQuery,
  GradeSubmissionPayload,
  InstructorCourseOverview,
  InstructorDashboardMetrics,
  InstructorStudent,
  InstructorStudentProgress,
  PaginatedResult,
  QueryParams,
  QuizAttemptSummary,
  TeachingCourse,
} from '@types';

export class InstructorService extends BaseService {
  protected readonly resource = 'instructor';

  /** Retrieves the instructor dashboard's aggregated teaching metrics. */
  async getDashboard(options?: ReadOptions): Promise<InstructorDashboardMetrics> {
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
      { ...options, params: query as unknown as QueryParams }
    );
  }

  /** Retrieves the teaching overview for one authorized course. */
  async getCourseOverview(
    courseId: string,
    options?: ReadOptions
  ): Promise<InstructorCourseOverview> {
    return this.client.get<InstructorCourseOverview>(
      this.path('courses', courseId),
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
      this.path('courses', courseId, 'students'),
      { ...options, params: query as unknown as QueryParams }
    );
  }

  /** Retrieves one enrolled student's detailed, course-scoped progress. */
  async getStudentProgress(
    courseId: string,
    studentId: string,
    options?: ReadOptions
  ): Promise<InstructorStudentProgress> {
    return this.client.get<InstructorStudentProgress>(
      this.path('courses', courseId, 'students', studentId),
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
      this.path('courses', courseId, 'quizzes', quizId, 'attempts'),
      { ...options, params: query as unknown as QueryParams }
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
      this.path('courses', courseId, 'assignments', assignmentId, 'submissions'),
      { ...options, params: query as unknown as QueryParams }
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
      this.path(
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
      this.path(
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
