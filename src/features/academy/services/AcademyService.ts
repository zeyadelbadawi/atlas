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
  CreateAcademyPayload,
  UpdateAcademyPayload,
  UpdateAcademyBrandingPayload,
  AcademyMember,
  AddAcademyManagerPayload,
  AddAcademyInstructorPayload,
  CreateAcademyStudentPayload,
  AcademyStudent,
  AcademyStats,
  AcademyActivity,
  CollectionQuery,
  PaginatedResult,
} from '@types';
import type { ReadOptions, WriteOptions } from '@services';

/**
 * Strips format-validated optional fields down to `undefined` when the
 * form left them empty.
 *
 * `createAcademySchema` deliberately accepts `''` for `contactEmail`/
 * `website` (`.optional().or(z.literal(''))`) so an untouched optional
 * field never shows an "invalid email"/"invalid URL" error — correct form
 * UX. But the backend's `CreateAcademyDto` marks both `@IsOptional()`,
 * and `class-validator`'s `@IsOptional()` only skips validation for
 * `null`/`undefined`, not `''` — so `@IsEmail()`/`@IsUrl()` still run
 * against an empty string and reject it (confirmed live: `POST
 * /academies` 400, "contactEmail must be an email", "website must be a
 * URL address"). This is the one place that gap between the form's
 * "empty is valid" and the wire contract's "absent is valid" is closed.
 */
function omitEmptyOptionalStrings<TPayload extends object, TKey extends keyof TPayload & string>(
  payload: TPayload,
  keys: readonly TKey[]
): TPayload {
  const overrides = {} as Partial<Pick<TPayload, TKey>>;
  for (const key of keys) {
    if (payload[key] === '') {
      overrides[key] = undefined;
    }
  }
  return { ...payload, ...overrides };
}

export class AcademyService extends BaseService {
  protected readonly resource = 'academies';

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

  /**
   * Creates a new academy.
   *
   * `organizationId` is required by the backend's `CreateAcademyDto` (a
   * confirmed, previously-untracked frontend gap — see that DTO's doc
   * comment) but is deliberately not part of `CreateAcademyPayload`: it
   * is never a form field, it comes from the session's active
   * organization, the same "always explicit, never ambient" source
   * `useCreateAcademy` already threads through.
   */
  async createAcademy(
    organizationId: string,
    payload: CreateAcademyPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.createOne<Academy, CreateAcademyPayload & { organizationId: string }>(
      {
        ...omitEmptyOptionalStrings(payload, ['contactEmail', 'website']),
        organizationId,
      },
      options
    );
  }

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
   * Grants an already-registered Atlas user Manager access to this
   * academy — see `AddAcademyManagerPayload`'s doc comment for why this
   * is email-lookup-based rather than an invitation flow. Only the
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
  ): Promise<AcademyMember> {
    return this.client.post<AcademyMember, AddAcademyManagerPayload>(
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
  ): Promise<AcademyMember> {
    return this.client.post<AcademyMember, AddAcademyInstructorPayload>(
      this.path(id, 'instructors'),
      payload,
      options
    );
  }

  /**
   * Creates a brand-new Atlas account for a test/real student — see
   * `CreateAcademyStudentPayload`'s doc comment for why this always
   * creates a fresh account rather than granting an existing one. Only
   * the Academy Owner may call this.
   */
  async createAcademyStudent(
    id: string,
    payload: CreateAcademyStudentPayload,
    options?: WriteOptions
  ): Promise<AcademyStudent> {
    return this.client.post<AcademyStudent, CreateAcademyStudentPayload>(
      this.path(id, 'students'),
      payload,
      options
    );
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

  /**
   * Retrieves academy activity (paginated).
   */
  async getAcademyActivity(
    id: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyActivity>> {
    const response = await this.client.get<PaginatedResult<AcademyActivity>>(
      this.path(id, 'activity'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
    return response;
  }
}

/** Singleton instance following Atlas service pattern. */
export const academyService = new AcademyService();