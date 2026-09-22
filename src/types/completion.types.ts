/**
 * Course completion types (P64 Phase 3, AD-11).
 *
 * Mirrors `completion.contract.ts` (backend). The rule is the course's
 * own `completion_rule` JSON; the evaluator materialises the state and
 * this is its learner- and staff-facing projection.
 */

export interface CompletionRule {
  /** `'all'`, `'none'` or a minimum number of lessons. */
  readonly lessons: 'all' | 'none' | number;
  readonly requiredQuizzes: boolean;
  readonly requiredAssignments: boolean;
  readonly minOverallScore: number | null;
}

export type CompletionMissingKind =
  'lessons' | 'quiz' | 'assignment' | 'minOverallScore';

export interface CompletionMissingItem {
  readonly kind: CompletionMissingKind;
  readonly id?: string;
  readonly title?: string;
  readonly required?: number;
  readonly current?: number;
}

export interface CompletionRequiredQuiz {
  readonly quizId: string;
  readonly title: string;
  readonly required: boolean;
  readonly passed: boolean;
  readonly effectiveScore: number | null;
  readonly pendingGrading: boolean;
}

export interface CompletionRequiredAssignment {
  readonly assignmentId: string;
  readonly title: string;
  readonly required: boolean;
  readonly submitted: boolean;
  readonly graded: boolean;
  readonly score: number | null;
}

export type CourseCertificateState =
  'unavailable' | 'eligible' | 'issued' | 'revoked';

export type CertificateRenderStatus = 'pending' | 'ready' | 'failed';

export interface CompletionCertificate {
  readonly enabled: boolean;
  readonly status: CourseCertificateState;
  readonly minScore: number | null;
  readonly certificateId: string | null;
  readonly serial: string | null;
  readonly verificationCode: string | null;
  readonly renderStatus: CertificateRenderStatus | null;
  readonly issuedAt: string | null;
}

/** `GET /learning/courses/:courseId/completion` — the learner's completion screen. */
export interface CourseCompletion {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly completed: boolean;
  readonly completedAt: string | null;
  readonly completionState: 'incomplete' | 'in_progress' | 'completed';
  readonly overallScore: number | null;
  readonly rule: CompletionRule;
  readonly lessons: { readonly total: number; readonly completed: number };
  readonly quizzes: readonly CompletionRequiredQuiz[];
  readonly assignments: readonly CompletionRequiredAssignment[];
  readonly missing: readonly CompletionMissingItem[];
  readonly certificate: CompletionCertificate;
}

export interface CompletionRuleItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly requiredForCompletion: boolean;
}

/** `GET /academies/:id/courses/:courseId/completion-rule` — the staff view. */
export interface CourseCompletionRule {
  readonly courseId: string;
  readonly rule: CompletionRule;
  readonly certificatesEnabled: boolean;
  readonly certificateMinScore: number | null;
  readonly certificateTemplateId: string | null;
  /** Whether the `certificates` rollout flag admits this academy. */
  readonly certificatesFeatureEnabled: boolean;
  readonly quizzes: readonly CompletionRuleItem[];
  readonly assignments: readonly CompletionRuleItem[];
  readonly publishedLessons: number;
}

export interface UpdateCompletionRulePayload {
  readonly lessons?: 'all' | 'none' | number;
  readonly requiredQuizzes?: boolean;
  readonly requiredAssignments?: boolean;
  readonly minOverallScore?: number | null;
  readonly requiredQuizIds?: readonly string[];
  readonly requiredAssignmentIds?: readonly string[];
  readonly certificatesEnabled?: boolean;
  readonly certificateMinScore?: number | null;
  readonly certificateTemplateId?: string | null;
}
