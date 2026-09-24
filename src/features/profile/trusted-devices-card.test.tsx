/**
 * Remembered devices (P66).
 *
 * A remembered browser is NOT a session — it is merely allowed to skip
 * the emailed sign-in code. These tests pin that the card says so in its
 * verbs and consequences: the row is labelled by device and surface,
 * "this device" is marked, forgetting one goes through a confirmation
 * and sends exactly that device's id, and "forget other devices" is a
 * single call for everything but the current browser.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { TrustedDevice } from '@types';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

let devices: readonly TrustedDevice[] = [];
let listState: { isLoading: boolean; isError: boolean } = {
  isLoading: false,
  isError: false,
};

const revokeOne = vi.fn(
  (
    _variables: { deviceId: string },
    handlers?: { onSuccess?: () => void; onError?: () => void }
  ) => handlers?.onSuccess?.()
);
const revokeOthers = vi.fn(
  (
    _variables: undefined,
    handlers?: { onSuccess?: () => void; onError?: () => void }
  ) => handlers?.onSuccess?.()
);
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('./hooks', () => ({
  useTrustedDevices: () => ({
    data: devices,
    isLoading: listState.isLoading,
    isError: listState.isError,
    error: listState.isError ? { kind: 'server' } : null,
    refetch: vi.fn(),
  }),
  useRevokeTrustedDevice: () => ({ mutate: revokeOne, isPending: false }),
  useRevokeOtherTrustedDevices: () => ({
    mutate: revokeOthers,
    isPending: false,
  }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError }),
}));

const { TrustedDevicesCard } = await import('./components/TrustedDevicesCard');

const i18n = createI18nInstance('en');

const THIS_LAPTOP: TrustedDevice = {
  id: 'dev-1',
  label: 'Chrome on macOS',
  surface: 'management',
  lastUsedAt: '2026-09-23T10:00:00.000Z',
  expiresAt: '2026-12-22T10:00:00.000Z',
  current: true,
};
const PHONE: TrustedDevice = {
  id: 'dev-2',
  label: 'Safari on iPhone',
  surface: 'academy',
  lastUsedAt: '2026-09-01T10:00:00.000Z',
  expiresAt: '2026-11-30T10:00:00.000Z',
  current: false,
};

afterEach(() => {
  cleanup();
  devices = [];
  listState = { isLoading: false, isError: false };
  vi.clearAllMocks();
});

function renderCard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TrustedDevicesCard />
    </I18nextProvider>
  );
}

describe('TrustedDevicesCard', () => {
  it('lists each remembered browser with its surface and marks this device', () => {
    devices = [THIS_LAPTOP, PHONE];
    renderCard();

    expect(screen.getByText('Chrome on macOS')).toBeTruthy();
    expect(screen.getByText('Safari on iPhone')).toBeTruthy();
    expect(screen.getByText('Atlas')).toBeTruthy();
    expect(screen.getByText('Academy website')).toBeTruthy();
    expect(screen.getAllByText(/this device/i)).toHaveLength(1);
  });

  it('forgets one device only after confirmation, sending that device’s id', () => {
    devices = [THIS_LAPTOP, PHONE];
    renderCard();

    fireEvent.click(
      screen.getByRole('button', { name: /forget safari on iphone/i })
    );
    expect(revokeOne).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toMatch(/forget this device\?/i);
    fireEvent.click(within(dialog).getByRole('button', { name: /^forget$/i }));

    expect(revokeOne).toHaveBeenCalledTimes(1);
    expect(revokeOne.mock.calls[0][0]).toEqual({ deviceId: 'dev-2' });
    expect(notifySuccess).toHaveBeenCalledWith(
      'profile:sections.security.trustedDeviceForgotten'
    );
  });

  it('offers "forget other devices" only when there is another device, as one call', () => {
    devices = [THIS_LAPTOP];
    const { unmount } = renderCard();
    expect(
      screen.queryByRole('button', { name: /forget other devices/i })
    ).toBeNull();
    unmount();

    devices = [THIS_LAPTOP, PHONE];
    renderCard();
    fireEvent.click(
      screen.getByRole('button', { name: /forget other devices/i })
    );
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toMatch(/every other device/i);
    fireEvent.click(
      within(dialog).getByRole('button', { name: /forget other devices/i })
    );

    expect(revokeOthers).toHaveBeenCalledTimes(1);
    expect(revokeOne).not.toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith(
      'profile:sections.security.otherTrustedDevicesForgotten'
    );
  });

  it('renders the empty and error states honestly', () => {
    renderCard();
    expect(screen.getByText(/no remembered devices/i)).toBeTruthy();
    cleanup();

    listState = { isLoading: false, isError: true };
    renderCard();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });
});
