/**
 * useInstructorDashboard hook.
 *
 * Fetches the current instructor's aggregated teaching metrics.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { InstructorDashboardMetrics } from '@types';

export interface UseInstructorDashboardOptions {
  readonly enabled?: boolean;
}

export function useInstructorDashboard(options?: UseInstructorDashboardOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<InstructorDashboardMetrics>({
    queryKey: instructorKeys.dashboard(user?.id),
    queryFn: () => instructorService.getDashboard(),
    enabled: enabled && !!user?.id,
  });
}
