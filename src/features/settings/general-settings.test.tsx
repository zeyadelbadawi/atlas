/**
 * B1 (UX audit) — Settings › General.
 *
 * V18: the backend's limits (name ≤ 100, description ≤ 500) are checked
 * before sending with the number in the message, and a real 400 lands on
 * its field. V20: any other failure is ONE inline message with the real
 * reason. V23: the required field is marked. V27: unsaved text survives a
 * tab switch and leaving warns first. V16: the tabs wrap on a phone.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import type { PlatformConfiguration } from '@types';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
});

const SETTINGS = {
  platformName: 'Atlas',
  platformDescription: '',
  supportEmail: 'support@atlas.dev',
} as unknown as PlatformConfiguration;

const state = vi.hoisted(() => ({
  error: null as unknown,
  mutate: vi.fn(),
}));

vi.mock('./hooks', () => ({
  usePlatformSettings: () => ({
    data: SETTINGS,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdatePlatformSettings: () => ({
    mutate: state.mutate,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: state.error,
  }),
}));
// The other tabs are not under test here.
vi.mock('./components/NotificationSettings', () => ({
  NotificationSettings: () => <p>notifications tab</p>,
}));
vi.mock('./components/SecuritySettings', () => ({
  SecuritySettings: () => <p>security tab</p>,
}));
vi.mock('./components/CommunicationsSettings', () => ({
  CommunicationsSettings: () => <p>communications tab</p>,
}));

const { GeneralSettings } = await import('./components/GeneralSettings');
const { default: SettingsPage } = await import('./pages/SettingsPage');

function renderGeneral(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <GeneralSettings />
    </I18nextProvider>
  );
}

const save = () =>
  fireEvent.click(screen.getByRole('button', { name: /Save Settings/ }));

afterEach(() => {
  cleanup();
  state.error = null;
  state.mutate.mockReset();
});

describe('GeneralSettings — validation and failures', () => {
  it('marks the platform name as required', () => {
    renderGeneral();
    const input = document.getElementById('platform-name')!;
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(
      document.querySelector('label[for="platform-name"]')?.textContent
    ).toContain('*');
  });

  it('checks both length limits before sending, naming the numbers', async () => {
    renderGeneral();
    fireEvent.change(document.getElementById('platform-name')!, {
      target: { value: 'A'.repeat(120) },
    });
    fireEvent.change(document.getElementById('platform-description')!, {
      target: { value: 'D'.repeat(600) },
    });
    save();
    expect(
      await screen.findByText('Platform Name must be 100 characters or fewer')
    ).toBeTruthy();
    expect(
      screen.getByText('Platform Description must be 500 characters or fewer')
    ).toBeTruthy();
    expect(screen.getByText('600 / 500 characters')).toBeTruthy();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it('checks the limits in Arabic', async () => {
    renderGeneral('ar');
    fireEvent.change(document.getElementById('platform-name')!, {
      target: { value: 'أ'.repeat(120) },
    });
    fireEvent.click(screen.getByRole('button', { name: /حفظ الإعدادات/ }));
    const message = await waitFor(() => {
      const node = document.getElementById('platform-name-error');
      if (!node) throw new Error('no message yet');
      return node;
    });
    expect(message.textContent).toContain('اسم المنصة');
    expect(message.textContent).toContain('100');
  });

  it('explains a bad email itself, not with the browser bubble', async () => {
    renderGeneral();
    expect((document.querySelector('form') as HTMLFormElement).noValidate).toBe(
      true
    );
    fireEvent.change(document.getElementById('support-email')!, {
      target: { value: 'bad@' },
    });
    save();
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
  });

  it('puts the server’s maxLength violation on the description, once', async () => {
    state.error = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      retryable: false,
      violations: [
        {
          field: 'platformDescription',
          messageKey: 'validation:maxLength',
          values: { count: 500 },
        },
      ],
    });
    renderGeneral();
    const message = await waitFor(() => {
      const node = document.getElementById('platform-description-error');
      if (!node) throw new Error('no message yet');
      return node;
    });
    expect(message.textContent).toBe(
      'Platform Description must be 500 characters or fewer'
    );
    await waitFor(() =>
      expect(document.activeElement?.id).toBe('platform-description')
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.queryByText('Unexpected error')).toBeNull();
  });

  it('says once, with the real reason, that nothing was saved after a server error', () => {
    state.error = new ApiError({
      kind: 'server',
      messageKey: 'errors.internal',
      status: 500,
      retryable: true,
    });
    renderGeneral();
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("Your settings weren't saved");
    expect(alert.textContent).toContain('Something failed on our side');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Unexpected error')).toBeNull();
  });
});

describe('SettingsPage — tabs and drafts', () => {
  function renderPage() {
    return render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </I18nextProvider>
    );
  }

  it('lets the tabs wrap instead of widening the page (V16)', () => {
    renderPage();
    const list = screen.getByRole('tablist');
    expect(list.className).toContain('flex-wrap');
    expect(list.className).toContain('max-w-full');
  });

  it('keeps the unsaved description across a tab switch and warns before leaving (V27)', async () => {
    const user = userEvent.setup();
    renderPage();
    const description = document.getElementById(
      'platform-description'
    ) as HTMLTextAreaElement;
    await user.type(description, 'unsaved text');

    await user.click(screen.getByRole('tab', { name: 'Security Settings' }));
    expect(screen.getByText('security tab')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'General Settings' }));
    expect(
      (document.getElementById('platform-description') as HTMLTextAreaElement)
        .value
    ).toBe('unsaved text');

    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);
  });
});
