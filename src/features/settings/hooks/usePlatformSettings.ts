/**
 * usePlatformSettings hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformSettingsKeys } from '@services/query';
import { platformSettingsService } from '../services/PlatformSettingsService';
import type { PlatformConfiguration } from '@types';
import type { ApiError } from '@api';

export function usePlatformSettings() {
  return useApiQuery<PlatformConfiguration, ApiError>({
    queryKey: platformSettingsKeys.configuration(),
    queryFn: () => platformSettingsService.getConfiguration(),
  });
}
