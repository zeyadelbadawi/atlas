/**
 * usePlatformUser hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformUserKeys } from '@services/query';
import { platformUserService } from '../services/PlatformUserService';
import type { PlatformUserDetail } from '@types';
import type { ApiError } from '@api';

export function usePlatformUser(userId: string) {
  return useApiQuery<PlatformUserDetail, ApiError>({
    queryKey: platformUserKeys.detail(userId),
    queryFn: () => platformUserService.getUser(userId),
    enabled: !!userId,
  });
}
