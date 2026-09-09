/**
 * Client Owner student analytics types (Phase 9) — mirror the backend's
 * `student-analytics.contract.ts` field-for-field.
 *
 * Each metric has a precise, documented definition on the backend
 * contract; the UI must present them as those definitions describe rather
 * than reinterpreting them. In particular "started" means at least one
 * COMPLETED lesson (Atlas records no course-opened event), and a student
 * is only ever "at risk" because one of the concrete `AtRiskReason`s
 * fired — the reasons travel with every row so the UI can always explain
 * the flag instead of presenting an opaque score.
 */

export type AtRiskReason = 'no_progress' | 'stalled' | 'failing_quiz';

export interface CompletionFunnel {
  readonly enrolled: number;
  readonly started: number;
  readonly completed: number;
}

export interface CohortTrendPoint {
  /** `YYYY-MM`. */
  readonly month: string;
  readonly newEnrollments: number;
  readonly completions: number;
}

export interface AtRiskStudent {
  readonly studentId: string;
  readonly studentName: string;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly academyId: string;
  readonly completedLessons: number;
  readonly totalLessons: number;
  readonly lastProgressAt: string | null;
  readonly reasons: readonly AtRiskReason[];
}

export interface StudentAnalytics {
  readonly scope: {
    readonly type: 'organization' | 'academy';
    readonly organizationId: string;
    readonly academyId?: string;
  };
  readonly window: { readonly from: string; readonly to: string };
  readonly funnel: CompletionFunnel;
  readonly cohortTrends: readonly CohortTrendPoint[];
  readonly atRiskStudents: readonly AtRiskStudent[];
  /** May exceed `atRiskStudents.length` — the table is capped, this is the true total. */
  readonly atRiskTotal: number;
  readonly inactivityThresholdDays: number;
}
