/**
 * useLearnerOverview hook.
 *
 * Everything `/my` shows, in one request. Deliberately one aggregate
 * rather than six queries: the overview's whole job is to answer "what
 * should I do next?" before anything else on the page, and six requests
 * means six loading states resolving in six different orders on a phone.
 *
 * The academy id comes from the mounted SURFACE, not from a parameter the
 * page chose — and it is passed to the query KEY only, never to the
 * request. The server scopes by host; the key carries the academy so the
 * same learner visiting a second academy's site is not answered from the
 * first one's cache.
 */
import { useApiQuery, useAuth } from '@hooks';
import { learnerKeys } from '@services/query';
import type { LearnerOverviewResponse } from '@types';
import { learnerDashboardService } from '../services/LearnerDashboardService';
import { useLearnerSurface } from '../context/LearnerSurface.context';

export interface UseLearnerOverviewOptions {
  readonly enabled?: boolean;
}

export function useLearnerOverview(options?: UseLearnerOverviewOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();
  const { academyId } = useLearnerSurface();

  return useApiQuery<LearnerOverviewResponse>({
    queryKey: learnerKeys.overview(user?.id, academyId),
    queryFn: () => learnerDashboardService.getOverview(),
    enabled: enabled && !!user?.id,
  });
}
