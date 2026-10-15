/**
 * D5-4 — telling a protected asset from a public one.
 *
 * A protected asset (a lesson file, a learner's attachment) has no address:
 * the API reports `url: null` and `protected: true`. Either signal is
 * enough, so an asset is never shown as a link or an image when one of the
 * two says it is protected.
 */
import type { MediaAssetSummary, PublicMediaAsset } from '@types';

export function isProtectedMediaAsset(asset: MediaAssetSummary): boolean {
  return asset.protected === true || !asset.url;
}

export function isPublicMediaAsset(
  asset: MediaAssetSummary
): asset is PublicMediaAsset {
  return !isProtectedMediaAsset(asset);
}
