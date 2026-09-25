/**
 * Academy content protection, video tier and device policy (P64 Phase 2).
 *
 * Mirrors the backend contracts exactly
 * (`learning/controllers/academy-protection.controller.ts`):
 *  - `GET/PATCH /academies/:id/content-protection`
 *  - `GET/PATCH /academies/:id/video-tier`
 *  - `GET/PATCH /academies/:id/device-policy`
 *
 * All three are Client-Owner-only for READ as well as write
 * (`assertCanManageSecurityPolicy`); anyone else gets
 * `403 errors.academy.insufficientRole`.
 */

/** `academies.content_protection`, resolved — a missing value is the stronger default. */
export interface AcademyContentProtection {
  /** Draw a per-viewer identifying overlay on hosted video. */
  readonly watermark: boolean;
  /** Replaces the overlay text; `null` shows the viewer's own short id. Max 80 chars. */
  readonly watermarkText: string | null;
  readonly disableDownload: boolean;
  readonly disablePip: boolean;
  readonly disableContextMenu: boolean;
}

/** PATCH body — every boolean is required; `watermarkText` blank/omitted clears it. */
export interface UpdateAcademyContentProtectionPayload {
  readonly contentProtection: {
    readonly watermark: boolean;
    readonly watermarkText?: string;
    readonly disableDownload: boolean;
    readonly disablePip: boolean;
    readonly disableContextMenu: boolean;
  };
}

export type VideoSecurityTier = 'normal' | 'premium';

export interface AcademyVideoTierSettings {
  readonly academyId: string;
  /** The tier NEW uploads get. */
  readonly videoSecurityTier: VideoSecurityTier;
  /** The ceiling the organization's plan family allows. */
  readonly entitled: VideoSecurityTier;
  /** `plan` when the academy has no (valid) choice of its own. */
  readonly source: 'academy' | 'plan';
}

export interface UpdateAcademyVideoTierPayload {
  readonly videoSecurityTier: VideoSecurityTier;
}

export type AcademyDevicePolicySource =
  'academy' | 'plan' | 'platform' | 'default';

export interface AcademyDevicePolicy {
  readonly academyId: string;
  readonly maxDevices: number;
  readonly maxConcurrentSessions: number;
  readonly source: AcademyDevicePolicySource;
  readonly platformMaxDevices: number;
  readonly platformMaxConcurrentSessions: number;
}

/** DTO bounds: 1–20 devices, 1–10 sessions, and never above the platform maximum. */
export interface UpdateAcademyDevicePolicyPayload {
  readonly maxDevices: number;
  readonly maxConcurrentSessions: number;
}
