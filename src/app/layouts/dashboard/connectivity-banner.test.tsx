/**
 * The connectivity banner: silent when all is well; one polite status line
 * when offline, reconnecting, syncing, or when changes could not be synced
 * (with Retry and Discard so the warning can always be cleared).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

let session: { offline?: boolean } = {};
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ session }),
}));

import { ConnectivityBanner } from './ConnectivityBanner';
import {
  MemoryOfflineStore,
  enqueueOutbox,
  registerOutboxHandler,
  reportNetworkFailure,
  reportServerReached,
  setOfflineStoreForTesting,
  startOutbox,
} from '@services/offline';
import { resetOutboxForTesting } from '@services/offline/mutation-queue';
import { resetConnectivityForTesting } from '@services/offline/connectivity';
import { ApiError, createApiError } from '@api';

function renderBanner(locale: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <ConnectivityBanner />
    </I18nextProvider>
  );
}

beforeEach(() => {
  setOfflineStoreForTesting(new MemoryOfflineStore());
  resetOutboxForTesting();
  resetConnectivityForTesting();
  session = {};
});

afterEach(() => {
  cleanup();
  setOfflineStoreForTesting(null);
  vi.unstubAllGlobals();
});

describe('ConnectivityBanner', () => {
  it('renders nothing while online with nothing to sync', () => {
    renderBanner();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says offline and read-only when the network drops', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    renderBanner();
    act(() => reportNetworkFailure());
    const status = await screen.findByRole('status');
    expect(status.dataset.connectivity).toBe('offline');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toMatch(/offline/i);
  });

  it('a read-only offline session shows the offline line even before any request fails', async () => {
    session = { offline: true };
    renderBanner();
    expect((await screen.findByRole('status')).dataset.connectivity).toBe(
      'offline'
    );
  });

  it('distinguishes "reconnecting" from offline', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
    renderBanner();
    act(() => reportNetworkFailure());
    expect((await screen.findByRole('status')).dataset.connectivity).toBe(
      'reconnecting'
    );
    act(() => reportServerReached());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a failed change offers Retry and Discard, and Discard clears the warning', async () => {
    registerOutboxHandler('t.forbidden', {
      run: vi
        .fn()
        .mockRejectedValue(
          new ApiError(createApiError('forbidden', { status: 403 }))
        ),
    });
    startOutbox(() => 'u1');
    renderBanner();
    await act(async () => {
      await enqueueOutbox('u1', 't.forbidden', {});
    });
    const status = await screen.findByRole('status');
    await vi.waitFor(() =>
      expect(status.dataset.connectivity).toBe('attention')
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /discard/i }));
    await vi.waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('says "synced" after queued changes reach the server', async () => {
    registerOutboxHandler('t.ok', {
      run: vi.fn().mockResolvedValue(undefined),
    });
    startOutbox(() => 'u1');
    renderBanner();
    await act(async () => {
      await enqueueOutbox('u1', 't.ok', {});
    });
    await vi.waitFor(() =>
      expect(screen.getByRole('status').dataset.connectivity).toBe('synced')
    );
  });

  it('is translated in Arabic', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    renderBanner('ar');
    act(() => reportNetworkFailure());
    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/[؀-ۿ]/);
    expect(status.textContent).not.toMatch(/connectivity\./);
  });
});
