/**
 * Platform Founding Service — B2 Founding Academies, the Platform Owner's
 * `platform-founding-academies` API (`PlatformFoundingAcademiesController`).
 *
 * Every type matches the backend's `founding.contract.ts` field for field.
 * Prices are display amounts (not minor units). The locked price is always
 * decided by the server from the live catalog; nothing here sends a price.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type { PaginatedResult, SortDirection } from '@types';

export type FoundingStatus = 'active' | 'revoked' | 'ended';
export type FoundingSortField =
  'seatNumber' | 'createdAt' | 'lockEndsAt' | 'organizationName';

export interface FoundingMoney {
  readonly amount: number;
  readonly currency: string;
}

export interface FoundingPlanRef {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly nameLocalized?: { readonly en?: string; readonly ar?: string };
}

export interface FoundingSubscriptionRef {
  readonly status: string;
  readonly billingCycle?: 'monthly' | 'yearly';
  readonly planKey: string;
  readonly planName: string;
  readonly currentPeriodEnd?: string;
  readonly cancelAtPeriodEnd: boolean;
}

export interface FoundingNextRenewal extends FoundingMoney {
  readonly locked: boolean;
  readonly periodStartsAt: string;
}

export interface FoundingMembership {
  readonly id: string;
  readonly seatNumber: number;
  readonly status: FoundingStatus;
  readonly organization: { readonly id: string; readonly name: string };
  readonly owner: { readonly name: string; readonly email: string };
  readonly plan: FoundingPlanRef;
  readonly lockedPrice: FoundingMoney;
  readonly lockStartsAt: string;
  readonly lockEndsAt: string;
  readonly subscription?: FoundingSubscriptionRef;
  readonly nextRenewal?: FoundingNextRenewal;
  readonly conciergeHoursUsed: number;
  readonly conciergeHoursCap: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FoundingTimelineEntry {
  readonly id: string;
  readonly action: string;
  readonly occurredAt: string;
  readonly actorName?: string;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface FoundingMembershipDetail extends FoundingMembership {
  readonly owner: {
    readonly name: string;
    readonly email: string;
    readonly phone?: string;
  };
  readonly notes?: string;
  readonly revokedAt?: string;
  readonly revokedReason?: string;
  readonly sourceContact?: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly organizationName?: string;
    readonly status: string;
    readonly createdAt: string;
  };
  readonly timeline: readonly FoundingTimelineEntry[];
}

export interface FoundingSeatSummary {
  readonly seatCap: number;
  readonly seatsTaken: number;
  readonly seatsAvailable: number;
  readonly onboardedThisWeek: number;
  readonly weeklyTarget: number;
  readonly weekStartsAt: string;
  readonly counts: {
    readonly active: number;
    readonly ended: number;
    readonly revoked: number;
  };
}

export interface FoundingEligiblePlan extends FoundingPlanRef {
  readonly annualPrice: FoundingMoney;
}

export interface FoundingCandidate {
  readonly id: string;
  readonly name: string;
  readonly ownerName: string;
  readonly ownerEmail: string;
  readonly subscription?: FoundingSubscriptionRef;
}

export interface FoundingQuote {
  readonly organization: { readonly id: string; readonly name: string };
  readonly owner: { readonly name: string; readonly email: string };
  readonly plan: FoundingPlanRef;
  readonly lockedPrice: FoundingMoney;
  readonly nextSeatNumber: number | null;
  readonly alreadyMember: boolean;
  readonly subscription?: FoundingSubscriptionRef;
}

export interface FoundingListQuery {
  readonly pagination?: { readonly page: number; readonly pageSize: number };
  readonly sort?: {
    readonly field: FoundingSortField;
    readonly direction: SortDirection;
  };
  readonly search?: string;
  readonly filters?: { readonly status?: FoundingStatus };
}

export interface CreateFoundingPayload {
  readonly organizationId: string;
  readonly planKey: string;
  readonly sourceContactSubmissionId?: string;
  readonly markContactHandled?: boolean;
  readonly notes?: string;
}

export interface UpdateFoundingPayload {
  readonly expectedUpdatedAt: string;
  readonly notes?: string;
  readonly conciergeHoursUsed?: number;
  readonly planKey?: string;
}

export type FoundingEmailAudience = 'all_active' | 'selected';

export interface FoundingEmailAudiencePayload {
  readonly audience: FoundingEmailAudience;
  readonly membershipIds?: readonly string[];
}

export interface FoundingEmailPayload extends FoundingEmailAudiencePayload {
  readonly subjectEn: string;
  readonly bodyEn: string;
  readonly subjectAr: string;
  readonly bodyAr: string;
  readonly confirmRecipientCount: number;
}

export interface FoundingEmailPreview {
  readonly recipientCount: number;
  readonly recipients: readonly {
    readonly membershipId: string;
    readonly seatNumber: number;
    readonly organizationName: string;
    readonly ownerName: string;
  }[];
  readonly quota: {
    readonly provider: string;
    readonly dailyLimit: number;
    readonly dailyUsed: number;
    readonly remainingToday: number;
  } | null;
}

export class PlatformFoundingService extends BaseService {
  protected readonly resource = 'platform-founding-academies';

  async list(
    query?: FoundingListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<FoundingMembership>> {
    return this.client.get<PaginatedResult<FoundingMembership>>(this.path(), {
      ...options,
      params: {
        ...toCollectionParams<{ readonly status?: FoundingStatus }>(query),
        ...options?.params,
      },
    });
  }

  async summary(options?: ReadOptions): Promise<FoundingSeatSummary> {
    return this.client.get<FoundingSeatSummary>(this.path('summary'), options);
  }

  async plans(options?: ReadOptions): Promise<FoundingEligiblePlan[]> {
    return this.client.get<FoundingEligiblePlan[]>(this.path('plans'), options);
  }

  async candidates(
    search: string,
    options?: ReadOptions
  ): Promise<FoundingCandidate[]> {
    return this.client.get<FoundingCandidate[]>(this.path('candidates'), {
      ...options,
      params: { ...(search.trim() ? { search: search.trim() } : {}) },
    });
  }

  async quote(
    organizationId: string,
    planKey: string,
    options?: ReadOptions
  ): Promise<FoundingQuote> {
    return this.client.get<FoundingQuote>(this.path('quote'), {
      ...options,
      params: { organizationId, planKey },
    });
  }

  async get(
    id: string,
    options?: ReadOptions
  ): Promise<FoundingMembershipDetail> {
    return this.client.get<FoundingMembershipDetail>(this.path(id), options);
  }

  async create(
    payload: CreateFoundingPayload,
    options?: WriteOptions
  ): Promise<FoundingMembershipDetail> {
    return this.client.post<FoundingMembershipDetail, CreateFoundingPayload>(
      this.path(),
      payload,
      options
    );
  }

  async update(
    id: string,
    payload: UpdateFoundingPayload,
    options?: WriteOptions
  ): Promise<FoundingMembershipDetail> {
    return this.client.patch<FoundingMembershipDetail, UpdateFoundingPayload>(
      this.path(id),
      payload,
      options
    );
  }

  async revoke(
    id: string,
    reason: string,
    options?: WriteOptions
  ): Promise<FoundingMembershipDetail> {
    return this.client.post<
      FoundingMembershipDetail,
      { readonly reason: string }
    >(this.path(id, 'revoke'), { reason }, options);
  }

  /** The CSV export as text, for a client-side download. */
  async exportCsv(options?: ReadOptions): Promise<string> {
    const blob = await this.client.get<Blob>(this.path('export'), {
      ...options,
      responseType: 'blob',
    });
    return blob.text();
  }

  async previewEmail(
    payload: FoundingEmailAudiencePayload,
    options?: WriteOptions
  ): Promise<FoundingEmailPreview> {
    return this.client.post<FoundingEmailPreview, FoundingEmailAudiencePayload>(
      this.path('email', 'preview'),
      payload,
      options
    );
  }

  async sendEmail(
    payload: FoundingEmailPayload,
    options?: WriteOptions
  ): Promise<{ readonly sendId: string; readonly queued: number }> {
    return this.client.post<
      { readonly sendId: string; readonly queued: number },
      FoundingEmailPayload
    >(this.path('email'), payload, options);
  }
}

export const platformFoundingService = new PlatformFoundingService();
