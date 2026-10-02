/**
 * Contact Submission Service — the Academy's website "Messages".
 *
 * Messages visitors send through the Academy's public website Contact
 * form (`POST public/websites/:academyId/contact`, see
 * `PublicWebsiteService`) land here for the Academy's Owners/Managers.
 * Same `academies/:academyId/...` resource tree as every other Academy
 * service, same `BaseService` contract.
 *
 * Every list parameter goes through the shared `toCollectionParams`, so
 * the wire names are the platform-wide ones (`page`, `pageSize`, `search`,
 * `sortBy`, `sortDirection`) plus this endpoint's own filters under their
 * own names (`status`, `from`, `to`). An unset filter is never sent.
 *
 * There is deliberately no delete: Archive (reversible, via Restore) is
 * the only way a message leaves the inbox.
 *
 * Authorization is server-side (Academy Owner/Manager); the UI only hides
 * what would 403.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { toCollectionParams } from '@api';
import type {
  ContactSubmission,
  ContactSubmissionFilters,
  ContactSubmissionListQuery,
  ContactSubmissionSummary,
  PaginatedResult,
  UpdateContactSubmissionStatusPayload,
} from '@types';

export class ContactSubmissionService extends BaseService {
  protected readonly resource = 'academies';

  private submissionsPath(
    academyId: string,
    ...segments: readonly string[]
  ): string {
    return this.path(academyId, 'contact-submissions', ...segments);
  }

  /** `GET academies/:academyId/contact-submissions` — one page of messages. */
  async getSubmissions(
    academyId: string,
    query?: ContactSubmissionListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ContactSubmission>> {
    return this.client.get<PaginatedResult<ContactSubmission>>(
      this.submissionsPath(academyId),
      {
        ...options,
        params: {
          ...toCollectionParams<ContactSubmissionFilters>(query),
          ...options?.params,
        },
      }
    );
  }

  /** `GET academies/:academyId/contact-submissions/summary` — counts by status. */
  async getSummary(
    academyId: string,
    options?: ReadOptions
  ): Promise<ContactSubmissionSummary> {
    return this.client.get<ContactSubmissionSummary>(
      this.submissionsPath(academyId, 'summary'),
      options
    );
  }

  /** `PATCH academies/:academyId/contact-submissions/:submissionId` — new/read/archived. */
  async updateStatus(
    academyId: string,
    submissionId: string,
    payload: UpdateContactSubmissionStatusPayload,
    options?: WriteOptions
  ): Promise<ContactSubmission> {
    return this.client.patch<
      ContactSubmission,
      UpdateContactSubmissionStatusPayload
    >(this.submissionsPath(academyId, submissionId), payload, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const contactSubmissionService = new ContactSubmissionService();
