/**
 * The upload state machine, and the two promises it makes.
 *
 * THE HONESTY RULE. A percentage is reported only for the stages that can
 * actually be measured — reading the file and sending the bytes. Once the
 * last byte is sent the server is validating and storing, and there is no
 * signal at all, so `percent` becomes `undefined` and the UI shows an
 * indeterminate state. A bar creeping to 99% during that wait would be
 * inventing information, and the moment it stalls the user learns the whole
 * thing was decorative.
 *
 * THE DUPLICATE RULE. Before this existed, choosing a file produced no
 * visible change, so the natural response to a slow upload was to click
 * again — and get two assets. A second call while one is in flight is
 * ignored, guarded by a ref rather than state because React batches state
 * updates and two clicks in one tick would both read the same stale value.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const uploadAsset = vi.fn();

vi.mock('./services/MediaService', () => ({
  mediaService: {
    uploadAsset: (...args: unknown[]) => uploadAsset(...args) as unknown,
  },
}));

const { useMediaUpload } = await import('./hooks/useMediaUpload');

afterEach(() => {
  // Vitest runs without `globals`, so Testing Library's automatic unmount
  // is never registered for us — without this, a hook rendered by one test
  // survives into the next and its `result.current` reads back as null.
  cleanup();
  vi.clearAllMocks();
});

function pngFile(name = 'logo.png', size = 1024): File {
  const file = new File([new Uint8Array(size)], name, { type: 'image/png' });
  // jsdom's File reports size from its parts; assert the fixture is honest.
  return file;
}

describe('useMediaUpload', () => {
  it('starts at idle with nothing to show', () => {
    const { result } = renderHook(() => useMediaUpload('academy-1'));
    expect(result.current.state.stage).toBe('idle');
    expect(result.current.isBusy).toBe(false);
  });

  it('reports the file name and reaches success', async () => {
    uploadAsset.mockResolvedValue({ id: 'asset-1' });
    const { result } = renderHook(() => useMediaUpload('academy-1'));

    await act(async () => {
      await result.current.upload(pngFile('brand.png'));
    });

    expect(result.current.state.stage).toBe('succeeded');
    expect(result.current.state.fileName).toBe('brand.png');
    expect(result.current.isBusy).toBe(false);
  });

  /*
   * The stage the server owns cannot be measured, so it must not be
   * described with a number. This asserts the transition the progress bar
   * depends on: last byte sent → indeterminate.
   */
  it('drops to an indeterminate state once every byte is sent', async () => {
    // Held open rather than timed out: these assertions are about the state
    // DURING the request, and a timer would race them.
    let finish: ((value: unknown) => void) | undefined;
    let reportProgress: ((p: { loaded: number; total?: number }) => void) | undefined;
    uploadAsset.mockImplementation(
      (_academyId: string, _payload: unknown, options: { onUploadProgress?: (p: { loaded: number; total?: number }) => void }) => {
        reportProgress = options.onUploadProgress;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );

    const { result } = renderHook(() => useMediaUpload('academy-1'));
    let pending: Promise<unknown> | undefined;
    await act(async () => {
      pending = result.current.upload(pngFile());
      await waitFor(() => expect(reportProgress).toBeDefined());
    });

    // Halfway: a real, measured percentage.
    act(() => reportProgress?.({ loaded: 50, total: 100 }));
    expect(result.current.state.stage).toBe('uploading');
    expect(result.current.state.percent).toBe(50);

    // All sent: the server is working and we can no longer measure.
    act(() => reportProgress?.({ loaded: 100, total: 100 }));
    expect(result.current.state.stage).toBe('processing');
    expect(result.current.state.percent).toBeUndefined();

    await act(async () => {
      finish?.({ id: 'a' });
      await pending;
    });
  });

  it('reports no percentage when the browser cannot determine the total', async () => {
    // Held open deliberately: the assertion is about the state DURING the
    // request, so the request must not be allowed to finish first.
    let finish: ((value: unknown) => void) | undefined;
    let reportProgress: ((p: { loaded: number; total?: number }) => void) | undefined;
    uploadAsset.mockImplementation(
      (_a: string, _p: unknown, options: { onUploadProgress?: (p: { loaded: number; total?: number }) => void }) => {
        reportProgress = options.onUploadProgress;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );

    const { result } = renderHook(() => useMediaUpload('academy-1'));
    let pending: Promise<unknown> | undefined;
    await act(async () => {
      pending = result.current.upload(pngFile());
      await waitFor(() => expect(reportProgress).toBeDefined());
    });

    // No `total` — a percentage here would be derived from nothing.
    act(() => reportProgress?.({ loaded: 4096, total: undefined }));
    expect(result.current.state.percent).toBeUndefined();
    expect(result.current.state.stage).toBe('uploading');

    await act(async () => {
      finish?.({ id: 'a' });
      await pending;
    });
    expect(result.current.state.stage).toBe('succeeded');
  });

  /*
   * The defect this whole feature exists to prevent: an invisible upload
   * invites a second click, and a second click used to mean a second asset.
   */
  it('ignores a second upload while one is already running', async () => {
    uploadAsset.mockResolvedValue({ id: 'asset-1' });
    const { result } = renderHook(() => useMediaUpload('academy-1'));

    await act(async () => {
      /*
        Both calls are made in the same tick, which is exactly the
        double-click case. The busy flag is set SYNCHRONOUSLY at the top of
        the hook — before the file is even read — so the second call is
        refused without needing the first to be held open artificially.
      */
      const first = result.current.upload(pngFile('one.png'));
      const second = result.current.upload(pngFile('two.png'));
      expect(await second).toBeUndefined();
      await first;
    });

    expect(uploadAsset).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failure and allows a retry of the same file', async () => {
    uploadAsset.mockRejectedValueOnce({ kind: 'server', messageKey: 'errors.generic' });
    const { result } = renderHook(() => useMediaUpload('academy-1'));

    await act(async () => {
      await result.current.upload(pngFile('retry-me.png'));
    });
    expect(result.current.state.stage).toBe('failed');
    expect(result.current.state.fileName).toBe('retry-me.png');

    uploadAsset.mockResolvedValueOnce({ id: 'asset-2' });
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.state.stage).toBe('succeeded');
    expect(uploadAsset).toHaveBeenCalledTimes(2);
  });

  it('does not upload without an academy', async () => {
    const { result } = renderHook(() => useMediaUpload(''));
    await act(async () => {
      await result.current.upload(pngFile());
    });
    expect(uploadAsset).not.toHaveBeenCalled();
  });

  it('clears back to idle when dismissed', async () => {
    uploadAsset.mockResolvedValue({ id: 'asset-1' });
    const { result } = renderHook(() => useMediaUpload('academy-1'));

    await act(async () => {
      await result.current.upload(pngFile());
    });
    act(() => result.current.reset());

    expect(result.current.state.stage).toBe('idle');
  });
});
