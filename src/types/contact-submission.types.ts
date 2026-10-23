/**
 * Website Contact form submissions (the Academy dashboard's "Messages").
 *
 * A `ContactSubmission` is one message a visitor sent through the
 * Academy's public website Contact form or (CMS phase 3d, batch C) one of
 * its "register your interest" sections — both reach the same endpoint and
 * inbox, told apart by `kind`. The shape mirrors the backend row exactly;
 * nothing here is derived or invented.
 */
import type { CollectionQuery } from './api.types';
import type { SortDirection } from './common.types';

/** Inbox state of one submission. `new` until a staff member opens it. */
export type ContactSubmissionStatus = 'new' | 'read' | 'archived';

/** Which public form sent it: the Contact form or an interest form. */
export type ContactSubmissionKind = 'contact' | 'interest';

export interface ContactSubmission {
  readonly id: string;
  readonly academyId: string;
  readonly name: string;
  /** Empty when an interest form did not ask for (or get) one. */
  readonly email: string;
  /** Empty when an interest submission came without a message. */
  readonly message: string;
  readonly status: ContactSubmissionStatus;
  /** ISO-8601 — when the message was received. */
  readonly createdAt: string;
  /** Absent from an API older than CMS phase 3d (batch C): a contact message. */
  readonly kind?: ContactSubmissionKind;
  /** An interest submission's phone, E.164. */
  readonly phone?: string | null;
  /** The option the visitor chose and the choice list's label, as the form showed them. */
  readonly choice?: string | null;
  readonly choiceLabel?: string | null;
}

/** Whole-academy counts, independent of any list filter. */
export interface ContactSubmissionSummary {
  readonly total: number;
  readonly new: number;
  readonly read: number;
  readonly archived: number;
}

/** Server-side sort fields the list endpoint accepts (`sortBy`). */
export type ContactSubmissionSortField = 'createdAt' | 'name' | 'email';

/**
 * Server-side filters. Every key is sent under its own name (`status`,
 * `kind`, `from`, `to`); dates are `YYYY-MM-DD`, inclusive, by received date.
 */
export interface ContactSubmissionFilters {
  readonly status?: ContactSubmissionStatus;
  readonly kind?: ContactSubmissionKind;
  readonly from?: string;
  readonly to?: string;
}

/**
 * The list query — the standard `CollectionQuery` (so `page`, `pageSize`,
 * `search`, `sortBy`, `sortDirection` come from `toCollectionParams`),
 * narrowed to this endpoint's filters and sort fields.
 */
export type ContactSubmissionListQuery = Omit<
  CollectionQuery,
  'filters' | 'sort'
> & {
  readonly filters?: ContactSubmissionFilters;
  readonly sort?: {
    readonly field: ContactSubmissionSortField;
    readonly direction: SortDirection;
  };
};

/** `PATCH academies/:academyId/contact-submissions/:submissionId` body. */
export interface UpdateContactSubmissionStatusPayload {
  readonly status: ContactSubmissionStatus;
}
