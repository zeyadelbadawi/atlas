/**
 * Website Contact form submissions (the Academy dashboard's "Messages").
 *
 * A `ContactSubmission` is one message a visitor sent through the
 * Academy's public website Contact form — the only public website form
 * type, so there is deliberately no form-type field. The shape mirrors the
 * backend row exactly; nothing here is derived or invented.
 */
import type { CollectionQuery } from './api.types';
import type { SortDirection } from './common.types';

/** Inbox state of one submission. `new` until a staff member opens it. */
export type ContactSubmissionStatus = 'new' | 'read' | 'archived';

export interface ContactSubmission {
  readonly id: string;
  readonly academyId: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly status: ContactSubmissionStatus;
  /** ISO-8601 — when the message was received. */
  readonly createdAt: string;
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
 * `from`, `to`); dates are `YYYY-MM-DD`, inclusive, by received date.
 */
export interface ContactSubmissionFilters {
  readonly status?: ContactSubmissionStatus;
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
