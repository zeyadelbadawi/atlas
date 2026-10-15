/**
 * B0-IAM-08 / B0-ANL-04 — the organization owner sign-up with the
 * `ownerWhatsappConsent` and `signupAttribution` flags ON (both ship OFF;
 * `one-page-signup.test.tsx` pins the default payload exactly).
 *
 *   - the WhatsApp box appears on the ORGANIZATION OWNER sign-up only,
 *     unticked; nothing is sent unless it is ticked;
 *   - a learner's academy sign-up never shows it and never sends it, nor
 *     the landing attribution;
 *   - the in-memory landing attribution travels with the owner sign-up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as FlagsModule from '@config/feature-flags.config';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { authenticationService } from '@services/identity';
import type {
  RegistrationRequest,
  RegistrationResult,
  SignupOptionsResponse,
} from '@types';
import { signupOptionsService } from './services/SignupOptionsService';
import { RegistrationForm } from './components/RegistrationForm';
import { SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION } from './utils/owner-whatsapp-consent';

const attribution = vi.hoisted(() => ({
  value: { utmSource: 'facebook', landingTemplate: 'pricing' } as Record<
    string,
    string
  > | null,
}));

vi.mock('@config/feature-flags.config', async (importOriginal) => ({
  ...(await importOriginal<typeof FlagsModule>()),
  isFeatureEnabled: (flag: string) =>
    flag === 'ownerWhatsappConsent' || flag === 'signupAttribution',
}));
vi.mock('@utils/landing-attribution.utils', () => ({
  getLandingAttribution: () => attribution.value,
}));

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

let organizationSignup = true;
let register: ReturnType<typeof vi.fn>;

beforeEach(() => {
  organizationSignup = true;
  register = vi.fn(async (_request: RegistrationRequest) => ({
    account: 'new' as const,
  }));
  vi.spyOn(signupOptionsService, 'getSignupOptions').mockImplementation(
    async () =>
      ({
        organizationSignup,
        trialsEnabled: false,
        trialPlans: [],
      }) as SignupOptionsResponse
  );
  vi.spyOn(authenticationService, 'register').mockImplementation(
    (request) => register(request) as Promise<RegistrationResult>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(props: Parameters<typeof RegistrationForm>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <MemoryRouter initialEntries={['/auth/register']}>
            <Routes>
              <Route path="/auth/register" element={<RegistrationForm {...props} />} />
              <Route path="/auth/sign-in" element={<p>signed-in</p>} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

async function fillAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full Name'), 'Owner Example');
  await user.type(screen.getByLabelText('Email'), 'owner@example.test');
  await user.type(screen.getByLabelText('Mobile number'), '+20 100 123 4567');
  await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
  await user.type(screen.getByLabelText('Confirm Password'), 'correct-horse-1');
  await user.click(
    screen.getByRole('checkbox', { name: /I agree to the Terms/ })
  );
}

const WHATSAPP_LABEL = 'Contact me on WhatsApp about my account and setup.';

describe('owner sign-up — WhatsApp opt-in on', () => {
  it('mirrors the server wording version (a DRAFT pending counsel)', () => {
    expect(SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION).toBe(
      'signup-whatsapp-consent-2026-10-draft1'
    );
  });

  it('shows an unticked box and sends no consent unless it is ticked', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText('Organization name');
    const box = screen.getByRole('checkbox', { name: WHATSAPP_LABEL });
    expect(box.getAttribute('aria-checked')).toBe('false');
    await fillAccount(user);
    await user.type(screen.getByLabelText('Organization name'), 'Nile Learning');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0][0] as RegistrationRequest;
    expect(payload).not.toHaveProperty('whatsappConsent');
    expect(payload.attribution).toEqual({
      utmSource: 'facebook',
      landingTemplate: 'pricing',
    });
  });

  it('sends whatsappConsent: true only when ticked', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText('Organization name');
    await fillAccount(user);
    await user.type(screen.getByLabelText('Organization name'), 'Nile Learning');
    await user.click(screen.getByRole('checkbox', { name: WHATSAPP_LABEL }));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({
      organizationName: 'Nile Learning',
      whatsappConsent: true,
    });
  });

  it('never offers or sends it on a learner academy sign-up', async () => {
    organizationSignup = false;
    const user = userEvent.setup();
    renderForm({ academyId: 'academy-1' });
    await screen.findByLabelText('Full Name');
    expect(screen.queryByTestId('owner-whatsapp-consent')).toBeNull();
    await fillAccount(user);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0][0] as RegistrationRequest;
    expect(payload.academyId).toBe('academy-1');
    expect(payload).not.toHaveProperty('whatsappConsent');
    expect(payload).not.toHaveProperty('attribution');
  });

  it('is absent on the account-only management form', async () => {
    organizationSignup = false;
    renderForm();
    await screen.findByLabelText('Full Name');
    await waitFor(() =>
      expect(signupOptionsService.getSignupOptions).toHaveBeenCalled()
    );
    expect(screen.queryByTestId('owner-whatsapp-consent')).toBeNull();
  });
});
