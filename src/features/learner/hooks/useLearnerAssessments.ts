/**
 * useLearnerAssessments hook.
 *
 * One hook for both tabs of `/my/assessments`, parameterised by type,
 * because they are the same question asked about two kinds of work —
 * "what do I still owe?" — and the backend answers them with two routes
 * carrying one shape (`LearnerAssessmentItem`). Two near-identical hooks
 * would only guarantee that a fix to one missed the other.
 *
 * Both queries stay mounted while the learner switches tabs: the tab is
 * local state over one page, not a route, and refetching the list a
 * learner just looked at because they tabbed back is a visible flicker
 * for no new information.
 */
import { useApiQuery, useAuth } from '@hooks';
import { learnerKeys } from '@services/query';
import type { LearnerAssessmentItem } from '@types';
import { learnerDashboardService } from '../services/LearnerDashboardService';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface UseLearnerAssessmentsOptions {
  readonly enabled?: boolean;
}

export function useLearnerAssessments(
  type: 'quiz' | 'assignment',
  options?: UseLearnerAssessmentsOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();
  const { academyId } = useLearnerSurface();

  return useApiQuery<readonly LearnerAssessmentItem[]>({
    queryKey: learnerKeys.assessments(user?.id, academyId, type),
    queryFn: () =>
      type === 'quiz'
        ? learnerDashboardService.getQuizzes()
        : learnerDashboardService.getAssignments(),
    enabled: enabled && !!user?.id,
  });
}
