/**
 * Academy domain types.
 *
 * Academy Management is the capability that allows organizations to create
 * and manage independent academies within the Atlas ecosystem.
 */

/** Academy status lifecycle states. */
export type AcademyStatus = 'draft' | 'active' | 'suspended' | 'archived';

/** Academy entity. */
export interface Academy {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly logo?: string;
  readonly favicon?: string;
  readonly status: AcademyStatus;
  readonly timezone: string;
  readonly language: string;
  readonly currency: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly website?: string;
  readonly address?: AcademyAddress;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Academy address information. */
export interface AcademyAddress {
  readonly street?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly country: string;
}

/** Academy creation payload. */
export interface CreateAcademyPayload {
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly website?: string;
  readonly country?: string;
  readonly language?: string;
  readonly timezone?: string;
  readonly currency?: string;
}

/** Academy update payload. */
export interface UpdateAcademyPayload {
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly website?: string;
  readonly address?: Partial<AcademyAddress>;
  readonly language?: string;
  readonly timezone?: string;
  readonly currency?: string;
  readonly status?: AcademyStatus;
}

/** Academy branding payload. */
export interface UpdateAcademyBrandingPayload {
  readonly logo?: string;
  readonly favicon?: string;
  readonly name?: string;
}

/** Academy member role types. */
export type AcademyMemberRole =
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'instructor'
  | 'staff';

/** Academy member status. */
export type AcademyMemberStatus = 'active' | 'inactive' | 'pending';

/** Academy member entity. */
export interface AcademyMember {
  readonly id: string;
  readonly academyId: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly role: AcademyMemberRole;
  readonly status: AcademyMemberStatus;
  readonly joinedAt: string;
}

/**
 * Grants Manager access to an academy (`POST /academies/:id/members`) —
 * either to an already-registered Atlas user (`email` alone), or to a
 * brand-new account created in the same action (`email` + `name` +
 * `password` together; there is no invitation system in this codebase).
 */
export interface AddAcademyManagerPayload {
  readonly email: string;
  readonly name?: string;
  readonly password?: string;
}

/** Grants Instructor access to an academy (`POST /academies/:id/instructors`) — same shape/rationale as `AddAcademyManagerPayload`. */
export interface AddAcademyInstructorPayload {
  readonly email: string;
  readonly name?: string;
  readonly password?: string;
}

/**
 * Creates a brand-new Atlas account for a test/real student
 * (`POST /academies/:id/students`). Always a fresh account — a student is
 * never an academy/organization membership, so there is nothing to
 * "grant" an existing user (see `AcademiesService.createStudent`'s
 * backend doc comment).
 */
export interface CreateAcademyStudentPayload {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/** The account `createAcademyStudent` just created. */
export interface AcademyStudent {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: string;
}

/** Academy dashboard statistics. */
export interface AcademyStats {
  readonly totalMembers: number;
  readonly activeStaff: number;
  readonly activeInstructors: number;
  readonly publishedCourses: number;
}

/** Academy activity entry. */
export interface AcademyActivity {
  readonly id: string;
  readonly academyId: string;
  readonly type: string;
  readonly description: string;
  readonly userId?: string;
  readonly userName?: string;
  readonly timestamp: string;
}
