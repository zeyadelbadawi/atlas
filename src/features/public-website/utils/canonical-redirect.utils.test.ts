import { describe, expect, it } from 'vitest';
import { resolveCanonicalOrigin, resolveCanonicalRedirect } from './canonical-redirect.utils';

const at = (hostname: string) => ({ hostname, pathname: '/ar/courses/x', search: '?utm=1', hash: '#top' });

describe('canonical-redirect.utils (P63)', () => {
  it('sends a visitor on the Atlas subdomain to the connected custom domain, keeping path, query and hash', () => {
    expect(resolveCanonicalRedirect(at('elzozo.atlass.dpdns.org'), 'learn.elzozo.com', false)).toBe(
      'https://learn.elzozo.com/ar/courses/x?utm=1#top'
    );
  });

  it('does nothing on the canonical host itself, case-insensitively', () => {
    expect(resolveCanonicalRedirect(at('Learn.Elzozo.com'), 'learn.elzozo.com', false)).toBeNull();
  });

  it('does nothing without a canonical host, in development, or on a local/IP host', () => {
    expect(resolveCanonicalRedirect(at('elzozo.atlass.dpdns.org'), undefined, false)).toBeNull();
    expect(resolveCanonicalRedirect(at('elzozo.atlass.dpdns.org'), 'learn.elzozo.com', true)).toBeNull();
    expect(resolveCanonicalRedirect(at('localhost'), 'learn.elzozo.com', false)).toBeNull();
    expect(resolveCanonicalRedirect(at('127.0.0.1'), 'learn.elzozo.com', false)).toBeNull();
  });

  it('the canonical origin follows the canonical host, else the current origin', () => {
    expect(resolveCanonicalOrigin('https://elzozo.atlass.dpdns.org', 'Learn.Elzozo.com')).toBe('https://learn.elzozo.com');
    expect(resolveCanonicalOrigin('https://elzozo.atlass.dpdns.org', undefined)).toBe('https://elzozo.atlass.dpdns.org');
  });
});
