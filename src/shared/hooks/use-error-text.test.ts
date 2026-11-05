/**
 * B1 (UX audit) — a backend error key the catalogue lacks falls back to the
 * caller's message instead of rendering an empty error box in production.
 */
import { describe, expect, it } from 'vitest';
import { resolveErrorTextKey } from './useErrorText';

const known = new Set(['errors:auth.accountLocked']);
const exists = (key: string) => known.has(key);

describe('resolveErrorTextKey', () => {
  it('uses the specific translated message', () => {
    expect(resolveErrorTextKey('errors.auth.accountLocked', 'x:fallback', exists)).toBe(
      'errors:auth.accountLocked'
    );
  });

  it('falls back when the backend key is not translated', () => {
    expect(resolveErrorTextKey('errors.auth.brandNew', 'x:fallback', exists)).toBe('x:fallback');
  });

  it('falls back when there is no key', () => {
    expect(resolveErrorTextKey(undefined, 'x:fallback', exists)).toBe('x:fallback');
  });
});
