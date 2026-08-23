/**
 * useArchiveMediaAsset hook.
 *
 * Archive is the only lifecycle mutation this domain supports — there is
 * no hard-delete contract (see `media.types.ts`'s `MediaAssetStatus`).
 */
import { useApiMutation } from '@/shared/hooks';
import { mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { ApiError } from '@api';
import type { MediaAssetDetail } from '@types';

export interface ArchiveMediaAssetVariables {
  readonly academyId: string;
  readonly assetId: string;
}

export function useArchiveMediaAsset() {
  return useApiMutation<MediaAssetDetail, ArchiveMediaAssetVariables, ApiError>({
    mutationFn: ({ academyId, assetId }) => mediaService.archiveAsset(academyId, assetId),
    successMessageKey: 'media:actions.archiveSuccess',
    invalidateKeys: [mediaKeys.all],
  });
}
