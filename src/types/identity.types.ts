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

/** Credentials provided during sign-in. */
export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
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