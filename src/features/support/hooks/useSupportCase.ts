/**
 * useSupportCase hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type { SupportCaseDetail } from '@types';
import type { ApiError } from '@api';

export function useSupportCase(caseId: string) {
  return useApiQuery<SupportCaseDetail, ApiError>({
    queryKey: supportKeys.detail(caseId),
    queryFn: () => supportService.getCase(caseId),
    enabled: !!caseId,
  });
}
