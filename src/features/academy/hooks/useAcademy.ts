/**
 * useAcademy hook.
 *
 * Fetches a single academy by ID using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { academyService } from '../services/AcademyService';
import type { Academy } from '@types';

export interface UseAcademyOptions {
  readonly enabled?: boolean;
}

export function useAcademy(academyId: string, options?: UseAcademyOptions) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<Academy>({
    queryKey: academyKeys.detail(organization?.id, academyId),
    queryFn: () => academyService.getAcademy(academyId),
    enabled: enabled && !!academyId,
  });
}