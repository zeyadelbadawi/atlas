/**
 * W3-compose — wire types of the shared campaign API (mirrors
 * `atlas-backend/src/communications/campaigns/campaign.types.ts`).
 */
export type CampaignScope = 'platform' | 'academy';

export interface CampaignChannels {
  readonly email: boolean;
  readonly inApp: boolean;
}

export type AcademyStaffRole =
  'owner' | 'administrator' | 'manager' | 'instructor' | 'staff';

export const ACADEMY_STAFF_ROLES: readonly AcademyStaffRole[] = [
  'owner',
  'administrator',
  'manager',
  'instructor',
  'staff',
];

export type AcademyAudience =
  | { readonly type: 'learners' }
  | { readonly type: 'courses'; readonly courseIds: readonly string[] }
  | { readonly type: 'staff'; readonly roles: readonly AcademyStaffRole[] };

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'grace_period',
  'paused',
  'trial_expired',
  'cancelled',
  'expired',
] as const;
export type SubscriptionStatusFilter = (typeof SUBSCRIPTION_STATUSES)[number];

export type PlatformAudience =
  | { readonly type: 'org_owners' }
  | {
      readonly type: 'academy_owners';
      readonly planKeys?: readonly string[];
      readonly subscriptionStatuses?: readonly SubscriptionStatusFilter[];
    }
  | { readonly type: 'academy_owners_admins' }
  | { readonly type: 'organization'; readonly organizationId: string };

export type CampaignAudience = AcademyAudience | PlatformAudience;

export interface CampaignQuota {
  /** `null` = unlimited. */
  readonly limit: number | null;
  readonly used: number;
  readonly remaining: number | null;
  readonly periodStart: string;
  readonly resetsAt: string;
}

export interface CampaignPreview {
  readonly recipientCount: number;
  readonly emailCount: number;
  readonly inAppCount: number;
  readonly excluded: {
    readonly optedOut: number;
    readonly suppressed: number;
    readonly blocked: number;
    readonly pending: number;
  };
  readonly requiresConfirmation: boolean;
  readonly quota: CampaignQuota | null;
  readonly overBy: number;
}

export interface CampaignPreviewRequest {
  readonly audience: CampaignAudience;
  readonly channels: CampaignChannels;
}

export interface CampaignSendRequest extends CampaignPreviewRequest {
  readonly idempotencyKey: string;
  readonly subject: string;
  readonly bodyHtml: string;
  readonly contentLocale: 'en' | 'ar';
  readonly expectedRecipientCount: number;
  readonly confirmLargeAudience?: boolean;
}

export interface CampaignAccepted {
  readonly campaignId: string;
  readonly status: string;
  readonly recipientCount: number;
  readonly emailCount: number;
  readonly inAppCount: number;
  readonly replayed: boolean;
  readonly quota: CampaignQuota | null;
}

export type CampaignStatus =
  'queued' | 'expanding' | 'sending' | 'completed' | 'cancelled' | 'failed';

export interface CampaignProgress {
  readonly queued: number;
  readonly sent: number;
  readonly skipped: number;
  readonly failed: number;
  readonly delivered: number;
  readonly bounced: number;
  readonly inApp: number;
  readonly awaitingRelease: number;
}

export interface CampaignSummary {
  readonly id: string;
  readonly scope: CampaignScope;
  readonly status: CampaignStatus;
  readonly subject: string;
  readonly channels: CampaignChannels;
  readonly audience: CampaignAudience;
  readonly recipientCount: number;
  readonly expectedEmailCount: number;
  readonly excluded: {
    readonly optedOut: number;
    readonly suppressed: number;
    readonly quota: number;
  };
  readonly progress: CampaignProgress;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly authorName: string | null;
}

export interface CampaignPage {
  readonly items: readonly CampaignSummary[];
  readonly nextCursor: string | null;
}

/** Limits enforced by the server; mirrored for inline guidance only. */
export const SUBJECT_MAX = 150;
export const BODY_TEXT_MAX = 5000;
export const BODY_HTML_MAX = 20000;
export const LARGE_AUDIENCE = 1000;

export function isActiveCampaign(status: CampaignStatus): boolean {
  return status === 'queued' || status === 'expanding' || status === 'sending';
}
