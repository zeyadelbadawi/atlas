/**
 * Instructor domain types.
 *
 * The Instructor experience reuses Course, Enrollment, Progress, Quiz and
 * Assignment types wherever their existing shape already fits — these types
 * only cover what is genuinely new: teaching-scoped read models (an
 * instructor viewing courses/students they are authorized to teach, not
 * their own data) and the grading workflow.
 */
import type { CourseStatus, CourseVisibility } from './course.types';
import type { CourseCompletionState, CourseProgress } from './progress.types';
import type { EnrollmentStatus } from './enrollment.types';
import type {
  QuizAttempt,
  QuizAttemptEventType,
  QuizQuestionType,
} from './quiz.types';
import type {
  AssignmentSubmission,
  SubmissionAttachment,
} from './assignment.types';

/** Why a course is flagged as needing the instructor's attention. */
export type CourseAttentionReason =
  'pending_grading' | 'low_engagement' | 'no_recent_activity';

/** A course surfaced on the dashboard as needing attention. */
export interface CourseAttentionItem {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly reason: CourseAttentionReason;
}

/** The kind of event behind one activity feed entry. */
export type InstructorActivityType =
  'submission' | 'quiz_attempt' | 'enrollment' | 'completion';

/** One entry in the instructor's recent-activity feed. */
export interface InstructorActivityItem {
  readonly id: string;
  readonly type: InstructorActivityType;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly studentName?: string;
  /** Server-supplied description, not a translation key — mirrors `AcademyActivity`. */
  readonly description: string;
  readonly timestamp: string;
}

/** Aggregated teaching metrics for the Instructor Dashboard. */
export interface InstructorDashboardMetrics {
  readonly assignedCoursesCount: number;
  readonly activeCoursesCount: number;
  readonly totalStudents: number;
  readonly pendingSubmissionsCount: number;
  readonly pendingGradingCount: number;
  readonly coursesRequiringAttention: readonly CourseAttentionItem[];
  readonly recentActivity: readonly InstructorActivityItem[];
}

/** A course this instructor is authorized to teach. */
export interface TeachingCourse {
  readonly courseId: string;
  /**
   * P64 Phase 1 — the owning academy, when the backend contract supplies
   * it. Needed to deep-link an assigned instructor into the academy
   * curriculum builder (`academies/:id/courses/:courseId/sections*`),
   * which is academy-scoped by route. Optional so an older backend
   * response still type-checks; the link simply does not render without it.
   */
  readonly academyId?: string;
  readonly title: string;
  readonly thumbnail?: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  /** Present only when the backend contract computes it. */
  readonly enrolledCount?: number;
  /** 0–100, present only when the backend contract computes it. */
  readonly averageProgress?: number;
  readonly requiresAttention: boolean;
}

/** Teaching-operations overview for one authorized course. */
export interface InstructorCourseOverview {
  readonly courseId: string;
  /** P64 Phase 1 — see `TeachingCourse.academyId`. */
  readonly academyId?: string;
  readonly title: string;
  readonly description?: string;
  readonly status: CourseStatus;
  readonly visibility: CourseVisibility;
  readonly enrolledCount: number;
  readonly averageProgress?: number;
  readonly totalSections: number;
  readonly totalLessons: number;
  readonly pendingSubmissionsCount: number;
  readonly pendingGradingCount: number;
  readonly recentActivity: readonly InstructorActivityItem[];
}

/** One roster entry — an enrolled student, as seen by an authorized instructor. */
export interface InstructorStudent {
  readonly studentId: string;
  readonly name: string;
  readonly email: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly progressPercentage: number;
  readonly completionState: CourseCompletionState;
  readonly lastActivityAt?: string;
}

/** Grading state of a submission. */
export type GradingStatus = 'ungraded' | 'graded';

/** A grade entered by an authorized instructor. Scoring rules stay server-side. */
export interface Grade {
  readonly score?: number;
  readonly feedback?: string;
  readonly gradedAt?: string;
  readonly gradedBy?: string;
}

/** A quiz attempt as seen by an authorized instructor — `QuizAttempt` plus the student's identity for roster display. */
export interface QuizAttemptSummary extends QuizAttempt {
  readonly studentName: string;
}

/* ---------- P64 Phase 3 — attempt review, manual grading, overrides ---------- */

/** One answered question as the reviewer sees it: correctness AND the correct options. */
export interface QuizReviewAnswer {
  readonly questionId: string;
  readonly prompt: string;
  readonly type: QuizQuestionType;
  readonly points: number;
  readonly answered: boolean;
  readonly correct: boolean | null;
  readonly pointsAwarded: number;
  readonly needsManualGrading: boolean;
  readonly manualPoints: number | null;
  readonly selectedOptionIds?: readonly string[];
  readonly text?: string;
  readonly options: readonly {
    readonly id: string;
    readonly label: string;
    readonly isCorrect: boolean;
  }[];
  readonly acceptedAnswers?: readonly string[];
}

export interface QuizAttemptEvent {
  readonly id: string;
  readonly type: QuizAttemptEventType;
  /** False when the engine ignored it (warm-up, debounce, sub-second). */
  readonly counted: boolean;
  readonly clientAt: string | null;
  readonly serverAt: string;
  readonly payload: unknown;
}

/** `GET /review/courses/:id/quizzes/:quizId/attempts/:attemptId`. */
export interface QuizAttemptReview extends QuizAttempt {
  readonly studentName: string;
  readonly studentEmail: string;
  readonly durationSeconds: number | null;
  readonly questions: readonly QuizReviewAnswer[];
  readonly events: readonly QuizAttemptEvent[];
  readonly gradedByName: string | null;
  readonly invalidatedByName: string | null;
  /**
   * The integrity mode in force for this attempt (`off` when the quiz had it
   * off, or the academy's integrity flag was not on when it ran). Lets the
   * reviewer tell "integrity was not watching" from "watching, recorded
   * nothing" — an empty event list means different things (P4 Issue 5).
   */
  readonly integrityMode: 'off' | 'monitor' | 'warn' | 'strict';
  /** Whether this attempt required full screen (its settings snapshot). */
  readonly requireFullscreen: boolean;
  /** P5 — explainable signals derived server-side from `events`. Never a score or a verdict. */
  readonly signals: readonly IntegritySignal[];
}

export type IntegritySignalKey =
  | 'time_away'
  | 'focus_lost'
  | 'fullscreen_left'
  | 'fullscreen_never_entered'
  | 'fullscreen_unavailable'
  | 'paste_without_copy'
  | 'paste_after_copy'
  | 'copy'
  | 'print'
  | 'connection_gap';

/** One fact worth a look (`review`) or context (`info`), with the events behind it. */
export interface IntegritySignal {
  readonly key: IntegritySignalKey;
  readonly level: 'review' | 'info';
  readonly occurrences: number;
  readonly totalSeconds?: number;
  readonly longestSeconds?: number;
  readonly reasons?: readonly string[];
  readonly eventIds: readonly string[];
}

export interface GradeQuizAttemptPayload {
  readonly grades: readonly {
    readonly questionId: string;
    readonly points: number;
  }[];
}

export interface InvalidateQuizAttemptPayload {
  readonly reason: string;
}

export interface QuizStudentOverride {
  readonly id: string;
  readonly quizId: string;
  readonly studentId: string;
  readonly studentName: string | null;
  readonly timeMultiplier: number;
  readonly extraAttempts: number;
  readonly availableFrom: string | null;
  readonly availableUntil: string | null;
  readonly reason: string | null;
  readonly createdAt: string;
}

export interface UpsertQuizStudentOverridePayload {
  readonly studentId: string;
  readonly timeMultiplier?: number;
  readonly extraAttempts?: number;
  readonly availableFrom?: string | null;
  readonly availableUntil?: string | null;
  readonly reason?: string;
}

/**
 * An assignment submission as seen by an authorized instructor — the same
 * `AssignmentSubmission` extended with the submitting student's identity
 * (for roster display) and grading state.
 */
export interface AssignmentSubmissionReview {
  readonly id: string;
  readonly assignmentId: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly status: AssignmentSubmission['status'];
  readonly response?: string;
  /** Pre-Phase-3 public attachment URL, kept for old rows. */
  readonly attachmentUrl?: string;
  /** P64 Phase 3 — the protected attachment with a signed link; present on the detail view. */
  readonly attachment?: SubmissionAttachment | null;
  readonly submittedAt?: string;
  readonly isLate: boolean;
  readonly submittedRevision: number;
  readonly gradingStatus: GradingStatus;
  readonly grade?: Grade;
}

/** Grades a submission. Only the fields the instructor enters — no scoring logic. */
export interface GradeSubmissionPayload {
  readonly score?: number;
  readonly feedback?: string;
}

/**
 * One student's detailed, course-scoped progress as seen by an authorized
 * instructor — read-only. Reuses `CourseProgress`/`QuizAttempt` verbatim;
 * only submissions gain grading state via `AssignmentSubmissionReview`.
 */
export interface InstructorStudentProgress {
  readonly studentId: string;
  readonly studentName: string;
  readonly courseId: string;
  readonly enrollmentStatus: EnrollmentStatus;
  readonly progress: CourseProgress;
  readonly quizAttempts: readonly QuizAttempt[];
  readonly assignmentSubmissions: readonly AssignmentSubmissionReview[];
}
