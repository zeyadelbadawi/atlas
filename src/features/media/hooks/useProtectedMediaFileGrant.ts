/**
 * useProtectedMediaFileGrant hook.
 *
 * D5-4 — asks for a short-lived link to one protected file. Nothing is
 * cached or invalidated: the link expires in minutes and is used at once.
 */
import { useApiMutation } from '@/shared/hooks';
import { mediaService } from '../services/MediaService';
import type { MediaFileGrant } from '@types';
import type { ApiError } from '@api';

export interface ProtectedMediaFileGrantVariables {
  readonly academyId: string;
  readonly assetId: string;
}

export function useProtectedMediaFileGrant() {
  return useApiMutation<
    MediaFileGrant,
    ProtectedMediaFileGrantVariables,
    ApiError
  >({
    mutationFn: ({ academyId, assetId }) =>
      mediaService.getProtectedFileGrant(academyId, assetId),
    showSuccessToast: false,
    errorMessageKey: 'media:protected.openError',
  });
}
