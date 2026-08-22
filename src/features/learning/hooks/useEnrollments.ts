/**
 * useEnrollments hook.
 *
 * Fetches the current student's enrollments using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { enrollmentKeys } from '@services/query';
import { enrollmentService } from '../services/EnrollmentService';
import type { CollectionQuery, Enrollment, PaginatedResult } from '@types';

export interface UseEnrollmentsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useEnrollments(options?: UseEnrollmentsOptions) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Enrollment>>({
    queryKey: enrollmentKeys.list(user?.id),
    queryFn: () => enrollmentService.getEnrollments(query),
    enabled: enabled && !!user?.id,
  });
}
