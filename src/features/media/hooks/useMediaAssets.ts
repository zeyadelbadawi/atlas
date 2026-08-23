/**
 * useMediaAssets hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { CollectionQuery, MediaAssetSummary, PaginatedResult } from '@types';
import type { ApiError } from '@api';

export interface UseMediaAssetsOptions {
  readonly query?: CollectionQuery;
}

export function useMediaAssets(academyId: string | undefined, options?: UseMediaAssetsOptions) {
  return useApiQuery<PaginatedResult<MediaAssetSummary>, ApiError>({
    queryKey: mediaKeys.list(academyId, options?.query),
    queryFn: () => mediaService.getAssets(academyId as string, options?.query),
    enabled: !!academyId,
  });
}
