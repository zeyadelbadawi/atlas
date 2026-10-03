/**
 * Audit log types (Prompt 13, extended by Task 3).
 *
 * One domain, two audiences:
 *   - the Platform Owner's cross-tenant log (`AuditLogEntrySummary` /
 *     `AuditLogEntryDetail`, `GET audit-log`, `GET audit-log/feed`);
 *   - an Academy owner's activity log (`TenantAuditLogEntry`,
 *     `GET academies/:id/activity`) — same events, but the actor carries a
 *     name only (never an email) and Atlas staff appear as "Atlas".
 *
 * Every entry carries the structured data `formatAuditEntry` turns into a
 * readable sentence: the action, the target's label, an allowlisted
 * `context` (names such as `courseTitle`, `sectionTitle`) and, in the
 * detail shapes, the field-level `changes`.
 */

/** Filter groups — mirrors the backend catalogue's `AUDIT_CATEGORIES`. */
export type AuditCategory =
  | 'courses'
  | 'assessments'
  | 'website'
  | 'academy'
  | 'team'
  | 'students'
  | 'certificates'
  | 'reviews'
  | 'media'
  | 'domains'
  | 'live_sessions'
  | 'payments'
  | 'subscription'
  | 'support'
  | 'security'
  | 'platform';

/** A flat, allowlisted bag of scalars recorded with the event. */
export type AuditContext = Readonly<
  Record<string, string | number | boolean | null>
>;

/** One field's before/after. */
export interface AuditFieldChange {
  readonly from: unknown;
  readonly to: unknown;
}

export type AuditChanges = Readonly<Record<string, AuditFieldChange>>;

/** Who performed the action (Platform shape — may include the email). */
export interface AuditLogActor {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
}

/** One row in the Platform audit log. */
export interface AuditLogEntrySummary {
  readonly id: string;
  readonly actor: AuditLogActor;
  /** A dotted event name, e.g. "website_page.published" — never shown raw. */
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly targetLabel?: string;
  readonly organizationId?: string;
  readonly organizationName?: string;
  readonly academyId?: string;
  readonly academyName?: string;
  /** The actor's role at the time of the action. */
  readonly role?: string;
  readonly occurredAt: string;
  readonly category?: AuditCategory | 'other';
  readonly context?: AuditContext;
  /** Names of the fields in `changes` (values only in the detail). */
  readonly changedFields?: readonly string[];
}

/** The full Platform detail view. */
export interface AuditLogEntryDetail extends AuditLogEntrySummary {
  readonly changes?: AuditChanges;
  readonly requestContext?: Readonly<Record<string, unknown>>;
}

/** Keyset page: no total, `nextCursor` is `null` on the last page. */
export interface AuditLogCursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

/** Shared cursor-feed filters. */
export interface AuditFeedQuery {
  readonly cursor?: string;
  readonly limit?: number;
  readonly category?: AuditCategory;
  readonly action?: string;
  readonly actorUserId?: string;
  readonly targetType?: string;
  /** Inclusive ISO-8601 lower bound. */
  readonly occurredFrom?: string;
  /** Inclusive ISO-8601 upper bound. */
  readonly occurredTo?: string;
  readonly search?: string;
}

export interface PlatformAuditFeedQuery extends AuditFeedQuery {
  readonly organizationId?: string;
  readonly academyId?: string;
}

/** The tenant-facing actor: a name, never an email. */
export interface TenantAuditLogActor {
  readonly id: string;
  readonly name: string;
  /** `true` when an Atlas operator did this; `name` is then "Atlas". */
  readonly isPlatformStaff: boolean;
}

/** One row of an Academy's activity log. */
export interface TenantAuditLogEntry {
  readonly id: string;
  readonly action: string;
  readonly category: AuditCategory | 'other';
  readonly targetType: string;
  readonly targetId: string;
  readonly targetLabel?: string;
  readonly actor: TenantAuditLogActor;
  readonly role?: string;
  readonly academyId?: string;
  readonly academyName?: string;
  readonly occurredAt: string;
  readonly context?: AuditContext;
  readonly changedFields?: readonly string[];
}

export interface TenantAuditLogEntryDetail extends TenantAuditLogEntry {
  readonly changes?: AuditChanges;
}
