/**
 * Token Service.
 *
 * Owns the lifecycle of authentication tokens: storage, retrieval, expiration
 * detection, and invalidation. This service abstracts token management so the
 * rest of the identity layer never touches storage directly.
 */
import { STORAGE_KEYS } from '@constants';
import type { TokenMetadata } from '@types';

/** Token storage shape persisted to localStorage. */
interface StoredTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt: string;
}

/**
 * Threshold in milliseconds before expiration when a token should be refreshed.
 * Default: 5 minutes.
 */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export class TokenService {
  /**
   * Stores tokens securely.
   *
   * @param tokens Token metadata to persist.
   */
  public store(tokens: TokenMetadata): void {
    const stored: StoredTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    localStorage.setItem(STORAGE_KEYS.authTokens, JSON.stringify(stored));
  }

  /**
   * Retrieves stored tokens.
   *
   * @returns Token metadata if available, null otherwise.
   */
  public retrieve(): TokenMetadata | null {
    const raw = localStorage.getItem(STORAGE_KEYS.authTokens);
    if (!raw) return null;

    try {
      const stored = JSON.parse(raw) as StoredTokens;
      return {
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        expiresAt: stored.expiresAt,
        requiresRefresh: this.shouldRefresh(stored.expiresAt),
      };
    } catch {
      // Corrupted storage; treat as missing.
      this.clear();
      return null;
    }
  }

  /**
   * Checks whether tokens exist without loading them.
   */
  public exists(): boolean {
    return localStorage.getItem(STORAGE_KEYS.authTokens) !== null;
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

  /**
   * Removes all stored tokens.
   */
  public clear(): void {
    localStorage.removeItem(STORAGE_KEYS.authTokens);
  }

  /**
   * Creates token metadata from an authentication response.
   *
   * @param accessToken The access token string.
   * @param expiresIn Lifetime in seconds.
   * @param refreshToken Optional refresh token.
   */
  public createMetadata(
    accessToken: string,
    expiresIn: number,
    refreshToken?: string
  ): TokenMetadata {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
      accessToken,
      refreshToken,
      expiresAt,
      requiresRefresh: false,
    };
  }
}

export const tokenService = new TokenService();