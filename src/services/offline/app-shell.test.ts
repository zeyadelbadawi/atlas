/**
 * The app-shell worker is registered in a production build on the platform
 * host and on Academy websites (each its own origin, scope `/`), never in
 * development, and the kill switch removes a previously installed one.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUpAppShell } from './app-shell';

function stubServiceWorker() {
  const unregister = vi.fn().mockResolvedValue(true);
  const register = vi.fn().mockResolvedValue({});
  const postMessage = vi.fn();
  const serviceWorker = {
    register,
    ready: Promise.resolve({ active: { postMessage } }),
    getRegistrations: vi
      .fn()
      .mockResolvedValue([
        { active: { scriptURL: 'https://atlas.test/sw.js' }, unregister },
      ]),
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorker,
  });
  return { register, unregister, postMessage };
}

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe('setUpAppShell', () => {
  it('registers /sw.js on the platform host in a production build', async () => {
    const { register, postMessage } = stubServiceWorker();
    setUpAppShell({
      surface: 'platform',
      isProductionBuild: true,
      enabled: true,
    });
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    await vi.waitFor(() =>
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'atlas:cache-assets' })
      )
    );
  });

  it('registers on an Academy website too, at its own origin root', () => {
    const { register } = stubServiceWorker();
    setUpAppShell({
      surface: 'academy',
      isProductionBuild: true,
      enabled: true,
    });
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('never registers in development', () => {
    const { register } = stubServiceWorker();
    setUpAppShell({
      surface: 'platform',
      isProductionBuild: false,
      enabled: true,
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('kill switch: unregisters an installed worker instead', async () => {
    const { register, unregister } = stubServiceWorker();
    setUpAppShell({
      surface: 'platform',
      isProductionBuild: true,
      enabled: false,
    });
    expect(register).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
  });
});
