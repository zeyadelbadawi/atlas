/**
 * `isSafeReturnPath` — the open-redirect guard on every sign-in
 * `returnTo` / `redirect`. Only a same-site path is accepted: no scheme,
 * no `//host`, and nothing a browser would rewrite into one (control
 * characters and whitespace it strips, backslashes it reads as `/`).
 */
import { describe, expect, it } from 'vitest';
import { isSafeReturnPath } from './utils/academy-surface.utils';

describe('isSafeReturnPath', () => {
  it.each([['/ok/path?x=1'], ['/ar/my'], ['/verify-email'], ['/my#section']])(
    'accepts the same-site path %j',
    (value) => {
      expect(isSafeReturnPath(value)).toBe(true);
    }
  );

  it.each([
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
    ['absolute URL', 'https://evil.com'],
    ['scheme', 'javascript:alert(1)'],
    ['no leading slash', 'evil.com/path'],
    ['protocol-relative', '//evil.com'],
    ['backslash after the slash', '/\\evil.com'],
    ['backslash anywhere', '/ok\\..\\evil'],
    // `/%09/evil.com` as it arrives once the query string is decoded.
    ['decoded tab', decodeURIComponent('/%09/evil.com')],
    ['tab', '/\t/evil.com'],
    ['newline', '/\nfoo'],
    ['carriage return', '/\r/evil.com'],
    ['space', '/ /evil.com'],
    ['NUL', '/\u0000foo'],
    ['DEL', '/\u007ffoo'],
  ])('refuses %s', (_label, value) => {
    expect(isSafeReturnPath(value)).toBe(false);
  });
});
