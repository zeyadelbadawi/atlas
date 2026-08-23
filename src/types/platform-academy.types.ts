/**
 * Global Academy Console types (Prompt 13).
 *
 * The Platform Owner's cross-tenant view of every Academy on Atlas —
 * distinct from `Academy` (Prompt 3B, a Tenant's own academy record,
 * fetched through `AcademyService` scoped to the caller's own
 * organization). This file does not redeclare `Academy`; it composes a
 * cross-tenant summary/detail shape that references the existing
 * `AcademyStatus`, `ProvisioningStatus` (Prompt 8), `WebsitePublishStatus`
 * (Prompt 9), and `DomainStatus` (Prompt 8, reused by Prompt 11) types
 * directly, never re-declaring their vocabulary.
 *
 * Read-only, for the same reason `platform-organization.types.ts` is:
 * no academy-administration mutation (suspend/transfer/delete) is
 * defined by the product specification.
 */
import type { AcademyStatus } from './academy.types';
import type { ProvisioningStatus } from './provisioning.types';
import type { WebsitePublishStatus } from './website.types';
import type { DomainStatus } from './provisioning.types';

export interface PlatformAcademyCourseRef {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface PlatformAcademyMemberRef {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

/** One row in the Platform Owner's cross-tenant academy list. */
export interface PlatformAcademySummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly status: AcademyStatus;
  readonly ownerName?: string;
  readonly courseCount: number;
  readonly memberCount: number;
  readonly createdAt: string;
}

/** The full detail view — reuses `ProvisioningStatus`/`WebsitePublishStatus`/`DomainStatus` verbatim, never re-shaped. */
export interface PlatformAcademyDetail extends PlatformAcademySummary {
  readonly description?: string;
  readonly logo?: string;
  readonly provisioningStatus?: ProvisioningStatus;
  readonly websiteStatus?: WebsitePublishStatus;
  readonly domainStatus?: DomainStatus;
  readonly courses: readonly PlatformAcademyCourseRef[];
  readonly members: readonly PlatformAcademyMemberRef[];
}
