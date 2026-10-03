/**
 * Platform Contact Submission Service — the Platform Owner's inbox for the
 * Atlas marketing homepage's contact form (TASK 7).
 *
 * `platform/contact-submissions` is guarded server-side by
 * `JwtAuthGuard` + `ManagementSurfaceGuard` + `PlatformOwnerGuard` AND by
 * RLS under the caller's own context; the route guard in this app is a
 * convenience, never the control.
 *
 * Wire names for the list are the platform-wide collection params
 * (`page`, `pageSize`, `search`, `sortBy`, `sortDirection`) plus this
 * endpoint's filters under their own names (`status`, `topic`, `from`,
 * `to`). An unset filter is never sent.
 *
 * Unlike an academy's Messages inbox, DELETE exists here — permanent, and
 * confirmed in the UI first. Archive stays the reversible way to clear
 * the inbox.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type { PaginatedResult, SortDirection } from '@types';

export type PlatformContactSubmissionStatus = 'new' | 'read' | 'archived';
export type PlatformContactSubmissionTopic =
  'sales' | 'support' | 'partnership' | 'other';
export type PlatformContactSubmissionSortField = 'createdAt' | 'name' | 'email';

/** Matches `PlatformContactSubmissionResponse` (backend) field-for-field. */
export interface PlatformContactSubmission {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly organizationName: string | null;
  readonly topic: PlatformContactSubmissionTopic;
  readonly message: string;
  readonly locale: string;
  readonly sourcePath: string | null;
  readonly status: PlatformContactSubmissionStatus;
  readonly userAgent: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface PlatformContactSubmissionSummary {
  readonly total: number;
  readonly new: number;
  readonly read: number;
  readonly archived: number;
}

export interface PlatformContactSubmissionFilters {
  readonly status?: PlatformContactSubmissionStatus;
  readonly topic?: PlatformContactSubmissionTopic;
  /** `YYYY-MM-DD`, inclusive. */
  readonly from?: string;
  /** `YYYY-MM-DD`, inclusive. */
  readonly to?: string;
}

export interface PlatformContactSubmissionListQuery {
  readonly pagination?: { readonly page: number; readonly pageSize: number };
  readonly sort?: {
    readonly field: PlatformContactSubmissionSortField;
    readonly direction: SortDirection;
  };
  readonly search?: string;
  readonly filters?: PlatformContactSubmissionFilters;
}

export class PlatformContactSubmissionService extends BaseService {
  // `path()` encodes each segment on its own, so the two-segment resource
  // is passed as `'platform'` + `'contact-submissions'`, never one string
  // containing a slash (see `PublicPlanService`'s identical note).
  protected readonly resource = 'platform';

  private submissionsPath(...segments: readonly string[]): string {
    return this.path('contact-submissions', ...segments);
  }

  /** `GET platform/contact-submissions` — one page of enquiries. */
  async list(
    query?: PlatformContactSubmissionListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformContactSubmission>> {
    return this.client.get<PaginatedResult<PlatformContactSubmission>>(
      this.submissionsPath(),
      {
        ...options,
        params: {
          ...toCollectionParams<PlatformContactSubmissionFilters>(query),
          ...options?.params,
        },
      }
    );
  }

  /** `GET platform/contact-submissions/summary` — counts by status. */
  async summary(
    options?: ReadOptions
  ): Promise<PlatformContactSubmissionSummary> {
    return this.client.get<PlatformContactSubmissionSummary>(
      this.submissionsPath('summary'),
      options
    );
  }

  /** `PATCH platform/contact-submissions/:id` — new/read/archived. */
  async updateStatus(
    id: string,
    status: PlatformContactSubmissionStatus,
    options?: WriteOptions
  ): Promise<PlatformContactSubmission> {
    return this.client.patch<
      PlatformContactSubmission,
      { readonly status: PlatformContactSubmissionStatus }
    >(this.submissionsPath(id), { status }, options);
  }

  /** `DELETE platform/contact-submissions/:id` — permanent. */
  async remove(id: string, options?: WriteOptions): Promise<void> {
    await this.client.delete<void>(this.submissionsPath(id), options);
  }
}

export const platformContactSubmissionService =
  new PlatformContactSubmissionService();
