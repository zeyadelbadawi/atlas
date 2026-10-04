/**
 * W3 — wire types of the Platform Owner's Academy Email Activity and OTP &
 * Security Monitoring APIs. Mirrors the backend contracts
 * (`academy-email-activity.contract.ts`, `security-monitoring.contract.ts`).
 * Nothing here can hold an email body, a code, a full address or an IP.
 */

export const EMAIL_ACTIVITY_STATUSES = [
  'queued',
  'retrying',
  'waiting',
  'sent',
  'delivered',
  'delayed',
  'bounced',
  'complained',
  'not_sent',
  'in_app_only',
  'suppressed',
  'failed',
] as const;
export type EmailActivityStatus = (typeof EMAIL_ACTIVITY_STATUSES)[number];

export type EmailErrorCategory =
  | 'recipient_preference'
  | 'daily_limit'
  | 'address_suppressed'
  | 'recipient_unavailable'
  | 'source_deleted'
  | 'configuration'
  | 'quota'
  | 'provider_rejected'
  | 'provider_unavailable'
  | 'bounce_hard'
  | 'bounce_soft'
  | 'complaint'
  | 'unknown';

export interface EmailActivityItem {
  readonly id: string;
  readonly key: string;
  readonly category: string;
  readonly security: boolean;
  readonly status: EmailActivityStatus;
  readonly deliveryStatus: string | null;
  readonly provider: string | null;
  readonly errorCategory: EmailErrorCategory | null;
  readonly recipient: { readonly maskedEmail: string | null };
  readonly academy: { readonly id: string; readonly name: string | null };
  readonly locale: string;
  readonly attempts: number;
  readonly createdAt: string;
  readonly dispatchedAt: string | null;
  readonly deliveryUpdatedAt: string | null;
}

export interface EmailActivityPage {
  readonly items: readonly EmailActivityItem[];
  readonly nextCursor: string | null;
  readonly window: { readonly from: string; readonly to: string };
}

export interface EmailActivityAcademySummary {
  readonly academyId: string;
  readonly academyName: string | null;
  readonly total: number;
  readonly byStatus: Readonly<Record<EmailActivityStatus, number>>;
}

export interface EmailActivitySummary {
  readonly window: { readonly from: string; readonly to: string };
  readonly total: number;
  readonly byStatus: Readonly<Record<EmailActivityStatus, number>>;
  readonly academies: readonly EmailActivityAcademySummary[];
  readonly deliveryWebhooksObserved: boolean;
}

export interface EmailActivityFilters {
  readonly academyId?: string;
  readonly status?: EmailActivityStatus;
  readonly key?: string;
  readonly from?: string;
  readonly to?: string;
}

export const SECURITY_EVENT_TYPES = [
  'otp_sent',
  'otp_resent',
  'otp_verified',
  'otp_failed',
  'otp_expired',
  'otp_locked',
  'otp_rate_limited',
  'otp_suppressed',
  'deletion_code_sent',
  'deletion_code_verified',
  'deletion_code_failed',
  'deletion_code_locked',
  'deletion_code_rate_limited',
  'signin_rate_limited',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export interface SecurityMonitoringTotals {
  readonly otpSent: number;
  readonly otpResent: number;
  readonly otpVerified: number;
  readonly otpFailed: number;
  readonly otpExpired: number;
  readonly otpLocked: number;
  readonly otpSuppressed: number;
  readonly otpRateLimited: number;
  readonly signinRateLimited: number;
  readonly deletionCodeSent: number;
  readonly deletionCodeVerified: number;
  readonly deletionCodeFailed: number;
  readonly deletionCodeLocked: number;
  readonly deletionCodeRateLimited: number;
}

export interface SecurityMonitoringDay {
  readonly date: string;
  readonly sent: number;
  readonly verified: number;
  readonly failed: number;
  readonly locked: number;
  readonly rateLimited: number;
}

export interface SecurityMonitoringSummary {
  readonly windowDays: number;
  readonly totals: SecurityMonitoringTotals;
  readonly verifyRate: number | null;
  readonly series: readonly SecurityMonitoringDay[];
  readonly generatedAt: string;
}

export interface SecurityEventItem {
  readonly id: string;
  readonly type: SecurityEventType;
  readonly surface: 'management' | 'academy' | null;
  readonly academy: {
    readonly id: string;
    readonly name: string | null;
  } | null;
  readonly maskedEmail: string | null;
  readonly subjectRef: string | null;
  readonly ipRef: string | null;
  readonly reason: string | null;
  readonly attemptsRemaining: number | null;
  readonly occurrences: number;
  readonly createdAt: string;
}

export interface SecurityEventPage {
  readonly items: readonly SecurityEventItem[];
  readonly nextCursor: string | null;
}

export interface SecurityMonitoringFilters {
  readonly days?: number;
  readonly surface?: 'management' | 'academy';
  readonly type?: SecurityEventType;
  /** Hashed server-side; never stored or echoed. */
  readonly email?: string;
  /** Hashed server-side; never stored or echoed. */
  readonly ip?: string;
}
