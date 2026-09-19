/**
 * Academy Roster Service (P64 Phase 1).
 *
 * The Owner/Manager view of an academy's LEARNERS — who registered
 * through the academy website, their enrollments and outcomes — and the
 * two controls that shape how new learners get in: the registration
 * policy and invite links.
 *
 * Kept apart from `AcademyService` (team members, branding, settings)
 * because a student is never an academy/organization membership; mixing
 * the two rosters in one service made every "member" method ambiguous.
 * Same `academies/:id/...` resource, same `BaseService` contract.
 *
 * Authorization is entirely server-side: an assigned Instructor gets the
 * same reads narrowed to their courses (`viewerScope: 'assigned_courses'`)
 * and every management action refuses with
 * `errors.academy.insufficientRole`. The UI hides what would only 403,
 * it never decides.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AcademyInvite,
  AcademyRegistrationPolicySettings,
  AcademyRosterPage,
  AcademyRosterQuery,
  AcademyRosterStudent,
  AcademyStudentDetail,
  BlockAcademyStudentPayload,
  CreateAcademyInvitePayload,
  CreatedAcademyInvite,
  EnrollAcademyStudentPayload,
  RevokeRosterEnrollmentPayload,
  RosterEnrollment,
  UpdateAcademyRegistrationPolicyPayload,
  UpdateRosterEnrollmentExpiryPayload,
} from '@types';

/** Drops empty filter values so the wire query only carries what was set. */
function toRosterParams(
  query?: AcademyRosterQuery
): Record<string, string | number> {
  if (!query) return {};
  const params: Record<string, string | number> = {};
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;
  if (query.search && query.search.trim().length > 0) {
    params.search = query.search.trim();
  }
  if (query.status) params.status = query.status;
  if (query.courseId) params.courseId = query.courseId;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortDir) params.sortDir = query.sortDir;
  return params;
}

export class AcademyRosterService extends BaseService {
  protected readonly resource = 'academies';

  /** `GET academies/:id/students` — paginated learner roster. */
  async getStudents(
    academyId: string,
    query?: AcademyRosterQuery,
    options?: ReadOptions
  ): Promise<AcademyRosterPage> {
    return this.client.get<AcademyRosterPage>(
      this.path(academyId, 'students'),
      {
        ...options,
        params: { ...toRosterParams(query), ...options?.params },
      }
    );
  }

  /** `GET academies/:id/students/:userId` — one learner with enrollments and outcomes. */
  async getStudent(
    academyId: string,
    userId: string,
    options?: ReadOptions
  ): Promise<AcademyStudentDetail> {
    return this.client.get<AcademyStudentDetail>(
      this.path(academyId, 'students', userId),
      options
    );
  }

  async blockStudent(
    academyId: string,
    userId: string,
    payload: BlockAcademyStudentPayload = {},
    options?: WriteOptions
  ): Promise<AcademyRosterStudent> {
    return this.client.post<AcademyRosterStudent, BlockAcademyStudentPayload>(
      this.path(academyId, 'students', userId, 'block'),
      payload,
      options
    );
  }

  async unblockStudent(
    academyId: string,
    userId: string,
    options?: WriteOptions
  ): Promise<AcademyRosterStudent> {
    return this.client.post<AcademyRosterStudent, Record<string, never>>(
      this.path(academyId, 'students', userId, 'unblock'),
      {},
      options
    );
  }

  /** Approves a `pending` registration (approval policy). */
  async approveStudent(
    academyId: string,
    userId: string,
    options?: WriteOptions
  ): Promise<AcademyRosterStudent> {
    return this.client.post<AcademyRosterStudent, Record<string, never>>(
      this.path(academyId, 'students', userId, 'approve'),
      {},
      options
    );
  }

  /** Rejects a `pending` registration (approval policy). */
  async rejectStudent(
    academyId: string,
    userId: string,
    options?: WriteOptions
  ): Promise<AcademyRosterStudent> {
    return this.client.post<AcademyRosterStudent, Record<string, never>>(
      this.path(academyId, 'students', userId, 'reject'),
      {},
      options
    );
  }

  /** `POST academies/:id/students/:userId/enrollments` — manual enrollment (201). */
  async enrollStudent(
    academyId: string,
    userId: string,
    payload: EnrollAcademyStudentPayload,
    options?: WriteOptions
  ): Promise<RosterEnrollment> {
    return this.client.post<RosterEnrollment, EnrollAcademyStudentPayload>(
      this.path(academyId, 'students', userId, 'enrollments'),
      payload,
      options
    );
  }

  /** `POST academies/:id/enrollments/:enrollmentId/revoke`. */
  async revokeEnrollment(
    academyId: string,
    enrollmentId: string,
    payload: RevokeRosterEnrollmentPayload = {},
    options?: WriteOptions
  ): Promise<RosterEnrollment> {
    return this.client.post<RosterEnrollment, RevokeRosterEnrollmentPayload>(
      this.path(academyId, 'enrollments', enrollmentId, 'revoke'),
      payload,
      options
    );
  }

  /** `PATCH academies/:id/enrollments/:enrollmentId/expiry` — `expiresAt: null` clears it. */
  async updateEnrollmentExpiry(
    academyId: string,
    enrollmentId: string,
    payload: UpdateRosterEnrollmentExpiryPayload,
    options?: WriteOptions
  ): Promise<RosterEnrollment> {
    return this.client.patch<
      RosterEnrollment,
      UpdateRosterEnrollmentExpiryPayload
    >(
      this.path(academyId, 'enrollments', enrollmentId, 'expiry'),
      payload,
      options
    );
  }

  /** `GET academies/:id/registration-policy`. */
  async getRegistrationPolicy(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyRegistrationPolicySettings> {
    return this.client.get<AcademyRegistrationPolicySettings>(
      this.path(academyId, 'registration-policy'),
      options
    );
  }

  /** `PATCH academies/:id/registration-policy` — Client Owner only (Managers 403). */
  async updateRegistrationPolicy(
    academyId: string,
    payload: UpdateAcademyRegistrationPolicyPayload,
    options?: WriteOptions
  ): Promise<AcademyRegistrationPolicySettings> {
    return this.client.patch<
      AcademyRegistrationPolicySettings,
      UpdateAcademyRegistrationPolicyPayload
    >(this.path(academyId, 'registration-policy'), payload, options);
  }

  /** `GET academies/:id/invites` — never includes raw tokens. */
  async getInvites(
    academyId: string,
    options?: ReadOptions
  ): Promise<readonly AcademyInvite[]> {
    type InviteListResponse =
      readonly AcademyInvite[] | { readonly items?: readonly AcademyInvite[] };
    const response = await this.client.get<InviteListResponse>(
      this.path(academyId, 'invites'),
      options
    );
    // Contract is a bare array; a paginated envelope is tolerated so a
    // later backend change cannot turn the list into a render crash.
    // `Array.isArray` does not narrow a `readonly` union member, so the
    // envelope branch is narrowed explicitly rather than by the guard.
    if (Array.isArray(response)) return response as readonly AcademyInvite[];
    return (
      (response as { readonly items?: readonly AcademyInvite[] }).items ?? []
    );
  }

  /** `POST academies/:id/invites` — the response carries the raw token ONCE. */
  async createInvite(
    academyId: string,
    payload: CreateAcademyInvitePayload,
    options?: WriteOptions
  ): Promise<CreatedAcademyInvite> {
    return this.client.post<CreatedAcademyInvite, CreateAcademyInvitePayload>(
      this.path(academyId, 'invites'),
      payload,
      options
    );
  }

  /** `DELETE academies/:id/invites/:inviteId` (204). */
  async revokeInvite(
    academyId: string,
    inviteId: string,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.delete<void>(
      this.path(academyId, 'invites', inviteId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const academyRosterService = new AcademyRosterService();
