/**
 * Support Operations types (Prompt 13).
 *
 * The standard, universally-understood support-ticket lifecycle
 * (open → in_progress → resolved → closed) — not an invented workflow.
 * Assignment is READ-ONLY here (a name/reference only): there is no
 * agent-directory or assignment-mutation contract to invent one against,
 * the same caution already applied to Roles & Permissions and the
 * Organization/Academy/User admin consoles.
 */

export type SupportCaseStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportCasePriority = 'low' | 'medium' | 'high' | 'urgent';

/** One row in the Support Operations case list. */
export interface SupportCaseSummary {
  readonly id: string;
  readonly subject: string;
  readonly status: SupportCaseStatus;
  readonly priority: SupportCasePriority;
  readonly organizationId?: string;
  readonly organizationName?: string;
  /** Phase 8 — present only for a ticket scoped to one Academy. */
  readonly academyId?: string;
  readonly requesterName: string;
  readonly requesterEmail: string;
  readonly assignedToName?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** One message in a case's conversation thread. */
export interface SupportCaseMessage {
  readonly id: string;
  readonly authorName: string;
  readonly authorRole: 'requester' | 'agent';
  readonly body: string;
  readonly createdAt: string;
}

/** The full detail view, including the conversation thread. */
export interface SupportCaseDetail extends SupportCaseSummary {
  readonly messages: readonly SupportCaseMessage[];
}

export interface UpdateSupportCaseStatusPayload {
  readonly status: SupportCaseStatus;
}

export interface PostSupportCaseReplyPayload {
  readonly body: string;
}

/**
 * Phase 8 — the tenant-facing "submit a ticket" payload. `description`
 * becomes the case's first message (`authorRole: 'requester'`); a ticket
 * IS a subject plus a message thread, never a separate free-text field
 * on the case. Deliberately carries no `priority`/`academyId`: scope
 * comes from the route the caller can actually reach, and priority is
 * triaged by the Platform, never chosen by the requester.
 */
export interface CreateSupportCasePayload {
  readonly subject: string;
  readonly description: string;
}
