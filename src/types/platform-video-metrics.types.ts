/**
 * Platform video metrics (P64 Phase 4 §E.5) — mirrors the backend
 * `platform-video-metrics.contract.ts` field for field.
 *
 * A SEPARATE type from `PlatformMetricsOverview`, whose contract is a fixed
 * seven KPIs that deliberately never grows. Counts and minutes only: the
 * response carries no tenant names and no asset ids.
 */

export type PlatformVideoTier = 'normal' | 'premium' | 'none';

export interface PlatformVideoTierMetric {
  readonly tier: PlatformVideoTier;
  readonly assets: number;
  readonly storedMinutes: number;
  readonly storedGb: number;
}

export interface PlatformVideoMetrics {
  readonly totalVideoAssets: number;
  readonly totalStoredMinutes: number;
  readonly totalStoredGb: number;
  readonly byTier: readonly PlatformVideoTierMetric[];
  /** Per media-asset provider (`r2` | `r2_worker` | `cloudflare_stream`). */
  readonly byProvider: Readonly<Record<string, number>>;
  /** Per processing status — a rising `failed` count is the provider-health signal. */
  readonly processing: {
    readonly pending: number;
    readonly processing: number;
    readonly ready: number;
    readonly failed: number;
  };
  readonly generatedAt: string;
}
