/**
 * The console's API paths, and one bug they are here to prevent.
 *
 * `unsuppress` used to build its path as
 * `` this.path(`suppressions/${encodeURIComponent(email)}`) ``. That looks
 * careful and is wrong twice over: `resourcePath` runs
 * `encodeURIComponent` over EVERY segment it is handed, so the address
 * was encoded a second time, and the slash separating it from
 * `suppressions` was encoded along with it. The request went to
 * `platform-communications/suppressions%2Fa%2540b.com` and 404'd — the
 * "unblock" button in the console never worked.
 *
 * Nothing caught it because the page's own tests mock the service, and
 * the service's path building was never asserted. So these tests do the
 * one thing that would have: check the URL the client is actually asked
 * to call.
 */
import { describe, expect, it, vi } from 'vitest';
import { PlatformCommunicationsService } from './services/PlatformCommunicationsService';

function serviceWithSpy() {
  const calls: { method: string; path: string; options?: unknown }[] = [];
  const client = {
    get: vi.fn(async (path: string, options?: unknown) => {
      calls.push({ method: 'get', path, options });
      return {};
    }),
    delete: vi.fn(async (path: string) => {
      calls.push({ method: 'delete', path });
      return { lifted: true };
    }),
  };
  return {
    service: new PlatformCommunicationsService(client as never),
    calls,
  };
}

describe('PlatformCommunicationsService', () => {
  it('encodes an address exactly once, and never the path separator', async () => {
    const { service, calls } = serviceWithSpy();
    await service.unsuppress('a.user+tag@example.com');

    const { path } = calls[0];
    // One encoding: `@` → %40, `+` → %2B.
    expect(path).toBe(
      'platform-communications/suppressions/a.user%2Btag%40example.com',
    );
    // The separator survives as a real slash…
    expect(path).toContain('/suppressions/');
    // …and nothing is double-encoded (`%25` is an encoded percent sign).
    expect(path).not.toContain('%25');
    expect(path).not.toContain('%2F');
  });

  it('handles an address that needs no escaping without mangling it', async () => {
    const { service, calls } = serviceWithSpy();
    await service.unsuppress('plain@example.com');
    expect(calls[0].path).toBe(
      'platform-communications/suppressions/plain%40example.com',
    );
  });

  it('reads health and suppressions from their own paths', async () => {
    const { service, calls } = serviceWithSpy();
    await service.getHealth(30);
    await service.listSuppressions({ limit: 50 });

    expect(calls[0].path).toBe('platform-communications/health');
    expect(calls[1].path).toBe('platform-communications/suppressions');
  });
});
