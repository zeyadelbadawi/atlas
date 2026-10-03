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
  // `null` clears the field; `undefined` leaves it unchanged.
  readonly description?: string | null;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
  readonly website?: string | null;
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
  'owner' | 'administrator' | 'manager' | 'instructor' | 'staff';

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
 * brand-new, invited account (`email` + `name`). The invitee sets their
 * own password through the emailed setup link (Launch Stabilization A2).
 */
export interface AddAcademyManagerPayload {
  readonly email: string;
  readonly name?: string;
}

/** Grants Instructor access to an academy (`POST /academies/:id/instructors`) — same shape/rationale as `AddAcademyManagerPayload`. */
export interface AddAcademyInstructorPayload {
  readonly email: string;
  readonly name?: string;
}

/**
 * Adds a learner to an academy (`POST /academies/:id/students`). An email
 * that already has an Atlas account is added as-is; a new email becomes an
 * invited account, which is the only case that needs `name`.
 */
export interface CreateAcademyStudentPayload {
  readonly name?: string;
  readonly email: string;
}

/**
 * Smart member invitation — what an add actually did:
 *  - `invited`: a new account was created and sent a setup link;
 *  - `reinvited`: the account never finished setup, so a fresh link was sent;
 *  - `added`: an existing account was added and told so.
 */
export type AcademyMemberAddOutcome = 'invited' | 'reinvited' | 'added';

/** `POST /academies/:id/members|instructors` response. */
export type AcademyMemberAddResult = AcademyMember & {
  readonly outcome: AcademyMemberAddOutcome;
};

/** `POST /academies/:id/students` response. */
export type AcademyStudentAddResult = AcademyStudent & {
  readonly outcome: AcademyMemberAddOutcome;
};

/** The role an invitation dialog is adding. */
export type AcademyMemberLookupRole = 'manager' | 'instructor' | 'student';

/**
 * `GET /academies/:id/member-lookup` — a UX hint for the invitation
 * dialogs, never a decision (the add call re-checks everything).
 */
export type AcademyMemberLookupResult =
  | { readonly status: 'new' }
  | { readonly status: 'existing'; readonly name: string }
  | { readonly status: 'existing_pending_setup'; readonly name: string }
  | { readonly status: 'already_member' }
  | { readonly status: 'unavailable' };

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
