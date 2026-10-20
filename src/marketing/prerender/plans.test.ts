/**
 * SPEC §C / DL-38 — the build uses the LIVE catalog; a failed fetch fails
 * the build unless the snapshot is explicitly allowed
 * (MARKETING_PLANS_ALLOW_SNAPSHOT=1, local/tests only). An unpublishable
 * live catalog (non-EGP, premium family) is never replaced by the snapshot.
 */
import { describe, expect, it, vi } from 'vitest';
import snapshot from '../data/plans.snapshot.json';
import {
  MarketingPlansError,
  assertPublishablePlans,
  loadPlans,
  snapshotAllowed,
} from './plans';
import { FIXTURE_PLANS } from './test-fixtures';

const ok = (body: unknown) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
const failing = () =>
  vi.fn(async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  });

describe('loadPlans', () => {
  it('returns the live catalog', async () => {
    const fetch = ok(FIXTURE_PLANS);
    const loaded = await loadPlans({
      url: 'https://api.test/plans',
      allowSnapshot: false,
      readSnapshot: () => snapshot,
      fetch,
    });
    expect(loaded.source).toBe('live');
    expect(loaded.plans).toHaveLength(3);
    expect(fetch).toHaveBeenCalledWith('https://api.test/plans', expect.anything());
  });

  it('fails the build when the fetch fails and the snapshot is not allowed', async () => {
    const readSnapshot = vi.fn(() => snapshot);
    await expect(
      loadPlans({ allowSnapshot: false, readSnapshot, fetch: failing() })
    ).rejects.toThrow(/MARKETING_PLANS_ALLOW_SNAPSHOT=1/);
    expect(readSnapshot).not.toHaveBeenCalled();
  });

  it('fails on an HTTP error too', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => null }));
    await expect(loadPlans({ allowSnapshot: false, readSnapshot: () => snapshot, fetch })).rejects.toThrow(
      /HTTP 503/
    );
  });

  it('uses the snapshot only when allowed, and says why', async () => {
    const loaded = await loadPlans({ allowSnapshot: true, readSnapshot: () => snapshot, fetch: failing() });
    expect(loaded.source).toBe('snapshot');
    expect(loaded.fetchError).toContain('ENOTFOUND');
    expect(loaded.plans.length).toBeGreaterThan(0);
  });

  it('times out', async () => {
    const fetch = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          );
        })
    );
    await expect(
      loadPlans({ allowSnapshot: false, timeoutMs: 10, readSnapshot: () => snapshot, fetch })
    ).rejects.toThrow(/timed out after 10 ms/);
  });

  it('never papers over an unpublishable live catalog with the snapshot', async () => {
    const usd = [{ ...FIXTURE_PLANS[0], pricing: { amount: 10, currency: 'USD' } }];
    await expect(
      loadPlans({ allowSnapshot: true, readSnapshot: () => snapshot, fetch: ok(usd) })
    ).rejects.toBeInstanceOf(MarketingPlansError);
  });
});

describe('assertPublishablePlans', () => {
  it('accepts the committed snapshot (the live response shape)', () => {
    expect(() => assertPublishablePlans(snapshot)).not.toThrow();
  });

  it.each([
    ['not an array', {}],
    ['empty', []],
    ['missing key', [{ ...FIXTURE_PLANS[0], key: '' }]],
    ['missing limits', [{ ...FIXTURE_PLANS[0], limits: undefined }]],
    ['non-EGP', [{ ...FIXTURE_PLANS[0], pricing: { amount: 1, currency: 'USD' } }]],
    ['premium family', [{ ...FIXTURE_PLANS[0], family: 'premium' }]],
  ])('rejects %s', (_name, value) => {
    expect(() => assertPublishablePlans(value)).toThrow(MarketingPlansError);
  });
});

describe('snapshotAllowed', () => {
  it('is on only for explicit values', () => {
    expect(snapshotAllowed('1')).toBe(true);
    expect(snapshotAllowed('true')).toBe(true);
    expect(snapshotAllowed(undefined)).toBe(false);
    expect(snapshotAllowed('')).toBe(false);
    expect(snapshotAllowed('0')).toBe(false);
  });
});
