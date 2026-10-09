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
  /**
   * W5 — the caller's role in this academy, present on `GET /academies`
   * rows (`owner` for the organization owner). The list only ever holds
   * academies the caller staffs.
   */
  readonly viewerRole?: AcademyStaffRole;
}

/** W5 — a staff role inside one academy (`academy_members.role`). */
export type AcademyStaffRole =
  'owner' | 'administrator' | 'manager' | 'instructor' | 'staff';

/** W5 — `GET /academies/:id/me`: the caller's standing in one academy. */
export interface AcademyMembership {
  readonly academy: {
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly slug: string;
    readonly status: AcademyStatus;
    readonly logo?: string;
    readonly language: string;
  };
  readonly role: AcademyStaffRole;
  readonly roleSource: 'organization_owner' | 'academy_membership';
  readonly permissions: readonly string[];
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
 * Grants Manager access to an academy (`POST /academies/:id/members`).
 * `name` (2–120 characters) is required on every request (ATO F5): the
 * dialog cannot know whether the address has an Atlas account, so the
 * server uses it only to invite a brand-new account — an existing account
 * keeps its own name. The invitee sets their own password through the
 * emailed setup link (Launch Stabilization A2).
 */
export interface AddAcademyManagerPayload {
  readonly email: string;
  readonly name: string;
}

/** Grants Instructor access to an academy (`POST /academies/:id/instructors`) — same shape/rationale as `AddAcademyManagerPayload`. */
export interface AddAcademyInstructorPayload {
  readonly email: string;
  readonly name: string;
}

/**
 * Adds a learner to an academy (`POST /academies/:id/students`) — same
 * shape/rationale as `AddAcademyManagerPayload`: `name` is always sent and
 * only used when the address has no account yet.
 */
export interface CreateAcademyStudentPayload {
  readonly name: string;
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
 *
 * ATO F5: it no longer says whether an address has an Atlas account (nor
 * whose name is on it) — only whether the person is already in THIS
 * academy. `new` covers both "no account" and "an account elsewhere".
 */
export type AcademyMemberLookupResult =
  { readonly status: 'new' } | { readonly status: 'already_member' };

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
