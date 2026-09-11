/**
 * useUpdateMediaAsset hook.
 *
 * The metadata half of the library: alt text and file name. The asset's
 * BYTES are immutable — there is no re-upload contract, and replacing a
 * file in place would silently change every page already using it. A new
 * file is a new asset.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { MediaAssetDetail, UpdateMediaAssetPayload } from '@types';
import type { ApiError } from '@api';

export interface UpdateMediaAssetVariables {
  readonly academyId: string;
  readonly assetId: string;
  readonly payload: UpdateMediaAssetPayload;
}

export function useUpdateMediaAsset() {
  const { invalidate } = useInvalidate();

  return useApiMutation<MediaAssetDetail, UpdateMediaAssetVariables, ApiError>({
    mutationFn: ({ academyId, assetId, payload }) =>
      mediaService.updateAsset(academyId, assetId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(mediaKeys.all);
    },
  });
}
