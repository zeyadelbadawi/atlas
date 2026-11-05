/**
 * Platform communication settings hooks (P66).
 *
 * A second singleton beside `usePlatformSettings`, on its own endpoint
 * and key: the Communications tab saves a whole validated form, while
 * the General/Security tabs patch single fields, and mixing the two
 * into one cache entry would make each tab's save clobber the other's.
 */
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, platformSettingsKeys } from '@services/query';
import { platformSettingsService } from '../services/PlatformSettingsService';
import type { ApiError } from '@api';
import type {
  PlatformCommunicationSettings,
  UpdatePlatformCommunicationSettingsPayload,
} from '@types';

export function usePlatformCommunicationSettings() {
  return useApiQuery<PlatformCommunicationSettings, ApiError>({
    queryKey: platformSettingsKeys.communications(),
    queryFn: () => platformSettingsService.getCommunications(),
  });
}

export function useUpdatePlatformCommunicationSettings() {
  return useApiMutation<
    PlatformCommunicationSettings,
    UpdatePlatformCommunicationSettingsPayload,
    ApiError
  >({
    mutationFn: (payload) =>
      platformSettingsService.updateCommunications(payload),
    showSuccessToast: false,
    showErrorToast: false,
    // B1 (V20) — the tab shows a failure once (on its field, or one inline
    // message); the app-wide toast stays quiet.
    meta: { [INLINE_ERRORS_META]: true },
    invalidateKeys: [platformSettingsKeys.communications()],
  });
}
