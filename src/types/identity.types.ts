/**
 * Identity and authentication types.
 *
 * These types describe the shape of authentication state, sessions, users and
 * authorization without depending on any specific backend implementation.
 */

/** The lifecycle states of a session. */
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'restoring';

/**
 * Token metadata tracking expiration and refresh requirements.
 *
 * Only the short-lived ACCESS token is ever visible to the page, and only in
 * memory. The refresh token lives in the HttpOnly session cookie and is never
 * readable by script (production-readiness pass).
 */
export interface TokenMetadata {
  readonly accessToken: string;
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
  'platform_owner' | 'staff' | 'learner' | 'unaffiliated';

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
  /**
   * W4 — true when the account was admitted here while another learner
   * already used its display name; the profile asks for a different one.
   * Reported only to the account itself, once its email is verified.
   */
  readonly nameChangeSuggested?: boolean;
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
  /**
   * New Customer Onboarding — `true` only for the OWNER of an organization
   * whose setup has not been finished or deferred yet
   * (`role === 'owner' AND organizations.onboarding_completed_at IS NULL`).
   *
   * COMPUTED SERVER-SIDE on every sign-in, OTP, refresh and `/users/me`
   * response, and never stored or flipped here: after completing
   * onboarding the client re-reads the session to learn the new value.
   * Absent on a response that predates the field, which reads as "not
   * pending", so an existing customer is never routed into setup.
   */
  readonly onboardingPending?: boolean;
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
  readonly expiresIn: number;
  readonly user: CurrentUser;
  /** How this session's first factor was proven — feeds the "Last used" hint. Older backends omit it. */
  readonly authMethod?: AuthMethod;
}

/**
 * Request to refresh an expired access token. Browsers send no token: the
 * session cookie is the credential. `refreshToken` exists only to convert a
 * pre-cookie session left in `localStorage` by an older build, once.
 */
export interface TokenRefreshRequest {
  readonly refreshToken?: string;
}

/** Response returned after token refresh. */
export interface TokenRefreshResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
}

/**
 * Launch Stabilization A4 — what `POST /auth/register` did: created a new
 * account, or added the academy to an account that already existed (the
 * existing password proven). Never a session either way.
 */
export interface RegistrationResult {
  readonly account: 'new' | 'existing';
  /**
   * Set when an existing account joined an academy: whether that new
   * learner membership is already active or awaits the academy's approval.
   */
  readonly status?: 'active' | 'pending';
}

/**
 * Smart academy signup — `POST /auth/academy-join`: an existing Atlas
 * account joins the academy whose website this is, proven by its own
 * password. Never creates an account; answered like a sign-in.
 */
export interface AcademyJoinRequest {
  readonly email: string;
  readonly password: string;
  readonly academyId: string;
  readonly inviteToken?: string;
}

/**
 * `GET /auth/academy-join/summary` — the account's OTHER academies, named
 * only to a fully signed-in session (password + this academy's emailed
 * code) on the academy it joined moments ago; empty otherwise.
 */
export interface AcademyJoinSummary {
  readonly otherAcademies: readonly string[];
}

/** Returned only once the password has been proven. */
export interface AcademyJoinResult {
  readonly account: 'existing';
  readonly status: 'active' | 'pending';
  readonly name: string;
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
  /**
   * New Customer Onboarding — the organization created in the same
   * transaction as the account (2–120 characters, trimmed). Management
   * surface only, and only while `GET /public/signup-options` reports
   * `organizationSignup: true`; never sent with `academyId`.
   */
  readonly organizationName?: string;
  /** New Customer Onboarding — the trial plan's `id` (a UUID). Requires `organizationName`. */
  readonly planId?: string;
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

/**
 * Email one-time-code step of sign-in (P66).
 *
 * Returned by `POST /auth/sign-in` when the password was right but the
 * academy/platform policy wants a code from the account's inbox — on a
 * new device, or always. Like `TwoFactorChallenge`, `challengeId` is NOT
 * a token: it is accepted by `/auth/otp/verify` and `/auth/otp/resend`
 * only, and confers no access.
 */
export interface EmailOtpChallenge {
  readonly emailOtpRequired: true;
  readonly challengeId: string;
  /** ISO timestamp — when the code stops being accepted. */
  readonly expiresAt: string;
  /** ISO timestamp — when a fresh code may be requested. */
  readonly resendAvailableAt: string;
  readonly resendsRemaining: number;
  /** e.g. `s•••@example.com` — the only address detail the client sees. */
  readonly maskedEmail: string;
}

/** Discriminates an email-code challenge; see `isTwoFactorChallenge` for why the parameter is broad. */
export function isEmailOtpChallenge(
  response: object
): response is EmailOtpChallenge {
  return (response as EmailOtpChallenge).emailOtpRequired === true;
}

/** Either interruption a sign-in can produce before a session exists. */
export type SignInChallenge = TwoFactorChallenge | EmailOtpChallenge;

/** `POST /auth/otp/verify` — completes an email-code challenge. */
export interface EmailOtpVerifyInput {
  readonly challengeId: string;
  /** Exactly six digits. */
  readonly code: string;
  readonly surface?: SignInSurface;
  readonly academyId?: string;
  /** Skip the code on this browser for the trusted-device window. */
  readonly rememberDevice: boolean;
}

/** `POST /auth/otp/resend` — a fresh code, with the next cooldown. */
export interface EmailOtpResendResult {
  readonly resendAvailableAt: string;
  readonly resendsRemaining: number;
}

/**
 * A browser the account chose to remember at an email-code step
 * (`GET /auth/trusted-devices`). Distinct from a session: a trusted
 * device is not signed in, it is merely allowed to skip the code.
 */
export interface TrustedDevice {
  readonly id: string;
  readonly label: string;
  readonly surface: SignInSurface;
  readonly lastUsedAt: string;
  readonly expiresAt: string;
  /** The browser making the request. */
  readonly current: boolean;
}

export interface TrustedDeviceList {
  readonly items: readonly TrustedDevice[];
}

/** The first factor a session was minted with. */
export type AuthMethod = 'password' | 'google';

/**
 * Google Identity — what a Google flow is for:
 *  - `sign_in` / `sign_up`: the signed-out pages;
 *  - `link`: Account settings, the signed-in account connects Google;
 *  - `setup`: the invitation/setup page, Google instead of a password.
 */
export type GoogleIntent = 'sign_in' | 'sign_up' | 'link' | 'setup';

/** `GET /auth/options` — which sign-in methods this host offers. */
export interface AuthOptions {
  readonly google: boolean;
}

/** `POST /auth/google/authorize`. `academyId` on an academy host; `currentPassword` for `link`; `setupToken` for `setup`. */
export interface GoogleAuthorizeRequest {
  readonly intent: GoogleIntent;
  readonly returnTo?: string;
  readonly academyId?: string;
  readonly currentPassword?: string;
  readonly setupToken?: string;
}

export interface GoogleAuthorizeResult {
  readonly authorizationUrl: string;
  readonly expiresAt: string;
}

/**
 * The step a Google sign-in needs before a session exists. `pending` is a
 * single-use reference to the flow for that step's own endpoint — NOT a
 * token, never stored beyond the page that shows the step.
 */
export interface GoogleStep {
  readonly googleStep: 'link_required' | 'create_account' | 'activate_invited';
  readonly pending: string;
  readonly expiresAt: string;
  /** The address just proven at Google — the person's own. */
  readonly email: string;
  /** `create_account` only: Google's display name, to prefill. */
  readonly name?: string;
  readonly returnPath?: string;
}

/** `link` intent: Google is now connected to the signed-in account. No session is minted. */
export interface GoogleLinked {
  readonly linked: true;
  readonly email: string;
  readonly returnPath?: string;
}

/** A session or a challenge — the same answers `POST /auth/sign-in` gives. */
export type GoogleSignInResult = (
  AuthenticationResponse | TwoFactorChallenge | EmailOtpChallenge
) & { readonly returnPath?: string };

export type GoogleCompleteResult =
  GoogleSignInResult | GoogleStep | GoogleLinked;

export function isGoogleStep(response: object): response is GoogleStep {
  return typeof (response as GoogleStep).googleStep === 'string';
}

export function isGoogleLinked(response: object): response is GoogleLinked {
  return (response as GoogleLinked).linked === true;
}

/** Step endpoints carry the pending reference and, on an invitation sign-up, its code. */
export interface GoogleStepRequest {
  readonly pending: string;
  readonly inviteToken?: string;
}

export interface GoogleLinkRequest extends GoogleStepRequest {
  readonly password: string;
}

export interface GoogleCreateAccountRequest extends GoogleStepRequest {
  readonly name: string;
  /** Management surface only. */
  readonly organizationName?: string;
  readonly planId?: string;
}

/** `GET /users/me/sign-in-methods`. */
export interface SignInMethods {
  readonly password: boolean;
  readonly google: { readonly email: string; readonly linkedAt: string } | null;
}
