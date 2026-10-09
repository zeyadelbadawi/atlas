/**
 * Platform Watermark Service — the Platform Owner's forensic watermark
 * lookup (docs/FORENSIC_WATERMARK.md, `GET platform/watermarks/:code`).
 *
 * Every course video carries a per-viewer code (`7K3QM-X9TR7`). When a
 * screen recording leaks, the operator reads the code off the recording
 * and this returns who it was issued to, for which content, on which
 * session and device.
 *
 * The endpoint is guarded server-side by `JwtAuthGuard` +
 * `ManagementSurfaceGuard` + `PlatformOwnerGuard`, rate-limited per IP and
 * per owner, audited on every call (`platform.watermark.looked_up`) and
 * answered `Cache-Control: private, no-store`; RLS admits the rows to a
 * Platform Owner only. The route guard in this app is a convenience.
 *
 * The code travels in the PATH (never a query string), one encoded segment.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';

/** Mirrors the backend's `ForensicWatermarkSurface` enum. */
export type WatermarkSurface =
  'lesson_video' | 'course_preview' | 'live_session';

export type WatermarkAccountState =
  'active' | 'suspended' | 'deleted' | 'missing' | 'anonymous';

export type WatermarkSnapshotStatus = 'ok' | 'absent' | 'unreadable';

export type WatermarkDeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

/** Matches `WatermarkRelatedCode` (backend `forensic-watermark.contract.ts`). */
export interface WatermarkRelatedCode {
  readonly code: string;
  readonly surface: WatermarkSurface;
  readonly courseTitle: string | null;
  readonly lessonTitle: string | null;
  readonly liveSessionTitle: string | null;
  readonly issuedAt: string;
  readonly lastSeenAt: string;
  readonly tamperEvents: number;
}

/**
 * Matches `WatermarkLookupResponse` (backend
 * `src/forensic-watermark/dto/forensic-watermark.contract.ts`) field for
 * field. Personal data: never persisted, never logged.
 */
export interface WatermarkLookupResponse {
  /** Display form, `XXXXX-XXXXX`. */
  readonly code: string;
  readonly surface: WatermarkSurface;
  readonly issuedAt: string;
  readonly lastSeenAt: string;
  readonly tamperEvents: number;
  readonly lastTamperAt: string | null;
  readonly account: {
    readonly userId: string | null;
    readonly state: WatermarkAccountState;
    /** Present only while the account still exists and is not deleted. */
    readonly currentName: string | null;
    readonly currentEmail: string | null;
    readonly deletedAt: string | null;
  };
  /** Decrypted identity at issue time. Null for an anonymous preview. */
  readonly identityAtIssue: {
    readonly name: string | null;
    readonly email: string | null;
    /** E.164. */
    readonly phone: string | null;
    /** ISO 3166-1 alpha-2. */
    readonly phoneCountry: string | null;
  } | null;
  /** `ok`, `absent` (anonymous preview) or `unreadable` (tampered row or rotated key). */
  readonly snapshotStatus: WatermarkSnapshotStatus;
  readonly content: {
    readonly organization: {
      readonly id: string | null;
      readonly name: string | null;
    };
    readonly academy: { readonly id: string; readonly name: string | null };
    readonly course: {
      readonly id: string;
      readonly title: string | null;
    } | null;
    readonly lesson: {
      readonly id: string;
      readonly title: string | null;
    } | null;
    readonly liveSession: {
      readonly id: string;
      readonly title: string | null;
      readonly scheduledStartAt: string | null;
    } | null;
  };
  readonly session: {
    readonly id: string | null;
    readonly startedAt: string | null;
    readonly signInIp: string | null;
    readonly signInCountry: string | null;
    readonly signInDevice: string | null;
  };
  readonly device: {
    readonly id: string | null;
    readonly label: string | null;
    readonly userAgent: string | null;
    readonly browser: string | null;
    readonly os: string | null;
    readonly type: WatermarkDeviceType;
  };
  readonly network: {
    readonly ip: string | null;
    readonly country: string | null;
  };
  /** Every other code issued to the same session (or, anonymously, the same device). */
  readonly relatedInSession: readonly WatermarkRelatedCode[];
}

export class PlatformWatermarkService extends BaseService {
  // `path()` encodes each segment on its own, so the two-segment resource
  // is `'platform'` + `'watermarks'` and the code is its own segment —
  // never one string containing a slash.
  protected readonly resource = 'platform';

  /**
   * `GET platform/watermarks/:code` — `code` should already be normalised
   * (`normalizeWatermarkCode`); the server normalises and re-checks it
   * anyway.
   */
  async lookup(
    code: string,
    options?: ReadOptions
  ): Promise<WatermarkLookupResponse> {
    return this.client.get<WatermarkLookupResponse>(
      this.path('watermarks', code),
      options
    );
  }
}

export const platformWatermarkService = new PlatformWatermarkService();
