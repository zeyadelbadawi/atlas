/**
 * Platform Audit Log types (Prompt 13).
 *
 * A real, distinct domain from both Notifications (a user's own inbox)
 * and the Platform Dashboard's "Recent Activity" panel (a 5-row summary
 * of this same feed, not a separate contract — see
 * `PlatformActivity.tsx`). This file is the one source of truth for an
 * audit event's shape.
 */

/** Who performed the action. */
export interface AuditLogActor {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
}

/** One row in the audit log list. */
export interface AuditLogEntrySummary {
  readonly id: string;
  readonly actor: AuditLogActor;
  /** A dotted event name, e.g. "organization.suspended", "academy.provisioned". */
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly targetLabel?: string;
  readonly organizationId?: string;
  readonly organizationName?: string;
  readonly occurredAt: string;
}

/** The full detail view, including whatever raw context the backend recorded for this event. */
export interface AuditLogEntryDetail extends AuditLogEntrySummary {
  readonly context?: Record<string, string | number | boolean | null>;
}
