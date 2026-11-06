/**
 * useUploadMediaAsset hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { ApiError } from '@api';
import type { PublicMediaAsset, UploadMediaAssetPayload } from '@types';

export interface UploadMediaAssetVariables {
  readonly academyId: string;
  readonly payload: UploadMediaAssetPayload;
}

export interface UseUploadMediaAssetOptions {
  /**
   * B2 (UX audit) — the caller shows the failure beside its field, so no
   * toast: a corrupt PNG used to get the field's "couldn't be uploaded"
   * AND a toast listing types (GIF, PDF) the field doesn't even accept.
   */
  readonly inlineErrors?: boolean;
}

export function useUploadMediaAsset({
  inlineErrors = false,
}: UseUploadMediaAssetOptions = {}) {
  return useApiMutation<PublicMediaAsset, UploadMediaAssetVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      mediaService.uploadAsset(academyId, payload),
    showSuccessToast: false,
    ...(inlineErrors
      ? { showErrorToast: false, meta: { [INLINE_ERRORS_META]: true } }
      : {}),
    invalidateKeys: [mediaKeys.all],
  });
}
