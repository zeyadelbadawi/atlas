/**
 * Media feature — public entry point.
 */
export { MediaLibraryDialog } from './components/MediaLibraryDialog';
export {
  useMediaAssets,
  useUploadMediaAsset,
  useArchiveMediaAsset,
} from './hooks';
export type {
  UseMediaAssetsOptions,
  UploadMediaAssetVariables,
  ArchiveMediaAssetVariables,
} from './hooks';
export { mediaService, MediaService } from './services/MediaService';
