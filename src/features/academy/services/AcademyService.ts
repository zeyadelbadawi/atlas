/**
 * Academy Service.
 *
 * Manages academy CRUD operations, settings, branding, and member access.
 * Extends BaseService to maintain architectural consistency.
 */
import { BaseService } from '@services';
import { toCollectionParams } from '@api';
import type {
  Academy,
  UpdateAcademyPayload,
  UpdateAcademyBrandingPayload,
  AcademyMember,
  AcademyMemberAddResult,
  AcademyMemberLookupResult,
  AcademyMemberLookupRole,
  AcademyStudentAddResult,
  AddAcademyManagerPayload,
  AddAcademyInstructorPayload,
  CreateAcademyStudentPayload,
  AcademyStats,
  CollectionQuery,
  PaginatedResult,
  WebsiteConfiguration,
} from '@types';
import type { ReadOptions, WriteOptions } from '@services';

export class AcademyService extends BaseService {
  protected readonly resource = 'academies';

  /**
   * The Academy website's configuration — read here only for its publish
   * state, which is what the Academy dashboard shows as the client-facing
   * status (Task 1). Same endpoint and cache key as the website feature.
   */
  async getWebsiteConfiguration(
    academyId: string,
    options?: ReadOptions
  ): Promise<WebsiteConfiguration> {
    return this.client.get<WebsiteConfiguration>(
      this.path(academyId, 'website', 'configuration'),
      options
    );
  }

  /**
   * Retrieves all academies for the active organization.
   *
   * `organizationId` is required by the backend's `GET /academies` —
   * unlike every `:id`-scoped Academy route, this flat collection route
   * has no academy id to resolve tenancy from, so
   * `AcademyOrganizationScopeGuard` requires it as an explicit query
   * param (see that guard's doc comment). Callers source it from the
   * session's active organization (`useAuth().organization.id`), never
   * hardcoded.
   */
  async getAcademies(
    organizationId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Academy>> {
    return this.fetchCollection<Academy>(query, {
      ...options,
      params: { organizationId, ...options?.params },
    });
  }

  /**
   * Retrieves a single academy by ID.
   */
  async getAcademy(id: string, options?: ReadOptions): Promise<Academy> {
    return this.fetchOne<Academy>(id, options);
  }

  /*
   * NO `createAcademy` METHOD — REMOVED IN PHASE 10.6, DELIBERATELY.
   *
   * It posted to `POST /academies`, which was the second of two academy
   * creation paths and the one that did not allocate a subdomain. Every
   * academy created through it had no `subdomain_allocations` row, so
   * `resolve_public_hostname` matched nothing and its public website
   * answered "not found" — production had five academies and two
   * allocations.
   *
   * Academy Provisioning is now the only creation path, and the backend
   * route this called no longer exists. Restoring a method here would
   * reintroduce the defect, so the absence is recorded rather than left
   * to look like an oversight.
   */

  /**
   * Updates an existing academy.
   */
  async updateAcademy(
    id: string,
    payload: UpdateAcademyPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.updateOne<Academy, UpdateAcademyPayload>(id, payload, options);
  }

  /**
   * Updates academy branding (logo, favicon).
   */
  async updateAcademyBranding(
    id: string,
    payload: UpdateAcademyBrandingPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.client.patch<Academy, UpdateAcademyBrandingPayload>(
      this.path(id, 'branding'),
      payload,
      options
    );
  }

  /**
   * Deletes an academy.
   */
  async deleteAcademy(id: string, options?: WriteOptions): Promise<void> {
    return this.deleteOne(id, options);
  }

  /**
   * Deletes an academy and records why.
   *
   * Posts to `POST /academies/:id/delete` rather than sending a body on
   * the DELETE: `WriteOptions` carries no body for `delete`, request
   * bodies on DELETE have no defined semantics, and the explicit
   * `confirm: true` means an accidental empty request cannot take a
   * public website offline.
   *
   * Authorization is identical to `deleteAcademy` — this is a different
   * transport for the same action, not a different permission.
   */
  async deleteAcademyWithReason(
    id: string,
    payload: { readonly reason?: string; readonly feedback?: string },
    options?: WriteOptions
  ): Promise<void> {
    await this.client.post<
      void,
      { confirm: true; reason?: string; feedback?: string }
    >(this.path(id, 'delete'), { confirm: true, ...payload }, options);
  }

  /**
   * Retrieves academy members (paginated).
   */
  async getAcademyMembers(
    id: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyMember>> {
    const response = await this.client.get<PaginatedResult<AcademyMember>>(
      this.path(id, 'members'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
    return response;
  }

  /**
   * Smart member invitation — the Add Manager/Instructor/Student dialogs'
   * debounced email check. Answers only a status (and the account's display
   * name when one exists); it is a hint, and the add call re-checks
   * everything. Owner-only and rate-limited server-side.
   */
  async lookupAcademyMember(
    id: string,
    email: string,
    role: AcademyMemberLookupRole,
    options?: ReadOptions
  ): Promise<AcademyMemberLookupResult> {
    return this.client.get<AcademyMemberLookupResult>(
      this.path(id, 'member-lookup'),
      { ...options, params: { email, role, ...options?.params } }
    );
  }

  /**
   * Grants Manager access to this academy to an existing Atlas account, or
   * invites a new one (`name` required then). Only the
   * Academy Owner may call this (backend-enforced;
   * `errors.academy.insufficientRole` otherwise); `errors.academy.
   * managerUserNotFound` means no Atlas account exists for that email,
   * `errors.academy.managerAlreadyMember` means they already have a role
   * on this academy.
   */
  async addAcademyManager(
    id: string,
    payload: AddAcademyManagerPayload,
    options?: WriteOptions
  ): Promise<AcademyMemberAddResult> {
    return this.client.post<AcademyMemberAddResult, AddAcademyManagerPayload>(
      this.path(id, 'members'),
      payload,
      options
    );
  }

  /**
   * Grants Instructor access to this academy — see
   * `AddAcademyInstructorPayload`'s doc comment for the email-lookup-or-
   * create shape. Only the Academy Owner may call this
   * (`errors.academy.insufficientRole` otherwise).
   */
  async addAcademyInstructor(
    id: string,
    payload: AddAcademyInstructorPayload,
    options?: WriteOptions
  ): Promise<AcademyMemberAddResult> {
    return this.client.post<
      AcademyMemberAddResult,
      AddAcademyInstructorPayload
    >(this.path(id, 'instructors'), payload, options);
  }

  /**
   * Adds a learner to this academy — an existing Atlas account as-is, or a
   * new invited account (see `CreateAcademyStudentPayload`). Only the
   * Academy Owner may call this.
   */
  async createAcademyStudent(
    id: string,
    payload: CreateAcademyStudentPayload,
    options?: WriteOptions
  ): Promise<AcademyStudentAddResult> {
    return this.client.post<
      AcademyStudentAddResult,
      CreateAcademyStudentPayload
    >(this.path(id, 'students'), payload, options);
  }

  /**
   * Retrieves academy statistics.
   */
  async getAcademyStats(
    id: string,
    options?: ReadOptions
  ): Promise<AcademyStats> {
    return this.client.get<AcademyStats>(this.path(id, 'stats'), options);
  }

  // Task 3 — `GET academies/:id/activity` is now the Academy activity log
  // (a cursor feed); it is read through `AcademyActivityLogService` in the
  // audit-log feature, not here.
}

/** Singleton instance following Atlas service pattern. */
export const academyService = new AcademyService();
