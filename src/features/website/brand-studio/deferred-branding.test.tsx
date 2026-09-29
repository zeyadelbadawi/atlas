/**
 * Setup-form branding saved after provisioning (Theme 1 plan §F.4.3 step
 * 3, §I "deferred-persistence flow with retries"): the logo once the
 * Academy exists, the palette once the website configuration exists; each
 * retried with backoff, never saved twice, and a failure is recoverable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { mediaService } from '@features/media';
import { academyService } from '@features/academy';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import { pendingBrandingStore } from './pending-branding';
import { useDeferredBrandingPersistence } from './useDeferredBrandingPersistence';
import type { ProvisioningStep } from '@types';

const noWait = () => Promise.resolve();
const PALETTE = {
  seeds: { primary: '24 95% 53%' },
  overrides: {},
  variant: 'balanced' as const,
  status: 'confirmed' as const,
  source: 'logo' as const,
};

function request(
  academyId: string | undefined,
  theme: ProvisioningStep['status'] = 'pending'
) {
  return {
    id: 'req-1',
    academyId,
    steps: [{ key: 'theme', status: theme }] as unknown as ProvisioningStep[],
  };
}

let upload: MockInstance<typeof mediaService.uploadAsset>;
let branding: MockInstance<typeof academyService.updateAcademyBranding>;
let config: MockInstance<
  typeof websiteConfigurationService.updateConfiguration
>;

beforeEach(() => {
  pendingBrandingStore.set('req-1', {
    logoFile: new File(['logo'], 'logo.png', { type: 'image/png' }),
    palette: PALETTE,
  });
  upload = vi
    .spyOn(mediaService, 'uploadAsset')
    .mockResolvedValue({ url: '/api/v1/public/media/a/logo.png' } as never);
  branding = vi
    .spyOn(academyService, 'updateAcademyBranding')
    .mockResolvedValue({} as never);
  config = vi
    .spyOn(websiteConfigurationService, 'updateConfiguration')
    .mockResolvedValue({} as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  pendingBrandingStore.clear('req-1');
});

describe('useDeferredBrandingPersistence', () => {
  it('does nothing when the setup form left no branding', () => {
    pendingBrandingStore.clear('req-1');
    const { result } = renderHook(() =>
      useDeferredBrandingPersistence(request('a1', 'completed'), {
        wait: noWait,
      })
    );
    expect(result.current.state).toBe('none');
    expect(upload).not.toHaveBeenCalled();
  });

  it('saves the logo as soon as the Academy exists, and the palette after the theme step', async () => {
    const { result, rerender } = renderHook(
      ({ r }) => useDeferredBrandingPersistence(r, { wait: noWait }),
      { initialProps: { r: request(undefined) } }
    );
    expect(upload).not.toHaveBeenCalled();

    rerender({ r: request('a1', 'running') });
    await waitFor(() => expect(branding).toHaveBeenCalledTimes(1));
    expect(branding).toHaveBeenCalledWith('a1', {
      logo: '/api/v1/public/media/a/logo.png',
    });
    expect(config).not.toHaveBeenCalled();

    rerender({ r: request('a1', 'completed') });
    await waitFor(() => expect(result.current.state).toBe('saved'));
    expect(config).toHaveBeenCalledWith('a1', { brand: { palette: PALETTE } });
    // Nothing is repeated.
    expect(upload).toHaveBeenCalledTimes(1);
    expect(config).toHaveBeenCalledTimes(1);
  });

  it('retries with backoff, reports a failure, and a retry finishes the job', async () => {
    const waits: number[] = [];
    config.mockRejectedValue(new Error('503'));
    const { result } = renderHook(() =>
      useDeferredBrandingPersistence(request('a1', 'completed'), {
        delays: [1, 2, 4],
        wait: (ms) => {
          waits.push(ms);
          return Promise.resolve();
        },
      })
    );
    await waitFor(() => expect(result.current.state).toBe('failed'));
    expect(config).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([1, 2, 4]);
    // The logo had already been saved and isn't sent again.
    expect(upload).toHaveBeenCalledTimes(1);

    config.mockResolvedValue({} as never);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state).toBe('saved'));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('skips the palette when no theme was applied (no website to hold it)', async () => {
    const { result } = renderHook(() =>
      useDeferredBrandingPersistence(request('a1', 'skipped'), { wait: noWait })
    );
    await waitFor(() => expect(result.current.state).toBe('saved'));
    expect(branding).toHaveBeenCalledTimes(1);
    expect(config).not.toHaveBeenCalled();
  });
});
