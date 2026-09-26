/**
 * Deleting media — single and bulk.
 *
 * "Delete" in the UI is the backend's archive: the asset leaves the
 * library now and its file is destroyed after a 30-day grace period. An
 * asset something still uses is refused (`errors.media.inUse`), so these
 * hooks never toast on their own — the caller turns the outcome into
 * copy that names the usages.
 *
 * Removed ids are dropped from every cached list for the academy before
 * the refetch, so a deleted item disappears at once without resetting the
 * page, search or filter the list was requested with.
 */
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { mediaKeys } from '@services/query';
import { mediaService } from '../services/MediaService';
import type { ApiError } from '@api';
import type {
  MediaAssetDetail,
  MediaAssetSummary,
  MediaBulkArchiveResult,
  PaginatedResult,
} from '@types';

export interface ArchiveMediaAssetVariables {
  readonly academyId: string;
  readonly assetId: string;
}

export interface ArchiveMediaAssetsVariables {
  readonly academyId: string;
  readonly assetIds: readonly string[];
}

/** Drops the given ids from every cached media list of the academy, then refetches. */
async function removeFromLists(
  queryClient: QueryClient,
  academyId: string,
  removedIds: readonly string[]
): Promise<void> {
  if (removedIds.length > 0) {
    const removed = new Set(removedIds);
    queryClient.setQueriesData<PaginatedResult<MediaAssetSummary>>(
      { queryKey: mediaKeys.lists(academyId) },
      (current) => {
        if (!current) return current;
        const items = current.items.filter((item) => !removed.has(item.id));
        const dropped = current.items.length - items.length;
        if (dropped === 0) return current;
        const totalItems = Math.max(0, current.pagination.totalItems - dropped);
        return {
          items,
          pagination: {
            ...current.pagination,
            totalItems,
            totalPages: Math.max(
              1,
              Math.ceil(totalItems / Math.max(1, current.pagination.pageSize))
            ),
          },
        };
      }
    );
  }
  await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
}

export function useArchiveMediaAsset() {
  const queryClient = useQueryClient();
  return useApiMutation<MediaAssetDetail, ArchiveMediaAssetVariables, ApiError>(
    {
      mutationFn: ({ academyId, assetId }) =>
        mediaService.archiveAsset(academyId, assetId),
      showSuccessToast: false,
      showErrorToast: false,
      onSuccess: (_asset, { academyId, assetId }) =>
        removeFromLists(queryClient, academyId, [assetId]),
    }
  );
}

export function useArchiveMediaAssets() {
  const queryClient = useQueryClient();
  return useApiMutation<
    MediaBulkArchiveResult,
    ArchiveMediaAssetsVariables,
    ApiError
  >({
    mutationFn: ({ academyId, assetIds }) =>
      mediaService.archiveAssets(academyId, assetIds),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (result, { academyId }) =>
      removeFromLists(queryClient, academyId, result.archived),
  });
}
