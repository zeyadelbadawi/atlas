/**
 * Media Library types (Prompt 13).
 *
 * A shared, academy-scoped asset domain — replacing scattered per-field
 * base64 blobs (`WebsiteImageField` and every other upload surface) with
 * one real, listable, reusable asset contract. This file does not invent
 * an upload API: `UploadMediaAssetPayload` reuses the SAME base64
 * data-URL encoding `WebsiteImageField` already produces via
 * `useFilePicker` + `FileReader` — there is still no multipart/
 * presigned-URL contract anywhere in Atlas, and this file does not add
 * one. What it adds is the missing piece: a real backend RESOURCE
 * (`academies/:academyId/media`) an asset can be listed from, searched,
 * and reused across multiple fields — instead of every field silently
 * discarding its blob the moment the form unmounts.
 */

export type MediaAssetType = 'image' | 'video' | 'document' | 'other';

/** Archiving is the only lifecycle mutation offered — there is no hard-delete contract. */
export type MediaAssetStatus = 'active' | 'archived';

/** Present only for `image`/`video` assets where the backend can determine it — never guessed client-side. */
export interface MediaAssetDimensions {
  readonly width: number;
  readonly height: number;
}

/** One asset in the academy's Media Library. */
export interface MediaAssetSummary {
  readonly id: string;
  readonly academyId: string;
  readonly type: MediaAssetType;
  readonly status: MediaAssetStatus;
  readonly fileName: string;
  readonly url: string;
  readonly altText?: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly dimensions?: MediaAssetDimensions;
  readonly createdAt: string;
}

/** No additional fields beyond the summary today — kept as its own type for symmetry with every other domain's summary/detail pair, and so a future backend-only detail field never requires a call-site rewrite. */
export type MediaAssetDetail = MediaAssetSummary;

export interface UploadMediaAssetPayload {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly dataUrl: string;
  readonly altText?: string;
}

export interface UpdateMediaAssetPayload {
  readonly altText?: string;
}
