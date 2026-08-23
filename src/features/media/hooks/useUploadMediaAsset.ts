/**
 * useUploadMediaAsset hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { ApiError } from '@api';
import type { MediaAssetDetail, UploadMediaAssetPayload } from '@types';

export interface UploadMediaAssetVariables {
  readonly academyId: string;
  readonly payload: UploadMediaAssetPayload;
}

export function useUploadMediaAsset() {
  return useApiMutation<MediaAssetDetail, UploadMediaAssetVariables, ApiError>({
    mutationFn: ({ academyId, payload }) => mediaService.uploadAsset(academyId, payload),
    showSuccessToast: false,
    invalidateKeys: [mediaKeys.all],
  });
}
