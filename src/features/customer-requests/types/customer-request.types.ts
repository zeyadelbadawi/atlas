/**
 * Customer Requests — wire types.
 *
 * Mirrors `atlas-backend/src/customer-requests/dto/customer-request.contract.ts`
 * field-for-field (and the request DTOs beside it). A request is a custom
 * service an academy's owner/administrator asks the Atlas team for — a
 * logo, a custom domain, a theme, a website section or a feature — with a
 * lifecycle, a conversation and a history.
 */
import type { SortDirection } from '@types';

export type CustomerRequestType =
  'logo' | 'domain' | 'theme' | 'custom_section' | 'custom_feature';

export type CustomerRequestStatus =
  | 'submitted'
  | 'received'
  | 'under_review'
  | 'in_progress'
  | 'waiting_for_customer'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type CustomerRequestPriority = 'low' | 'normal' | 'high';

export type CustomerRequestEventKind =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'customer_message'
  | 'team_message'
  | 'internal_note';

/** A list filter value: one status, or every status that is not closed. */
export type CustomerRequestStatusFilter = CustomerRequestStatus | 'open';

export type CustomerRequestSortField = 'lastActivityAt' | 'createdAt' | 'title';

/** The contextual answers a request carries (keys depend on its type). */
export type CustomerRequestDetails = Readonly<Record<string, string | boolean>>;

export interface CustomerRequestPersonRef {
  readonly id: string;
  readonly name: string;
}

export interface CustomerRequestSummary {
  readonly id: string;
  /** `CR-XXXXXXXX` — a short reference for emails and conversations. */
  readonly reference: string;
  readonly type: CustomerRequestType;
  readonly title: string;
  readonly status: CustomerRequestStatus;
  readonly priority: CustomerRequestPriority;
  readonly academy: CustomerRequestPersonRef;
  readonly requester: { readonly name: string };
  readonly createdAt: string;
  readonly lastActivityAt: string;
}

export interface CustomerRequestEvent {
  readonly id: string;
  readonly kind: CustomerRequestEventKind;
  /** Present only in the platform view; academy views only hold customer-visible events. */
  readonly visibility?: 'customer' | 'internal';
  readonly actorSide: 'customer' | 'team';
  readonly actorName: string;
  readonly body: string | null;
  readonly fromStatus: CustomerRequestStatus | null;
  readonly toStatus: CustomerRequestStatus | null;
  readonly assignee?: CustomerRequestPersonRef | null;
  readonly createdAt: string;
}

export interface CustomerRequestDetail extends CustomerRequestSummary {
  readonly description: string;
  readonly details: CustomerRequestDetails;
  readonly closedAt: string | null;
  readonly events: readonly CustomerRequestEvent[];
  /** What the customer may do now. */
  readonly canCancel: boolean;
  readonly canReply: boolean;
}

export interface PlatformCustomerRequestSummary extends CustomerRequestSummary {
  readonly organization: CustomerRequestPersonRef;
  readonly assignee: CustomerRequestPersonRef | null;
}

export interface PlatformCustomerRequestDetail extends CustomerRequestDetail {
  readonly organization: CustomerRequestPersonRef;
  readonly requesterEmail: string;
  readonly assignee: CustomerRequestPersonRef | null;
  /** Statuses the team may move this request to now. */
  readonly allowedStatuses: readonly CustomerRequestStatus[];
  /** Where its emails go (the configured team inbox), or `null` → every Platform Owner. */
  readonly routedTo: string | null;
}

export interface CustomerRequestCounts {
  readonly open: number;
  readonly byStatus: Readonly<Record<CustomerRequestStatus, number>>;
}

export interface CustomerRequestRoutingRule {
  readonly type: CustomerRequestType;
  readonly email: string | null;
  readonly updatedAt: string | null;
}

export interface CustomerRequestAssigneeOption {
  readonly id: string;
  readonly name: string;
}

/* ------------------------------------------------------------ payloads */

export interface CreateCustomerRequestPayload {
  readonly type: CustomerRequestType;
  readonly title: string;
  readonly description: string;
  readonly priority?: CustomerRequestPriority;
  readonly details?: CustomerRequestDetails;
  /** Generated once per dialog open: a retried submit returns the same request. */
  readonly clientRequestId: string;
}

export interface UpdatePlatformCustomerRequestPayload {
  readonly status?: CustomerRequestStatus;
  /** A Platform Owner's id, or `null` to unassign. */
  readonly assigneeUserId?: string | null;
  /** A customer-visible message posted with a status change. */
  readonly note?: string;
}

export interface TeamCustomerRequestMessagePayload {
  readonly body: string;
  /** `true` → a team-only note the academy never sees. */
  readonly internal?: boolean;
}

export interface UpdateRoutingRulesPayload {
  readonly rules: readonly {
    readonly type: CustomerRequestType;
    readonly email: string | null;
  }[];
}

/* ------------------------------------------------------------- queries */

export interface CustomerRequestFilters {
  readonly type?: CustomerRequestType;
  readonly status?: CustomerRequestStatusFilter;
}

export interface PlatformCustomerRequestFilters extends CustomerRequestFilters {
  readonly academyId?: string;
  /** A Platform Owner's id, or `unassigned`. */
  readonly assigneeUserId?: string;
}

export interface CustomerRequestListQuery<
  TFilters extends CustomerRequestFilters = CustomerRequestFilters,
> {
  readonly pagination?: { readonly page: number; readonly pageSize: number };
  readonly sort?: {
    readonly field: CustomerRequestSortField;
    readonly direction: SortDirection;
  };
  readonly search?: string;
  readonly filters?: TFilters;
}

export type PlatformCustomerRequestListQuery =
  CustomerRequestListQuery<PlatformCustomerRequestFilters>;
