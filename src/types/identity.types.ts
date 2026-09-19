/**
 * Identity and authentication types.
 *
 * These types describe the shape of authentication state, sessions, users and
 * authorization without depending on any specific backend implementation.
 */

/** The lifecycle states of a session. */
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'restoring';

/** Token metadata tracking expiration and refresh requirements. */
export interface TokenMetadata {
  readonly accessToken: string;
  readonly refreshToken?: string;
  /** ISO-8601 timestamp when the access token expires. */
  readonly expiresAt: string;
  /** True when the token should be refreshed before use. */
  readonly requiresRefresh: boolean;
}

/** The authentication session state. */
export interface Session {
  readonly status: SessionStatus;
  readonly tokens?: TokenMetadata;
  readonly user?: CurrentUser;
  readonly organization?: OrganizationContext;
}

/**
 * P64 Phase 1 (AD-4) — the DERIVED kind of principal an account is, never
 * a stored flag: `platform_owner` (the flag), `staff` (any organization
 * membership or active `academy_members` row), `learner` (only
 * `academy_students` rows), `unaffiliated` (none of the above — e.g. a
 * brand-new account that has not created an organization yet).
 *
 * The SURFACE decides what a kind may do: a `learner` is refused a
 * management session at sign-in (AD-5) and, should one exist anyway, is
 * kept out of `/dashboard/*` by `RouteGuard` and sent to the academy
 * chooser. Nothing here is the control — `ManagementSurfaceGuard` on the
 * backend refuses learner tokens on every management controller.
 */
export type PrincipalKind =
  | 'platform_owner'
  | 'staff'
  | 'learner'
  | 'unaffiliated';

/**
 * One academy the account is a STUDENT of, with the public host the
 * learner should sign in on. `host` is absent when the academy has no
 * live website host yet — the UI then names the academy without a link.
 */
export interface LearnerAcademy {
  readonly academyId: string;
  readonly name: string;
  readonly slug: string;
  readonly host?: string;
  /** e.g. `active` | `pending` (awaiting approval) — rendered, never switched on exhaustively. */
  readonly membershipStatus: string;
  readonly blocked: boolean;
}

/** The authenticated user's profile. */
export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly organizations: readonly OrganizationMembership[];
  readonly organizationMemberships: readonly OrganizationMembership[];
  /** P64 Phase 1 — see `PrincipalKind`. */
  readonly principalKind: PrincipalKind;
  /**
   * P64 Phase 1 (§T) — whether the backend is actually refusing this
   * principal the management surface right now. `false` only during the
   * `surface.enforce` staged rollout, for a learner it has not reached.
   * Absent on a response that predates the field, which is read as
   * enforced.
   */
  readonly managementSurfaceEnforced?: boolean;
  /** P64 Phase 1 — every academy this account is a student of. Empty for pure staff. */
  readonly academies: readonly LearnerAcademy[];
  readonly preferences?: UserPreferences;
  readonly createdAt: string;
  readonly lastSignInAt?: string;
}

/** Organization membership details. */
export interface OrganizationMembership {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly isPrimary: boolean;
  readonly joinedAt: string;
}

/** The active organization context. */
export interface OrganizationContext {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly permissions: readonly string[];
}

/** User-specific preferences. */
export interface UserPreferences {
  readonly theme?: string;
  readonly language?: string;
  readonly notifications?: NotificationPreferences;
}

/** Notification preferences. */
export interface NotificationPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
}

/**
 * P64 Phase 1 (AD-5) — which product surface a sign-in is for. The
 * backend mints a session shaped for that surface: a learner is refused
 * on `management`; on `academy` the caller's membership of `academyId`
 * (verified against the request host) is what is signed in.
 */
export type SignInSurface = 'management' | 'academy';

/** Credentials provided during sign-in. */
export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  /** Defaults to `management` server-side; every caller sets it explicitly. */
  readonly surface?: SignInSurface;
  /** Required when `surface` is `academy` — the resolved academy of the current host. */
  readonly academyId?: string;
}

/**
 * The academies named by a management sign-in refusal
 * (`errors.auth.studentUseAcademySignIn` → `details.academies`) — the
 * places the refused learner CAN sign in. Parsed defensively from the
 * error's untyped `details`, see `readRefusedAcademies`.
 */
export interface RefusedSignInAcademy {
  readonly academyId: string;
  readonly name: string;
  readonly slug: string;
  readonly host?: string;
}

/**
 * Completes a challenged sign-in. `surface`/`academyId` are passed through
 * from the ORIGINAL sign-in so the backend mints the right session — the
 * challenge id alone does not remember which surface asked for it.
 */
export interface TwoFactorVerifyInput {
  readonly challengeId: string;
  readonly token?: string;
  readonly recoveryCode?: string;
  readonly surface?: SignInSurface;
  readonly academyId?: string;
}

/** Response returned after successful authentication. */
export interface AuthenticationResponse {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresIn: number;
  readonly user: CurrentUser;
}

/** Request to refresh an expired access token. */
export interface TokenRefreshRequest {
  readonly refreshToken: string;
}

/** Response returned after token refresh. */
export interface TokenRefreshResponse {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresIn: number;
}

/**
 * Account registration (Prompt 13). Creates an account but does not
 * establish a session — the caller still signs in afterward, matching
 * `RegistrationForm`'s existing navigate-to-sign-in behavior.
 */
export interface RegistrationRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  /** Phase 1 (Extended Scope, Decision 11, dependency D) — supplied only by an Academy's own public website Sign Up page, so the resulting account gets a real, validated Academy-scoped membership instead of none at all. */
  readonly academyId?: string;
  /** P64 Phase 1 — the invitation token from the sign-up link (`?invite=`), required by academies with an invite-only registration policy. */
  readonly inviteToken?: string;
}

/** `POST /auth/password-reset/validate` — whether a reset token is currently usable. */
export interface PasswordResetTokenValidation {
  readonly valid: boolean;
}

/** `POST /auth/verify-email` — completes email verification with the emailed token. */
export interface EmailVerificationRequest {
  readonly token: string;
}

/** Requests a password-reset email be sent. */
export interface PasswordResetRequest {
  readonly email: string;
}

/** Completes a password reset using the token from the reset email. */
export interface PasswordResetConfirmation {
  readonly token: string;
  readonly newPassword: string;
}

/** Authorization policy evaluation request. */
export interface AuthorizationRequest {
  readonly resource: string;
  readonly action: string;
  readonly context?: Record<string, unknown>;
}

/** Authorization policy evaluation result. */
export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/** Permission check result. */
export interface PermissionCheck {
  readonly hasPermission: boolean;
  readonly missingPermissions?: readonly string[];
}

/** Role check result. */
export interface RoleCheck {
  readonly hasRole: boolean;
  readonly missingRoles?: readonly string[];
}

/** Organization switch request. */
export interface SwitchOrganizationRequest {
  readonly organizationId: string;
}
/**
 * One active device session (Phase 10) — mirrors the backend's
 * `UserSessionResponse` exactly.
 *
 * Every descriptive field is optional because the backend genuinely does
 * not know it for sessions that predate Phase 10, and it reports that
 * honestly rather than backfilling a plausible-looking value. The UI must
 * therefore render an explicit "unknown" state for each, never invent a
 * label, an address, or a last-active time.
 *
 * `id` is the session id, not a token and not a refresh-token row id — it
 * is only useful for revoking a session the caller already owns.
 */
export interface UserSession {
  readonly id: string;
  readonly deviceLabel?: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;
  /**
   * ISO 3166-1 alpha-2 country from Cloudflare's edge, e.g. `EG`.
   * Rendered as a localized country NAME by `formatCountryName`.
   *
   * Country only — Atlas has no trustworthy city-level source and does
   * not guess one from an IP. Absent means genuinely unknown, and the UI
   * says "Location unavailable" rather than inventing a place.
   */
  readonly locationCountry?: string;
  /** ISO-8601. When the user signed in on this device. */
  readonly startedAt: string;
  /** ISO-8601. Real last activity — sign-in or most recent token refresh. */
  readonly lastUsedAt?: string;
  readonly expiresAt: string;
  /** True for the session making the request, so the UI can mark it and warn that revoking it signs the user out. */
  readonly isCurrent: boolean;
}

/**
 * Two-factor authentication (Phase 10.3) — mirrors the backend contracts.
 */
export interface TwoFactorStatus {
  readonly enabled: boolean;
  /** A setup was started but never confirmed. 2FA is NOT enforced in this state. */
  readonly pendingSetup: boolean;
  readonly recoveryCodesRemaining: number;
}

export interface TwoFactorSetupResult {
  /**
   * Base32 secret for manual entry. Returned exactly ONCE, by the setup
   * call — it is unrecoverable afterwards, so it must never be cached,
   * logged, or persisted anywhere by the client.
   */
  readonly secret: string;
  readonly qrCodeDataUri: string;
}

/**
 * What a sign-in returns when the password alone is not enough.
 *
 * `challengeId` is NOT a token. It authenticates nothing, is accepted by
 * exactly one endpoint, and must never be sent as an Authorization
 * header.
 */
export interface TwoFactorChallenge {
  readonly twoFactorRequired: true;
  readonly challengeId: string;
  readonly expiresIn: number;
}

/**
 * Discriminates a second-factor challenge from anything else a sign-in
 * path can produce.
 *
 * Deliberately accepts a broad `object` rather than a narrow union: the
 * same check runs against the raw API response in `SessionService` and
 * against the already-established `Session | TwoFactorChallenge` in the
 * identity provider, and a narrow parameter type would force a cast at
 * one of those call sites — exactly where a mistake would be costly.
 */
export function isTwoFactorChallenge(
  response: object
): response is TwoFactorChallenge {
  return (response as TwoFactorChallenge).twoFactorRequired === true;
}
