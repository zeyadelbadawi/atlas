import { describe, expect, it, vi } from 'vitest';
import {
  probeHostAnswers,
  resolveCanonicalOrigin,
  resolveCanonicalRedirect,
  resolveMovedHostRedirect,
} from './canonical-redirect.utils';

const at = (hostname: string) => ({
  hostname,
  pathname: '/ar/courses/x',
  search: '?utm=1',
  hash: '#top',
});

describe('canonical-redirect.utils (P63)', () => {
  it('sends a visitor on the Atlas subdomain to the connected custom domain, keeping path, query and hash', () => {
    expect(
      resolveCanonicalRedirect(
        at('elzozo.atlass.dpdns.org'),
        'learn.elzozo.com',
        false
      )
    ).toBe('https://learn.elzozo.com/ar/courses/x?utm=1#top');
  });

  it('never moves a returning Google flow off the origin it started on', () => {
    // The binder cookie is host-only and the handoff is refused elsewhere.
    expect(
      resolveCanonicalRedirect(
        {
          hostname: 'elzozo.atlass.dpdns.org',
          pathname: '/auth/google/return',
          search: '',
          hash: '#h=abc',
        },
        'learn.elzozo.com',
        false
      )
    ).toBeNull();
  });

  it('does nothing on the canonical host itself, case-insensitively', () => {
    expect(
      resolveCanonicalRedirect(
        at('Learn.Elzozo.com'),
        'learn.elzozo.com',
        false
      )
    ).toBeNull();
  });

  it('does nothing without a canonical host, in development, or on a local/IP host', () => {
    expect(
      resolveCanonicalRedirect(at('elzozo.atlass.dpdns.org'), undefined, false)
    ).toBeNull();
    expect(
      resolveCanonicalRedirect(
        at('elzozo.atlass.dpdns.org'),
        'learn.elzozo.com',
        true
      )
    ).toBeNull();
    expect(
      resolveCanonicalRedirect(at('localhost'), 'learn.elzozo.com', false)
    ).toBeNull();
    expect(
      resolveCanonicalRedirect(at('127.0.0.1'), 'learn.elzozo.com', false)
    ).toBeNull();
  });

  it('the canonical origin follows the canonical host, else the current origin', () => {
    expect(
      resolveCanonicalOrigin(
        'https://elzozo.atlass.dpdns.org',
        'Learn.Elzozo.com'
      )
    ).toBe('https://learn.elzozo.com');
    expect(
      resolveCanonicalOrigin('https://elzozo.atlass.dpdns.org', undefined)
    ).toBe('https://elzozo.atlass.dpdns.org');
  });
});

describe('probeHostAnswers (P63g) — never redirect to a host that does not answer', () => {
  it('resolves true when the opaque fetch succeeds and false when the network layer fails', async () => {
    const ok = vi.fn().mockResolvedValue({ type: 'opaque' });
    await expect(
      probeHostAnswers('https://rawc.ae/x', 1000, ok as unknown as typeof fetch)
    ).resolves.toBe(true);
    expect(ok).toHaveBeenCalledWith(
      'https://rawc.ae/?__atlas_probe=1',
      expect.objectContaining({ mode: 'no-cors', cache: 'no-store' })
    );
    const dead = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      probeHostAnswers(
        'https://dead.example/',
        1000,
        dead as unknown as typeof fetch
      )
    ).resolves.toBe(false);
  });

  it('gives up after the timeout', async () => {
    const hang = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          );
        })
    );
    await expect(
      probeHostAnswers(
        'https://slow.example/',
        20,
        hang as unknown as typeof fetch
      )
    ).resolves.toBe(false);
  });
});

describe('resolveMovedHostRedirect (slug change: the old address redirects)', () => {
  it('moves a visitor on an old address to the new one, keeping path, query and hash', () => {
    expect(
      resolveMovedHostRedirect(
        at('nour-old.atlass.dpdns.org'),
        'nour-new.atlass.dpdns.org',
        false
      )
    ).toBe('https://nour-new.atlass.dpdns.org/ar/courses/x?utm=1#top');
  });

  it('does nothing without a redirect, on the target itself, or in development', () => {
    expect(
      resolveMovedHostRedirect(at('nour.atlass.dpdns.org'), undefined, false)
    ).toBeNull();
    expect(
      resolveMovedHostRedirect(
        at('nour-new.atlass.dpdns.org'),
        'NOUR-NEW.atlass.dpdns.org',
        false
      )
    ).toBeNull();
    expect(
      resolveMovedHostRedirect(
        at('nour-old.atlass.dpdns.org'),
        'nour-new.atlass.dpdns.org',
        true
      )
    ).toBeNull();
  });

  it('never follows a target that is not a plain hostname (no open redirect)', () => {
    for (const target of [
      'evil.example/path',
      'evil.example:8443',
      'user@evil.example',
      '//evil.example',
      'https://evil.example',
      'evil.example?x=1',
      'localhost',
      '',
    ]) {
      expect(
        resolveMovedHostRedirect(at('nour-old.atlass.dpdns.org'), target, false)
      ).toBeNull();
    }
  });
});
