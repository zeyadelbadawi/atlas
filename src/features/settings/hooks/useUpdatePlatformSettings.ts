/**
 * useUpdatePlatformSettings hook.
 *
 * Both `GeneralSettings` and `SecuritySettings` share this one mutation —
 * each patches only the fields it owns, never the whole object.
 */
import { useApiMutation } from '@/shared/hooks';
import { platformSettingsKeys } from '@services/query';
import { platformSettingsService } from '../services/PlatformSettingsService';
import type { ApiError } from '@api';
import type { PlatformConfiguration } from '@types';

export function useUpdatePlatformSettings() {
  return useApiMutation<PlatformConfiguration, Partial<PlatformConfiguration>, ApiError>({
    mutationFn: (payload) => platformSettingsService.updateConfiguration(payload),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [platformSettingsKeys.all],
  });
}
