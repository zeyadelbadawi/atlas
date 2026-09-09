/**
 * Student "My Results" types (Phase 9) — mirror the backend's
 * `student-results.contract.ts` field-for-field.
 *
 * The `null`s here are meaningful and must not be rendered as zeros:
 * `averageQuizScore: null` means the student has no scored attempt yet,
 * which is a different fact from having averaged 0. `score: null` on a
 * single result means submitted-but-not-yet-graded. `passed: null` means
 * the quiz defines no passing score at all.
 */

export interface StudentQuizResult {
  readonly attemptId: string;
  readonly quizId: string;
  readonly quizTitle: string;
  readonly attemptNumber: number;
  /** Percentage 0–100, or `null` when submitted but not yet scored. */
  readonly score: number | null;
  /** `null` when the quiz sets no passing score. */
  readonly passed: boolean | null;
  readonly submittedAt: string | null;
}

export interface StudentAssignmentResult {
  readonly submissionId: string;
  readonly assignmentId: string;
  readonly assignmentTitle: string;
  readonly status: string;
  readonly gradingStatus: string;
  readonly score: number | null;
  readonly hasFeedback: boolean;
  readonly submittedAt: string | null;
  readonly gradedAt: string | null;
}

export interface StudentCourseResults {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly academyId: string;
  readonly progress: {
    readonly completedLessons: number;
    readonly totalLessons: number;
    readonly percentage: number;
    readonly completionState: string;
  } | null;
  readonly quizResults: readonly StudentQuizResult[];
  readonly assignmentResults: readonly StudentAssignmentResult[];
}

export interface StudentResultsSummary {
  readonly coursesEnrolled: number;
  readonly coursesCompleted: number;
  readonly quizzesAttempted: number;
  readonly quizzesPassed: number;
  readonly assignmentsSubmitted: number;
  readonly assignmentsGraded: number;
  /** `null` when nothing is scored yet — never render as 0. */
  readonly averageQuizScore: number | null;
}

export interface StudentResults {
  readonly summary: StudentResultsSummary;
  readonly courses: readonly StudentCourseResults[];
}
