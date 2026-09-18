import { describe, expect, it, probeHostAnswers, vi } from 'vitest';
import {
  probeHostAnswers,
  resolveCanonicalOrigin,
  resolveCanonicalRedirect,
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
