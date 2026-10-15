/**
 * B0-ANL-04 (part 3) — `GET /platform-metrics/growth`, matching
 * `PlatformGrowthMetricsResponse` (atlas-backend) field-for-field.
 *
 * Cohorts by SIGNUP WEEK (Africa/Cairo, weeks start Monday): of the
 * organizations created that week, how many have reached each activation
 * step so far. Internal (test/demo/staff) organizations are never counted.
 */
export interface PlatformGrowthFunnelCounts {
  readonly signups: number;
  readonly academyCreated: number;
  readonly coursePublished: number;
  readonly firstEnrolment: number;
  readonly firstPayment: number;
}

export interface PlatformGrowthCohort extends PlatformGrowthFunnelCounts {
  /** `YYYY-MM-DD` — the Monday that starts the week. */
  readonly weekStart: string;
}

export interface PlatformGrowthSource {
  /** UTM source, else the referrer host; `null` = untagged. */
  readonly source: string | null;
  readonly signups: number;
}

export interface PlatformGrowthMetrics {
  readonly timeZone: string;
  readonly weeks: number;
  /** Oldest first; every week of the window, zeros included. */
  readonly cohorts: readonly PlatformGrowthCohort[];
  readonly totals: PlatformGrowthFunnelCounts;
  readonly sources: readonly PlatformGrowthSource[];
  readonly excludesInternalOrganizations: true;
  readonly generatedAt: string;
}
