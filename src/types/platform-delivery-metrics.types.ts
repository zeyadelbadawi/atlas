/**
 * Platform content-delivery metrics (P64 Phase 4) — mirrors the backend
 * `GET /platform-metrics/delivery` contract field for field.
 *
 * Three concerns the Platform Owner reads together: whether learners are
 * being let in or turned away (`grants`), the video inventory and its
 * processing health (`video`, the same shape `/platform-metrics/video`
 * answers), and whether the retention jobs are keeping up (`retention`).
 */
import type { PlatformVideoMetrics } from './platform-video-metrics.types';

export interface PlatformDeliveryGrants {
  readonly granted: number;
  readonly refused: number;
  /** Keyed by the backend's refusal reason code. */
  readonly refusedByReason: Readonly<Record<string, number>>;
  /** The reason breakdown was capped, so the rows describe a subset. */
  readonly truncated: boolean;
}

export interface PlatformDeliveryRetention {
  /** Rows older than the retention window that the purge job has not yet removed. */
  readonly contentAccessLogRowsPastWindow: number;
  readonly quizAttemptEventsPastWindow: number;
}

export interface PlatformDeliveryMetrics {
  readonly windowDays: number;
  readonly generatedAt: string;
  readonly grants: PlatformDeliveryGrants;
  readonly video: PlatformVideoMetrics;
  readonly retention: PlatformDeliveryRetention;
}
