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

/**
 * `archived` is what the UI calls "deleted": the asset leaves the library
 * immediately and its file is destroyed after the backend's 30-day grace
 * period. There is no immediate hard-delete contract.
 */
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
  /**
   * D5-4 — `null` for a PROTECTED asset (a lesson file or a learner's
   * attachment). It lives in a private bucket and has no address of its
   * own; staff open it through a short-lived grant
   * (`MediaService.getProtectedFileGrant`), learners through the lesson.
   */
  readonly url: string | null;
  /** D5-4 — true for a protected asset, which then has no `url`. */
  readonly protected?: boolean;
  readonly altText?: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly dimensions?: MediaAssetDimensions;
  readonly createdAt: string;
}

/**
 * A library asset that HAS an address — what an upload returns and the only
 * kind the picker hands to a field (a logo, a cover, a website image).
 */
export type PublicMediaAsset = MediaAssetSummary & { readonly url: string };

/** D5-4 — `POST academies/:id/media/:assetId/grant`: a link that expires in minutes. */
export interface MediaFileGrant {
  readonly url: string;
  readonly expiresAt: string;
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

/** Where an asset is still referenced — the backend refuses to delete it while any of these hold. */
export type MediaUsageKind =
  | 'lessonVideo'
  | 'lessonContent'
  | 'lessonResource'
  | 'courseIntroVideo'
  | 'submissionAttachment'
  | 'liveSessionRecording'
  | 'academyLogo'
  | 'courseThumbnail'
  | 'certificateTemplateLogo'
  | 'websiteContent';

export interface MediaUsage {
  readonly kind: MediaUsageKind;
  readonly count: number;
}

/** `POST academies/:id/media/archive-batch` — every id is reported as archived or refused. */
export interface MediaBulkArchiveResult {
  readonly archived: readonly string[];
  readonly refused: readonly {
    readonly id: string;
    readonly reason: 'inUse' | 'notFound';
    readonly usages: readonly MediaUsage[];
  }[];
}
