/**
 * Quiz types — the learner-facing quiz, the attempt lifecycle and the
 * authoring shapes.
 *
 * P64 Phase 3 (AD-8, AD-9) extends every one of these with the quiz
 * engine v2 contract: quiz settings the learner may see, the attempt
 * session (server clock, saved answers, seeded order), autosave, the
 * integrity event batch and the policy-filtered results. Field names
 * mirror the backend contracts in `quiz.contract.ts`,
 * `quiz-attempt.contract.ts` and `quiz-attempt-session.contract.ts`.
 *
 * Correct answers never appear in a learner-facing type before the
 * disclosure policy allows them: `QuizQuestionOption` has no `isCorrect`,
 * and `QuizResultQuestion.correctOptionIds` is optional because the
 * server only sends it when `disclosure.answers` is true.
 */

export type QuizStatus = 'draft' | 'published';

export type QuizQuestionType =
  'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

/** Question types answered by typing rather than choosing. */
export const TEXT_QUESTION_TYPES: readonly QuizQuestionType[] = [
  'short_answer',
  'essay',
];

export type QuizMode = 'practice' | 'exam';
export type QuizLayout = 'all_questions' | 'one_per_page';
export type QuizGradingPolicy = 'highest' | 'latest' | 'first' | 'average';
export type QuizDisclosure =
  'immediately' | 'after_due' | 'after_attempts_exhausted' | 'never';
export type QuizIntegrityMode = 'off' | 'monitor' | 'warn' | 'strict';
export type AssessmentLatePolicy = 'block' | 'accept_flagged';

export interface QuizQuestionOption {
  readonly id: string;
  readonly label: string;
}

export interface QuizQuestion {
  readonly id: string;
  readonly quizId: string;
  readonly prompt: string;
  readonly type: QuizQuestionType;
  readonly options?: readonly QuizQuestionOption[];
  readonly order: number;
  readonly points: number;
}

/** The subset of a quiz's settings a learner may see before starting. */
export interface QuizLearnerSettings {
  readonly mode: QuizMode;
  readonly timeLimitSeconds: number | null;
  readonly availableFrom: string | null;
  readonly availableUntil: string | null;
  readonly dueAt: string | null;
  readonly latePolicy: AssessmentLatePolicy;
  readonly gradingPolicy: QuizGradingPolicy;
  readonly layout: QuizLayout;
  readonly questionsPerAttempt: number | null;
  readonly showScore: QuizDisclosure;
  readonly showAnswers: QuizDisclosure;
  readonly integrityMode: QuizIntegrityMode;
  readonly maxViolations: number;
  readonly requireFullscreen: boolean;
  readonly requiredToProgress: boolean;
  readonly requiredForCompletion: boolean;
  readonly hideTimer: boolean;
}

export interface Quiz {
  readonly id: string;
  readonly courseId: string;
  readonly sectionId?: string;
  readonly title: string;
  readonly description?: string;
  readonly status: QuizStatus;
  readonly questionCount: number;
  readonly passingScore?: number;
  readonly maxAttempts?: number;
  /**
   * The learner's OWN effective attempt allowance, extra-attempt override
   * included. Single authoritative "attempts left" source: `null` = unlimited,
   * a number = maxAttempts + granted extra attempts. Undefined only from an
   * older server; the intro card falls back to `maxAttempts` then.
   */
  readonly attemptsAllowed?: number | null;
  /** The learner's own granted extra-attempt override (0 when none). */
  readonly extraAttempts?: number;
  readonly settings: QuizLearnerSettings;
  readonly questions?: readonly QuizQuestion[];
}

export type QuizAttemptStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'passed'
  | 'failed'
  | 'expired'
  | 'invalidated';

export type QuizAttemptGradingStatus = 'auto' | 'pending' | 'graded';

/** One answer: option ids for choice questions, text for typed ones. */
export interface QuizAnswer {
  readonly questionId: string;
  readonly selectedOptionIds?: readonly string[];
  readonly text?: string;
}

export interface QuizAttempt {
  readonly id: string;
  readonly quizId: string;
  readonly studentId: string;
  readonly status: QuizAttemptStatus;
  readonly answers: readonly QuizAnswer[];
  readonly score?: number;
  readonly passed?: boolean;
  readonly submittedAt?: string;
  readonly attemptNumber: number;
  readonly canRetry: boolean;
  readonly startedAt: string | null;
  readonly deadlineAt: string | null;
  readonly revision: number;
  readonly lastSavedAt: string | null;
  readonly autoSubmitted: boolean;
  readonly autoSubmittedReason: string | null;
  readonly isLate: boolean;
  readonly violationCount: number;
  readonly integrityFlagged: boolean;
  readonly gradingStatus: QuizAttemptGradingStatus;
  readonly pointsEarned: number | null;
  readonly pointsTotal: number | null;
  readonly invalidatedAt: string | null;
  readonly invalidationReason: string | null;
}

/** Attempt statuses that mean the attempt is over. */
export const FINISHED_ATTEMPT_STATUSES: readonly QuizAttemptStatus[] = [
  'submitted',
  'passed',
  'failed',
  'expired',
  'invalidated',
];

export interface SubmitQuizAttemptPayload {
  readonly answers?: readonly QuizAnswer[];
  readonly revision?: number;
}

export interface SaveQuizAnswersPayload {
  readonly revision: number;
  readonly answers: readonly QuizAnswer[];
}

export interface SaveQuizAnswersResponse {
  readonly attemptId: string;
  readonly revision: number;
  readonly applied: boolean;
  readonly savedAt: string | null;
  readonly serverNow: string;
  readonly deadlineAt: string | null;
}

/** The settings frozen into the attempt when it started. */
export interface QuizAttemptSettings {
  readonly mode: QuizMode;
  readonly layout: QuizLayout;
  readonly hideTimer: boolean;
  readonly integrityMode: QuizIntegrityMode;
  readonly maxViolations: number;
  readonly requireFullscreen: boolean;
  readonly timeLimitSeconds: number | null;
  readonly timeMultiplier: number;
  /** False when the `quiz.engine_v2` flag is off for the academy: no deadline, exact coverage required. */
  readonly engineV2: boolean;
}

export interface QuizSessionQuestion {
  readonly id: string;
  readonly type: QuizQuestionType;
  readonly prompt: string;
  readonly points: number;
  readonly options: readonly QuizQuestionOption[];
}

/**
 * Everything needed to resume an attempt: the questions in this
 * attempt's order, the server-confirmed answers, the server clock and
 * the deadline it derived. `remainingSeconds` is the server's own
 * number; the client counts down from it and never from `Date.now()`.
 */
export interface QuizAttemptSession {
  readonly attemptId: string;
  readonly quizId: string;
  readonly status: QuizAttemptStatus;
  readonly attemptNumber: number;
  readonly startedAt: string;
  readonly deadlineAt: string | null;
  readonly serverNow: string;
  readonly remainingSeconds: number | null;
  readonly revision: number;
  readonly lastSavedAt: string | null;
  readonly violationCount: number;
  readonly settings: QuizAttemptSettings;
  readonly questions: readonly QuizSessionQuestion[];
  readonly answers: readonly QuizAnswer[];
  readonly attemptsUsed: number;
  readonly attemptsAllowed: number | null;
}

export const QUIZ_ATTEMPT_EVENT_TYPES = [
  'visibility_hidden',
  'visibility_visible',
  'blur',
  'focus',
  'fullscreen_exit',
  'fullscreen_enter',
  'copy',
  'paste',
  'cut',
  'contextmenu',
  'print',
  'heartbeat',
  'second_session',
  'device_change',
  'warning_acknowledged',
] as const;
export type QuizAttemptEventType = (typeof QUIZ_ATTEMPT_EVENT_TYPES)[number];

export interface QuizAttemptEventInput {
  readonly type: QuizAttemptEventType;
  readonly clientAt?: string;
  readonly payload?: Record<string, unknown>;
}

export interface RecordQuizAttemptEventsPayload {
  readonly events: readonly QuizAttemptEventInput[];
}

export interface RecordQuizAttemptEventsResponse {
  readonly attemptId: string;
  readonly recorded: number;
  readonly violationCount: number;
  readonly maxViolations: number;
  readonly action: 'none' | 'warn' | 'auto_submit';
  readonly status: QuizAttemptStatus;
}

/** What the disclosure policy currently allows this learner to see. */
export interface QuizDisclosureState {
  readonly score: boolean;
  readonly answers: boolean;
  readonly explanations: boolean;
}

export interface QuizResultQuestion {
  readonly questionId: string;
  readonly prompt: string;
  readonly type: QuizQuestionType;
  readonly points: number;
  readonly answered: boolean;
  readonly correct?: boolean | null;
  readonly pointsAwarded?: number;
  readonly yourAnswer: QuizAnswer | null;
  /** Only present when the policy discloses answers. */
  readonly correctOptionIds?: readonly string[];
  readonly acceptedAnswers?: readonly string[];
  readonly explanation?: string;
  readonly relatedLessonId?: string;
  readonly needsManualGrading: boolean;
}

export interface QuizAttemptResults {
  readonly attemptId: string;
  readonly quizId: string;
  readonly status: QuizAttemptStatus;
  readonly attemptNumber: number;
  readonly submittedAt: string | null;
  readonly autoSubmitted: boolean;
  readonly autoSubmittedReason: string | null;
  readonly isLate: boolean;
  readonly gradingStatus: QuizAttemptGradingStatus;
  readonly disclosure: QuizDisclosureState;
  readonly score?: number | null;
  readonly passed?: boolean | null;
  readonly pointsEarned?: number;
  readonly pointsTotal?: number;
  readonly passingScore: number | null;
  readonly questions: readonly QuizResultQuestion[];
  readonly canRetry: boolean;
  readonly attemptsUsed: number;
  readonly attemptsAllowed: number | null;
  /** The grading-policy result across attempts, when disclosed. */
  readonly effectiveScore?: number | null;
  readonly effectivePassed?: boolean;
}

/* ---------- authoring ---------- */

export interface QuizQuestionOptionInput {
  readonly label: string;
  readonly isCorrect: boolean;
}

export interface QuizQuestionInput {
  readonly prompt: string;
  readonly type: QuizQuestionType;
  /** Omitted (or empty) for `short_answer` and `essay`. */
  readonly options?: readonly QuizQuestionOptionInput[];
  readonly points?: number;
  readonly explanation?: string;
  readonly relatedLessonId?: string;
  /** `short_answer` only: any of these, compared case-insensitively. */
  readonly acceptedAnswers?: readonly string[];
}

/** Every setting an author can write. All optional: the server keeps today's defaults. */
export interface QuizSettingsInput {
  readonly mode?: QuizMode;
  readonly timeLimitSeconds?: number | null;
  readonly availableFrom?: string | null;
  readonly availableUntil?: string | null;
  readonly dueAt?: string | null;
  readonly latePolicy?: AssessmentLatePolicy;
  readonly gradingPolicy?: QuizGradingPolicy;
  readonly shuffleQuestions?: boolean;
  readonly shuffleOptions?: boolean;
  readonly questionsPerAttempt?: number | null;
  readonly layout?: QuizLayout;
  readonly showScore?: QuizDisclosure;
  readonly showAnswers?: QuizDisclosure;
  readonly showExplanations?: boolean;
  readonly integrityMode?: QuizIntegrityMode;
  readonly maxViolations?: number;
  readonly requireFullscreen?: boolean;
  readonly requiredToProgress?: boolean;
  readonly requiredForCompletion?: boolean;
  readonly hideTimer?: boolean;
}

export interface CreateQuizPayload extends QuizSettingsInput {
  readonly title: string;
  readonly description?: string;
  readonly sectionId?: string;
  readonly status?: QuizStatus;
  readonly passingScore?: number;
  readonly maxAttempts?: number;
  readonly questions: readonly QuizQuestionInput[];
}

export interface UpdateQuizPayload extends QuizSettingsInput {
  readonly title?: string;
  readonly description?: string;
  readonly sectionId?: string;
  readonly status?: QuizStatus;
  readonly passingScore?: number;
  readonly maxAttempts?: number;
  readonly questions?: readonly QuizQuestionInput[];
}

export interface QuizQuestionOptionAuthoring {
  readonly id: string;
  readonly label: string;
  readonly isCorrect: boolean;
}

export interface QuizQuestionAuthoring {
  readonly id: string;
  readonly quizId: string;
  readonly prompt: string;
  readonly type: QuizQuestionType;
  readonly order: number;
  readonly options: readonly QuizQuestionOptionAuthoring[];
  readonly points: number;
  readonly explanation?: string;
  readonly relatedLessonId?: string;
  readonly acceptedAnswers?: readonly string[];
}

/** The full settings block as stored — what the authoring read returns. */
export interface QuizSettingsAuthoring {
  readonly mode: QuizMode;
  readonly timeLimitSeconds: number | null;
  readonly availableFrom: string | null;
  readonly availableUntil: string | null;
  readonly dueAt: string | null;
  readonly latePolicy: AssessmentLatePolicy;
  readonly gradingPolicy: QuizGradingPolicy;
  readonly shuffleQuestions: boolean;
  readonly shuffleOptions: boolean;
  readonly questionsPerAttempt: number | null;
  readonly layout: QuizLayout;
  readonly showScore: QuizDisclosure;
  readonly showAnswers: QuizDisclosure;
  readonly showExplanations: boolean;
  readonly integrityMode: QuizIntegrityMode;
  readonly maxViolations: number;
  readonly requireFullscreen: boolean;
  readonly requiredToProgress: boolean;
  readonly requiredForCompletion: boolean;
  readonly hideTimer: boolean;
}

export interface QuizAuthoring {
  readonly id: string;
  readonly courseId: string;
  readonly sectionId?: string;
  readonly title: string;
  readonly description?: string;
  readonly status: QuizStatus;
  readonly questionCount: number;
  readonly passingScore?: number;
  readonly maxAttempts?: number;
  readonly settings: QuizSettingsAuthoring;
  readonly questions: readonly QuizQuestionAuthoring[];
}
