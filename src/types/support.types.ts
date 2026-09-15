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

/**
 * P53 — one image attached to a message.
 *
 * `url` is a RELATIVE Atlas path (`/support-cases/attachments/:id`), the
 * same rule `MediaAssetSummary.url` follows — but unlike media, this path
 * is AUTHENTICATED: a ticket is private to the person who filed it, so the
 * bytes are fetched with the session's own credentials and the backend's
 * RLS policies decide. That is why an attachment cannot simply be dropped
 * into an `<img src>`; see `useSupportAttachmentUrl`.
 */
export interface SupportCaseAttachment {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly url: string;
  readonly createdAt: string;
}

/** One message in a case's conversation thread. */
export interface SupportCaseMessage {
  readonly id: string;
  readonly authorName: string;
  readonly authorRole: 'requester' | 'agent';
  readonly body: string;
  readonly createdAt: string;
  /** P53 — empty for a text-only message and for every message filed before attachments existed. */
  readonly attachments: readonly SupportCaseAttachment[];
}

/**
 * P53 — the optional image on a new ticket or reply.
 *
 * Reuses `UploadMediaAssetPayload`'s base64 data-URL shape verbatim (minus
 * `altText`): Atlas has exactly one client→server file transport, and a
 * support attachment rides it rather than introducing multipart for one
 * feature. The backend re-derives the real kind and size from the decoded
 * bytes, so these fields are labels, never facts.
 */
export interface SupportAttachmentInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly dataUrl: string;
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
  /** P53 — optional. A reply is still a message; an image never replaces the text. */
  readonly attachment?: SupportAttachmentInput;
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
  /** P53 — optional image evidence for the ticket's first message. */
  readonly attachment?: SupportAttachmentInput;
}
