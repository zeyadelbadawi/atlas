/**
 * usePlatformAcademy hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformAcademyKeys } from '@services/query';
import { platformAcademyService } from '../services/PlatformAcademyService';
import type { PlatformAcademyDetail } from '@types';
import type { ApiError } from '@api';

export function usePlatformAcademy(academyId: string) {
  return useApiQuery<PlatformAcademyDetail, ApiError>({
    queryKey: platformAcademyKeys.detail(academyId),
    queryFn: () => platformAcademyService.getAcademy(academyId),
    enabled: !!academyId,
  });
}
