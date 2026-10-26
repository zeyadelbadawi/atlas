/**
 * G1 — "How did you first hear about us?" on the organization owner
 * sign-up: optional (the form submits without it), the last field of the
 * organization block, answers shuffled with "Somewhere else" last, free
 * text only for Other (≤ 100), `heardFrom`/`heardFromOther` sent only when
 * answered, never on a learner's academy sign-up. Arabic shows the
 * owner's wording «عرفت عنّا منين؟».
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

const attribution = vi.hoisted(() => ({
  value: { utmSource: 'facebook', landingTemplate: 'pricing' } as Record<
    string,
    string
  > | null,
}));

vi.mock('@config/feature-flags.config', async (importOriginal) => ({
  ...(await importOriginal<typeof FlagsModule>()),
  isFeatureEnabled: (flag: string) => flag === 'signupAttribution',
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

function renderForm(
  props: Parameters<typeof RegistrationForm>[0] = {},
  language: 'en' | 'ar' = 'en'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <MemoryRouter initialEntries={['/auth/register']}>
            <Routes>
              <Route
                path="/auth/register"
                element={<RegistrationForm {...props} />}
              />
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

const LABEL = /^How did you first hear about us\?/;

describe('owner sign-up — How did you first hear about us?', () => {
  it('is optional: the form submits without an answer and sends none', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText('Organization name');
    const select = screen.getByLabelText(LABEL) as HTMLSelectElement;
    expect(select.required).toBe(false);
    expect(select.value).toBe('');
    await fillAccount(user);
    await user.type(
      screen.getByLabelText('Organization name'),
      'Nile Learning'
    );
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0][0] as RegistrationRequest;
    expect(payload).not.toHaveProperty('heardFrom');
    expect(payload).not.toHaveProperty('heardFromOther');
  });

  it('is the last field of the organization block, with Other last', async () => {
    renderForm();
    await screen.findByLabelText('Organization name');
    const block = screen.getByTestId('organization-signup-fields');
    const fields = block.querySelectorAll('input, select');
    expect(fields[fields.length - 1]).toBe(screen.getByLabelText(LABEL));
    const options = Array.from(
      (screen.getByLabelText(LABEL) as HTMLSelectElement).options
    ).map((option) => option.value);
    expect(options[0]).toBe('');
    expect(options[options.length - 1]).toBe('other');
    expect(options).toHaveLength(12);
  });

  it('sends the chosen answer', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText('Organization name');
    await fillAccount(user);
    await user.type(
      screen.getByLabelText('Organization name'),
      'Nile Learning'
    );
    await user.selectOptions(screen.getByLabelText(LABEL), 'teacher_referral');
    expect(screen.queryByLabelText(/Where did you hear about us/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({
      heardFrom: 'teacher_referral',
    });
    expect(register.mock.calls[0][0]).not.toHaveProperty('heardFromOther');
  });

  it('shows a free-text box for Other and sends it, capped at 100', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText('Organization name');
    await fillAccount(user);
    await user.type(
      screen.getByLabelText('Organization name'),
      'Nile Learning'
    );
    await user.selectOptions(screen.getByLabelText(LABEL), 'other');
    const other = screen.getByLabelText(
      /^Where did you hear about us\?/
    ) as HTMLInputElement;
    expect(other.maxLength).toBe(100);
    await user.type(other, 'A poster at the centre');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({
      heardFrom: 'other',
      heardFromOther: 'A poster at the centre',
    });
  });

  it('never appears or is sent on a learner academy sign-up', async () => {
    organizationSignup = false;
    const user = userEvent.setup();
    renderForm({ academyId: 'academy-1' });
    await screen.findByLabelText('Full Name');
    expect(screen.queryByTestId('signup-heard-from')).toBeNull();
    await fillAccount(user);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).not.toHaveProperty('heardFrom');
  });

  it('asks in Arabic with the owner’s wording', async () => {
    renderForm({}, 'ar');
    await screen.findByTestId('signup-heard-from');
    expect(screen.getByTestId('signup-heard-from').textContent).toContain(
      'عرفت عنّا منين؟'
    );
    expect(screen.getByRole('option', { name: 'مكان آخر' })).toBeTruthy();
  });
});
