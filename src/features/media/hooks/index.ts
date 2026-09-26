/**
 * Media hooks — public entry point.
 */
export { useMediaAssets } from './useMediaAssets';
export type { UseMediaAssetsOptions } from './useMediaAssets';
export { useUploadMediaAsset } from './useUploadMediaAsset';
export type { UploadMediaAssetVariables } from './useUploadMediaAsset';
export {
  useArchiveMediaAsset,
  useArchiveMediaAssets,
} from './useArchiveMediaAsset';
export type {
  ArchiveMediaAssetVariables,
  ArchiveMediaAssetsVariables,
} from './useArchiveMediaAsset';
export { useUpdateMediaAsset } from './useUpdateMediaAsset';
export type { UpdateMediaAssetVariables } from './useUpdateMediaAsset';
export { useMediaDeletion, MEDIA_BULK_DELETE_LIMIT } from './useMediaDeletion';
export type {
  MediaDeletionOutcome,
  RefusedMediaItem,
  UseMediaDeletionResult,
} from './useMediaDeletion';
