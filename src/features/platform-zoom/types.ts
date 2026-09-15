/**
 * Zoom Operations Center types — mirrors `platform-zoom.contract.ts`
 * on the backend exactly.
 *
 * NOTE WHAT IS NOT HERE: no token, no credential, no raw payload, no
 * signature, and no unmasked provider account id. The server never sends
 * them, and this file is the record of that contract.
 */
export type ZoomConnectionStatus =
  | 'not_connected'
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'error'
  | 'reconnect_required';

export type ZoomSessionStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'cancelled'
  | 'failed';

export type ZoomAttentionSeverity = 'critical' | 'warning' | 'info';

export interface ZoomConnectionRow {
  readonly academyId: string;
  readonly academyName: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly addOnInstalled: boolean;
  readonly status: ZoomConnectionStatus;
  readonly maskedAccountId?: string;
  readonly connectedAt?: string;
  readonly lastCheckedAt?: string;
  readonly lastCheckReason?: string;
  readonly lastEventAt?: string;
  readonly hasIssue: boolean;
}

export interface ZoomLiveSessionRow {
  readonly id: string;
  readonly title: string;
  readonly academyId: string;
  readonly academyName: string;
  readonly organizationName: string;
  readonly courseTitle?: string;
  readonly hostName?: string;
  readonly status: ZoomSessionStatus;
  readonly scheduledStartAt: string;
  readonly scheduledEndAt: string;
  readonly provisioned: boolean;
  readonly recordingEnabled: boolean;
  readonly recordingStatus?: string;
  readonly attendanceReconciledAt?: string;
  readonly reconciliationAttempts: number;
  readonly failureReason?: string;
  readonly atRisk: boolean;
  readonly riskReason?: string;
}

export interface ZoomAttentionItem {
  readonly kind: string;
  readonly severity: ZoomAttentionSeverity;
  readonly count: number;
}

export interface ZoomActivityRow {
  readonly id: string;
  readonly action: string;
  readonly academyId?: string;
  readonly organizationId?: string;
  readonly actorName?: string;
  readonly occurredAt: string;
}

export interface ZoomOverview {
  readonly connections: {
    readonly connected: number;
    readonly reconnectRequired: number;
    readonly revoked: number;
    readonly expired: number;
    readonly error: number;
    readonly notConnected: number;
    readonly notInstalled: number;
  };
  readonly sessions: {
    readonly live: number;
    readonly upcoming: number;
    readonly ended: number;
    readonly cancelled: number;
    readonly failed: number;
    readonly unprovisioned: number;
  };
  readonly events: {
    readonly received: number;
    readonly processed: number;
    readonly unmatched: number;
    readonly failed: number;
  };
  readonly needsAttention: readonly ZoomAttentionItem[];
  readonly upcomingAtRisk: readonly ZoomLiveSessionRow[];
  readonly recentActivity: readonly ZoomActivityRow[];
}

export interface ZoomConnectionsQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: ZoomConnectionStatus;
  readonly organizationId?: string;
  readonly issuesOnly?: boolean;
}

export interface ZoomSessionsQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: ZoomSessionStatus;
  readonly academyId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly atRiskOnly?: boolean;
}

/* ---- Part 2 ---- */
export type ZoomReconciliationState = 'reconciled' | 'pending' | 'failing' | 'not_due';

export interface ZoomAttendanceRow {
  readonly sessionId: string;
  readonly title: string;
  readonly academyName: string;
  readonly organizationName: string;
  readonly courseTitle?: string;
  readonly status: ZoomSessionStatus;
  readonly scheduledStartAt: string;
  readonly endedAt?: string;
  readonly reconciledAt?: string;
  readonly reconciliationAttempts: number;
  readonly participantCount: number;
  readonly reconciliationState: ZoomReconciliationState;
}

export interface ZoomRecordingRow {
  readonly recordingId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly academyName: string;
  readonly organizationName: string;
  readonly status: string;
  readonly fileCount: number;
  readonly quotaConsumed: boolean;
  readonly failureReason?: string;
  readonly createdAt: string;
  readonly availableAt?: string;
}

export interface ZoomEventRow {
  readonly id: string;
  readonly eventType: string;
  readonly status: string;
  readonly academyName?: string;
  readonly sessionTitle?: string;
  readonly failureReason?: string;
  readonly receivedAt: string;
  readonly processedAt?: string;
}

export interface ZoomEventHealth {
  readonly received: number;
  readonly processed: number;
  readonly unmatched: number;
  readonly failed: number;
  readonly byType: readonly { readonly eventType: string; readonly count: number }[];
}

export interface ZoomHealthIssueGroup {
  readonly kind: string;
  readonly severity: ZoomAttentionSeverity;
  readonly count: number;
  readonly samples: readonly { readonly academyId: string; readonly academyName: string }[];
}

export interface ZoomHealthResponse {
  readonly groups: readonly ZoomHealthIssueGroup[];
}

export interface ZoomAcademyDetail {
  readonly academyId: string;
  readonly academyName: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly addOnInstalled: boolean;
  readonly connection: {
    readonly status: ZoomConnectionStatus;
    readonly maskedAccountId?: string;
    readonly connectedAt?: string;
    readonly lastCheckedAt?: string;
    readonly lastCheckReason?: string;
  };
  readonly sessions: {
    readonly upcoming: number;
    readonly live: number;
    readonly ended: number;
    readonly failed: number;
    readonly atRisk: number;
  };
  readonly attendance: { readonly reconciled: number; readonly pending: number };
  readonly recordings: {
    readonly available: number;
    readonly processing: number;
    readonly failed: number;
    readonly quotaUsed: number;
    readonly quotaLimit: number | 'unlimited';
    readonly quotaRemaining: number | null;
  };
  readonly upcomingAtRisk: readonly ZoomLiveSessionRow[];
  readonly recentActivity: readonly ZoomActivityRow[];
}

export interface ZoomListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly academyId?: string;
  readonly organizationId?: string;
  readonly status?: string;
  readonly state?: ZoomReconciliationState;
  readonly eventType?: string;
  readonly action?: string;
}
