/**
 * Quiz Service (student-facing).
 *
 * Reads quizzes belonging to a course and manages the current student's
 * attempts. Quiz authoring stays in scope for a future module — this
 * service never creates or edits quizzes/questions. Nested under the same
 * flat `courses/:courseId/...` tree as `ProgressService`, since a student
 * always reaches a quiz through the course they're enrolled in.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  PaginatedResult,
  Quiz,
  QuizAttempt,
  SubmitQuizAttemptPayload,
} from '@types';

export class QuizService extends BaseService {
  protected readonly resource = 'courses';

  /** Retrieves the quizzes belonging to a course. */
  async getQuizzes(
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<Quiz>> {
    return this.client.get<PaginatedResult<Quiz>>(
      this.path(courseId, 'quizzes'),
      options
    );
  }

  /** Retrieves a single quiz with its questions, ready to be taken. */
  async getQuiz(
    courseId: string,
    quizId: string,
    options?: ReadOptions
  ): Promise<Quiz> {
    return this.client.get<Quiz>(
      this.path(courseId, 'quizzes', quizId),
      options
    );
  }

  /** Retrieves the current student's attempts at a quiz. */
  async getQuizAttempts(
    courseId: string,
    quizId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<QuizAttempt>> {
    return this.client.get<PaginatedResult<QuizAttempt>>(
      this.path(courseId, 'quizzes', quizId, 'attempts'),
      options
    );
  }

  /** Starts a new attempt at a quiz. */
  async startQuizAttempt(
    courseId: string,
    quizId: string,
    options?: WriteOptions
  ): Promise<QuizAttempt> {
    return this.client.post<QuizAttempt, undefined>(
      this.path(courseId, 'quizzes', quizId, 'attempts'),
      undefined,
      options
    );
  }

  /** Submits a quiz attempt's answers for scoring. */
  async submitQuizAttempt(
    courseId: string,
    quizId: string,
    attemptId: string,
    payload: SubmitQuizAttemptPayload,
    options?: WriteOptions
  ): Promise<QuizAttempt> {
    return this.client.post<QuizAttempt, SubmitQuizAttemptPayload>(
      this.path(courseId, 'quizzes', quizId, 'attempts', attemptId, 'submit'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const quizService = new QuizService();
