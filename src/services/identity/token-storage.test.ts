/**
 * No credential ever touches Web Storage.
 *
 * The access token lives in memory only; the refresh token is the HttpOnly
 * session cookie. `localStorage` may hold exactly one thing: the non-secret
 * '1' session hint. A token an older build left there is handed out once for
 * conversion and deleted.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@constants';
import { TokenService } from './token.service';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.sig';

function webStorageDump(): string {
  const all: string[] = [];
  for (const store of [localStorage, sessionStorage]) {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)!;
      all.push(`${key}=${store.getItem(key)}`);
    }
  }
  return all.join('\n');
}

describe('TokenService — memory-only access token', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores the access token in memory and only a non-secret hint in localStorage', () => {
    const tokens = new TokenService();
    tokens.store(tokens.createMetadata(JWT, 900));

    expect(tokens.retrieve()?.accessToken).toBe(JWT);
    expect(webStorageDump()).not.toContain(JWT);
    expect(localStorage.getItem(STORAGE_KEYS.sessionHint)).toBe('1');
    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(0);
  });

  it('a fresh page (new instance) holds no token but knows a cookie session may exist', () => {
    new TokenService().store(new TokenService().createMetadata(JWT, 900));
    const reloaded = new TokenService();
    expect(reloaded.retrieve()).toBeNull();
    expect(reloaded.mayHaveSession()).toBe(true);
  });

  it('an anonymous visitor does not attempt a refresh', () => {
    expect(new TokenService().mayHaveSession()).toBe(false);
  });

  it('hands a legacy localStorage refresh token out exactly once and deletes it', () => {
    localStorage.setItem(
      STORAGE_KEYS.legacyAuthTokens,
      JSON.stringify({ accessToken: JWT, refreshToken: 'legacy-refresh' }),
    );
    const tokens = new TokenService();
    expect(tokens.mayHaveSession()).toBe(true);
    expect(tokens.takeLegacyRefreshToken()).toBe('legacy-refresh');
    expect(localStorage.getItem(STORAGE_KEYS.legacyAuthTokens)).toBeNull();
    expect(tokens.takeLegacyRefreshToken()).toBeUndefined();
  });

  it('discards a malformed legacy entry without throwing', () => {
    localStorage.setItem(STORAGE_KEYS.legacyAuthTokens, '{not json');
    const tokens = new TokenService();
    expect(tokens.takeLegacyRefreshToken()).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEYS.legacyAuthTokens)).toBeNull();
  });

  it('clear() forgets the token, the hint and any legacy entry', () => {
    localStorage.setItem(STORAGE_KEYS.legacyAuthTokens, '{}');
    const tokens = new TokenService();
    tokens.store(tokens.createMetadata(JWT, 900));
    tokens.clear();
    expect(tokens.retrieve()).toBeNull();
    expect(tokens.mayHaveSession()).toBe(false);
    expect(localStorage.length).toBe(0);
  });
});
