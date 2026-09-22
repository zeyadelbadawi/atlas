/**
 * Quiz Service — student-facing reads/attempts, plus Phase 4 authoring.
 * Nested under the same flat `courses/:courseId/...` tree as
 * `ProgressService`, since both a student and an author always reach a
 * quiz through its course.
 *
 * Authoring methods (`getQuizzesForAuthoring`/`getQuizForAuthoring`/
 * `createQuiz`/`updateQuiz`/`deleteQuiz`) hit a structurally separate set
 * of backend endpoints (`/authoring` suffix) gated by
 * `assertCanAuthorCourseContent`, never reachable by a plain enrolled
 * student — see `quiz-authoring.contract.ts` (backend) for why the
 * authoring response type (`QuizAuthoring`, WITH `isCorrect`) is kept
 * structurally distinct from `Quiz`.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CreateQuizPayload,
  PaginatedResult,
  Quiz,
  QuizAttempt,
  QuizAttemptResults,
  QuizAttemptSession,
  QuizAuthoring,
  RecordQuizAttemptEventsPayload,
  RecordQuizAttemptEventsResponse,
  SaveQuizAnswersPayload,
  SaveQuizAnswersResponse,
  SubmitQuizAttemptPayload,
  UpdateQuizPayload,
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

  /**
   * P64 Phase 3 (AD-8) — the resumable attempt session: this attempt's
   * questions in their seeded order, the server-confirmed answers, the
   * server clock and the deadline it derived.
   */
  async getQuizAttemptSession(
    courseId: string,
    quizId: string,
    attemptId: string,
    options?: ReadOptions
  ): Promise<QuizAttemptSession> {
    return this.client.get<QuizAttemptSession>(
      this.path(courseId, 'quizzes', quizId, 'attempts', attemptId),
      options
    );
  }

  /** P64 Phase 3 — autosave with a monotonic revision; a stale revision is ignored, not an error. */
  async saveQuizAnswers(
    courseId: string,
    quizId: string,
    attemptId: string,
    payload: SaveQuizAnswersPayload,
    options?: WriteOptions
  ): Promise<SaveQuizAnswersResponse> {
    return this.client.put<SaveQuizAnswersResponse, SaveQuizAnswersPayload>(
      this.path(courseId, 'quizzes', quizId, 'attempts', attemptId, 'answers'),
      payload,
      options
    );
  }

  /** P64 Phase 3 (AD-9) — a batch of integrity events (≤ 50); the server decides what counts. */
  async recordQuizAttemptEvents(
    courseId: string,
    quizId: string,
    attemptId: string,
    payload: RecordQuizAttemptEventsPayload,
    options?: WriteOptions
  ): Promise<RecordQuizAttemptEventsResponse> {
    return this.client.post<
      RecordQuizAttemptEventsResponse,
      RecordQuizAttemptEventsPayload
    >(
      this.path(courseId, 'quizzes', quizId, 'attempts', attemptId, 'events'),
      payload,
      options
    );
  }

  /** P64 Phase 3 — the results of a finished attempt, filtered by the disclosure policy. */
  async getQuizAttemptResults(
    courseId: string,
    quizId: string,
    attemptId: string,
    options?: ReadOptions
  ): Promise<QuizAttemptResults> {
    return this.client.get<QuizAttemptResults>(
      this.path(courseId, 'quizzes', quizId, 'attempts', attemptId, 'results'),
      options
    );
  }

  /** Submits a quiz attempt's answers for scoring. Partial answers are allowed; unanswered counts as incorrect. */
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

  /** Phase 4 — every status (draft + published), author-only. */
  async getQuizzesForAuthoring(
    courseId: string,
    options?: ReadOptions
  ): Promise<PaginatedResult<Quiz>> {
    return this.client.get<PaginatedResult<Quiz>>(
      this.path(courseId, 'quizzes', 'authoring'),
      options
    );
  }

  /** Phase 4 — a single quiz with its full question/option set, including `isCorrect`. Author-only. */
  async getQuizForAuthoring(
    courseId: string,
    quizId: string,
    options?: ReadOptions
  ): Promise<QuizAuthoring> {
    return this.client.get<QuizAuthoring>(
      this.path(courseId, 'quizzes', quizId, 'authoring'),
      options
    );
  }

  /** Phase 4 — creates a quiz with its complete question/option set. */
  async createQuiz(
    courseId: string,
    payload: CreateQuizPayload,
    options?: WriteOptions
  ): Promise<QuizAuthoring> {
    return this.client.post<QuizAuthoring, CreateQuizPayload>(
      this.path(courseId, 'quizzes'),
      payload,
      options
    );
  }

  /** Phase 4 — updates a quiz. `questions`, when present, replaces the whole question/option set. */
  async updateQuiz(
    courseId: string,
    quizId: string,
    payload: UpdateQuizPayload,
    options?: WriteOptions
  ): Promise<QuizAuthoring> {
    return this.client.patch<QuizAuthoring, UpdateQuizPayload>(
      this.path(courseId, 'quizzes', quizId),
      payload,
      options
    );
  }

  /** Phase 4 — deletes a quiz. */
  async deleteQuiz(
    courseId: string,
    quizId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.path(courseId, 'quizzes', quizId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const quizService = new QuizService();
