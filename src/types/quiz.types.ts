/**
 * Quiz domain types (student-facing).
 *
 * Quiz authoring is out of scope — these types only cover what a student
 * needs to take a quiz and see its result. Deliberately absent: any
 * "correct answer" field on a question. Correctness is never sent to the
 * client before submission; it can only be inferred from a submitted
 * `QuizAttempt`'s result, if and when the backend contract provides one.
 */

/** Whether a quiz is visible to students. */
export type QuizStatus = 'draft' | 'published';

/** Supported question types — kept to what renders cleanly with existing form controls. */
export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

/** A selectable option for a question. No correctness flag — see file header. */
export interface QuizQuestionOption {
  readonly id: string;
  readonly label: string;
}

/** A single quiz question. */
export interface QuizQuestion {
  readonly id: string;
  readonly quizId: string;
  readonly prompt: string;
  readonly type: QuizQuestionType;
  /** Present for single_choice/multiple_choice/true_false. */
  readonly options?: readonly QuizQuestionOption[];
  /** Position within the quiz, 0-based. */
  readonly order: number;
}

/** Quiz entity. */
export interface Quiz {
  readonly id: string;
  readonly courseId: string;
  readonly sectionId?: string;
  readonly title: string;
  readonly description?: string;
  readonly status: QuizStatus;
  readonly questionCount: number;
  /** 0–100, when the backend defines a passing threshold. */
  readonly passingScore?: number;
  /** Undefined means unlimited attempts. */
  readonly maxAttempts?: number;
  /** Populated when the student opens the quiz to take it. */
  readonly questions?: readonly QuizQuestion[];
}

/** A student's progress through one quiz attempt. */
export type QuizAttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'passed'
  | 'failed';

/** One question's answer within an attempt. */
export interface QuizAnswer {
  readonly questionId: string;
  readonly selectedOptionIds: readonly string[];
}

/** A single attempt at a quiz. */
export interface QuizAttempt {
  readonly id: string;
  readonly quizId: string;
  readonly studentId: string;
  readonly status: QuizAttemptStatus;
  readonly answers: readonly QuizAnswer[];
  /** 0–100, present once the backend has scored the attempt. */
  readonly score?: number;
  readonly passed?: boolean;
  readonly submittedAt?: string;
  readonly attemptNumber: number;
  /** Whether the abstract contract allows another attempt after this one. */
  readonly canRetry: boolean;
}

/** Submits a completed attempt in one call — no per-answer autosave contract is assumed. */
export interface SubmitQuizAttemptPayload {
  readonly answers: readonly QuizAnswer[];
}
