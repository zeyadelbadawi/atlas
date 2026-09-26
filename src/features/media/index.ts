/**
 * Media feature — public entry point.
 */
export { MediaLibraryDialog } from './components/MediaLibraryDialog';
export {
  useMediaAssets,
  useUploadMediaAsset,
  useArchiveMediaAsset,
  useArchiveMediaAssets,
} from './hooks';
export type {
  UseMediaAssetsOptions,
  UploadMediaAssetVariables,
  ArchiveMediaAssetVariables,
  ArchiveMediaAssetsVariables,
} from './hooks';
export { mediaService, MediaService } from './services/MediaService';
