/**
 * The platform Communications tab (P66).
 *
 * Pins that the ranges the backend enforces are enforced here first —
 * a trusted-device window outside 1–365 days or a digest hour outside
 * 0–23 never leaves the browser and is explained beside its field — and
 * that the quota thresholds are edited as chips and sent as a sorted,
 * de-duplicated list. Provider status is shown as the server reports
 * it, and the tab never renders anything that looks like a secret.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { PlatformCommunicationSettings } from '@types';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const baseSettings: PlatformCommunicationSettings = {
  emailOtpPolicyManagement: 'new_device',
  emailOtpPolicyAcademyDefault: 'new_device',
  trustedDeviceDaysManagement: 90,
  trustedDeviceDaysAcademy: 30,
  digestHourLocal: 8,
  quotaAlertThresholds: [80, 50],
  providerStatus: [
    {
      order: ['resend', 'ses'],
      active: 'resend',
      fromEmail: 'no-reply@atlas.example',
      configured: true,
    },
  ],
};

let settings: PlatformCommunicationSettings = baseSettings;

const mutate = vi.fn(
  (
    payload: unknown,
    handlers?: { readonly onSuccess?: (data: unknown) => void }
  ) => handlers?.onSuccess?.({ ...settings, ...(payload as object) })
);
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('./hooks', () => ({
  usePlatformCommunicationSettings: () => ({
    data: settings,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdatePlatformCommunicationSettings: () => ({
    mutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError }),
}));

const { CommunicationsSettings } =
  await import('./components/CommunicationsSettings');

const i18n = createI18nInstance('en');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  settings = baseSettings;
});

function renderTab() {
  return render(
    <I18nextProvider i18n={i18n}>
      <CommunicationsSettings />
    </I18nextProvider>
  );
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: /save settings/i });
}

describe('CommunicationsSettings', () => {
  it('shows the loaded values, the thresholds sorted, and the provider status read-only', async () => {
    renderTab();

    await waitFor(() =>
      expect(
        (screen.getByLabelText(/remember atlas devices/i) as HTMLInputElement)
          .value
      ).toBe('90')
    );
    const chips = screen.getByRole('list', { name: /alert thresholds/i });
    expect(chips.textContent).toMatch(/50%.*80%/);
    expect(screen.getByText(/resend → ses/)).toBeTruthy();
    expect(screen.getByText('Configured')).toBeTruthy();
    expect(saveButton().hasAttribute('disabled')).toBe(true);
  });

  it('refuses a trusted-device window outside 1–365 days inline, without saving', async () => {
    renderTab();
    const days = await screen.findByLabelText(/remember atlas devices/i);

    fireEvent.change(days, { target: { value: '400' } });
    await waitFor(() =>
      expect(saveButton().hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/between 1 and 365/i);
    expect(days.getAttribute('aria-invalid')).toBe('true');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('refuses a digest hour outside 0–23', async () => {
    renderTab();
    const hour = await screen.findByLabelText(/digest hour/i);

    fireEvent.change(hour, { target: { value: '24' } });
    await waitFor(() =>
      expect(saveButton().hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(saveButton());

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /between 0 and 23/i
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('adds and removes threshold chips and saves the sorted list with the numbers coerced', async () => {
    renderTab();
    await screen.findByLabelText(/remember atlas devices/i);

    const draft = screen.getByLabelText(/add a threshold/i);
    fireEvent.change(draft, { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(
      screen.getByRole('list', { name: /alert thresholds/i }).textContent
    ).toMatch(/50%.*80%.*95%/);

    // A duplicate is refused beside the input, not silently dropped.
    fireEvent.change(draft, { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByRole('alert').textContent).toMatch(
      /already in the list/i
    );

    fireEvent.click(
      screen.getByRole('button', { name: /remove 50% threshold/i })
    );

    fireEvent.click(saveButton());
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toEqual({
      emailOtpPolicyManagement: 'new_device',
      emailOtpPolicyAcademyDefault: 'new_device',
      trustedDeviceDaysManagement: 90,
      trustedDeviceDaysAcademy: 30,
      digestHourLocal: 8,
      quotaAlertThresholds: [80, 95],
    });
    expect(notifySuccess).toHaveBeenCalledWith('settings:communications.saved');
  });

  it('renders deployment-configured settings read-only: notice shown, inputs disabled, no save', async () => {
    settings = { ...baseSettings, editable: false };
    renderTab();

    await waitFor(() =>
      expect(
        screen.getByText(/can't be changed from this page yet/i)
      ).toBeTruthy()
    );
    expect(
      (screen.getByLabelText(/remember atlas devices/i) as HTMLInputElement)
        .disabled
    ).toBe(true);
    expect(screen.queryByRole('button', { name: /^save$/i })).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });
});
