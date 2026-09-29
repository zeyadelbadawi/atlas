/**
 * Token Service.
 *
 * Owns the lifecycle of the ACCESS token: memory-only storage, expiry
 * detection and invalidation.
 *
 * PRODUCTION-READINESS PASS — no token touches Web Storage any more:
 *   - the refresh token lives only in the HttpOnly `__Host-atlas_session`
 *     cookie, which script cannot read (the server never puts it in a body);
 *   - the access token (15 minutes) lives only in this module's memory, so it
 *     disappears with the page; a reload re-obtains it from the cookie via
 *     `POST /auth/refresh`;
 *   - `localStorage` holds only a non-secret '1' hint that a cookie session
 *     probably exists on this host, so anonymous page loads do not call
 *     `/auth/refresh` for nothing.
 *
 * Builds before this change kept both tokens in `localStorage`. The first
 * load of this build takes that refresh token ONCE (`takeLegacyRefreshToken`)
 * to convert the session into a cookie, and deletes it.
 */
import { STORAGE_KEYS } from '@constants';
import type { TokenMetadata } from '@types';

/**
 * Threshold in milliseconds before expiration when a token should be refreshed.
 * Default: 5 minutes.
 */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked storage only costs the anonymous-page optimisation.
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove.
  }
}

export class TokenService {
  private current: { accessToken: string; expiresAt: string } | null = null;

  /** Keeps the access token in memory and records that a session exists here. */
  public store(tokens: TokenMetadata): void {
    this.current = { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt };
    storageSet(STORAGE_KEYS.sessionHint, '1');
  }

  /** The in-memory access token, if this page holds one. */
  public retrieve(): TokenMetadata | null {
    if (!this.current) return null;
    return {
      accessToken: this.current.accessToken,
      expiresAt: this.current.expiresAt,
      requiresRefresh: this.shouldRefresh(this.current.expiresAt),
    };
  }

  /** Whether this page holds an access token. */
  public exists(): boolean {
    return this.current !== null;
  }

  /**
   * Whether a refresh is worth attempting: this page had a session, the
   * browser says a cookie session probably exists on this host, or an older
   * build left a token to convert.
   */
  public mayHaveSession(): boolean {
    return (
      this.current !== null ||
      storageGet(STORAGE_KEYS.sessionHint) === '1' ||
      storageGet(STORAGE_KEYS.legacyAuthTokens) !== null
    );
  }

  /**
   * The refresh token an older build left in `localStorage`, returned ONCE
   * and deleted immediately — it is converted into a cookie session by the
   * next refresh and never stored again.
   */
  public takeLegacyRefreshToken(): string | undefined {
    const raw = storageGet(STORAGE_KEYS.legacyAuthTokens);
    if (raw === null) return undefined;
    storageRemove(STORAGE_KEYS.legacyAuthTokens);
    try {
      const parsed = JSON.parse(raw) as { refreshToken?: unknown };
      return typeof parsed.refreshToken === 'string' && parsed.refreshToken.length > 0
        ? parsed.refreshToken
        : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Reports whether a token has expired.
   *
   * @param expiresAt ISO-8601 expiration timestamp.
   */
  public isExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  /**
   * Reports whether a token should be refreshed proactively.
   *
   * @param expiresAt ISO-8601 expiration timestamp.
   */
  public shouldRefresh(expiresAt: string): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    return expirationTime - Date.now() <= REFRESH_THRESHOLD_MS;
  }

  /** Forgets the access token, the session hint and any legacy token. */
  public clear(): void {
    this.current = null;
    storageRemove(STORAGE_KEYS.sessionHint);
    storageRemove(STORAGE_KEYS.legacyAuthTokens);
  }

  /**
   * Creates token metadata from an authentication response.
   *
   * @param accessToken The access token string.
   * @param expiresIn Lifetime in seconds.
   */
  public createMetadata(accessToken: string, expiresIn: number): TokenMetadata {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
      accessToken,
      expiresAt,
      requiresRefresh: false,
    };
  }
}

export const tokenService = new TokenService();
