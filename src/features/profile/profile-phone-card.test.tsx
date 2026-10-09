/**
 * Phone number on the profile: honest "Not verified — coming soon" status
 * (no fake verification), add / change / remove, server violations on the
 * field, the rate limit, Arabic rendering with the number left-to-right, and
 * the dismissible prompt for accounts without a number.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import type { UserPhone } from '@types';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

const NOT_OFFERED = { available: false, reason: 'disabled' } as const;
const SAVED: UserPhone = {
  phone: {
    e164: '+201001234567',
    country: 'EG',
    callingCode: '20',
    nationalNumber: '1001234567',
    verified: false,
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  verification: NOT_OFFERED,
};
const NONE: UserPhone = { phone: null, verification: NOT_OFFERED };

let phoneData: UserPhone | undefined = NONE;
let updateError: ApiError | null = null;
let removeError: ApiError | null = null;
const updateMutate = vi.fn(
  (_input: unknown, handlers?: { onSuccess?: () => void }) =>
    handlers?.onSuccess?.()
);
const removeMutate = vi.fn(
  (_input: unknown, handlers?: { onSuccess?: () => void }) =>
    handlers?.onSuccess?.()
);
const notifySuccess = vi.fn();

vi.mock('./hooks', () => ({
  useUserPhone: () => ({
    data: phoneData,
    isLoading: false,
    isSuccess: phoneData !== undefined,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdatePhone: () => ({
    mutate: updateMutate,
    isPending: false,
    error: updateError,
    reset: vi.fn(),
  }),
  useRemovePhone: () => ({
    mutate: removeMutate,
    isPending: false,
    error: removeError,
  }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError: vi.fn() }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCurrentUser: () => ({ id: 'user-1' }),
}));

const { ProfilePhoneCard } = await import('./components/ProfilePhoneCard');
const { PhoneNumberPrompt, PHONE_PROMPT_SNOOZE_MS } =
  await import('./components/PhoneNumberPrompt');

afterEach(() => {
  cleanup();
  phoneData = NONE;
  updateError = null;
  removeError = null;
  vi.clearAllMocks();
  window.localStorage.clear();
});

function renderCard(language: 'en' | 'ar' = 'en', path = '/profile') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={[path]}>
        <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <ProfilePhoneCard />
        </div>
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('ProfilePhoneCard', () => {
  it('adds a number: the editor opens on the default country and saves what was typed', async () => {
    const user = userEvent.setup();
    renderCard();
    expect(
      screen.getByText('You haven’t added a phone number yet.')
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add phone number' }));
    const input = screen.getByLabelText('Mobile number');
    await user.type(input, '+20 100 123 4567');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate.mock.calls[0][0]).toEqual({
      phoneNumber: '010 01234567',
      phoneCountry: 'EG',
    });
    expect(notifySuccess).toHaveBeenCalledWith('profile:phone.saved');
  });

  it('shows a saved number as unverified with "coming soon" — and offers no verify action', () => {
    phoneData = SAVED;
    renderCard();
    const number = screen.getByTestId('phone-number-display');
    expect(number.textContent).toBe('+20 10 01234567');
    expect(number.getAttribute('dir')).toBe('ltr');
    expect(screen.getByTestId('phone-unverified').textContent).toContain(
      'Not verified'
    );
    expect(
      screen.getByText(/Verification by SMS or WhatsApp is coming soon/)
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /verify/i })).toBeNull();
  });

  it('changes a number starting from what was saved, warning when it was verified', async () => {
    const user = userEvent.setup();
    phoneData = {
      ...SAVED,
      phone: {
        ...SAVED.phone!,
        verified: true,
        verifiedAt: '2026-10-02T00:00:00.000Z',
      },
    };
    renderCard();
    expect(screen.getByText('Verified')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Change number' }));
    const input = screen.getByLabelText('Mobile number') as HTMLInputElement;
    expect(input.value).toBe('1001234567');
    expect(screen.getByTestId('phone-country-trigger').textContent).toContain(
      '+20'
    );
    expect(
      screen.getByText('Your new number will need to be verified again.')
    ).toBeTruthy();
  });

  it('removes the number only after confirmation', async () => {
    const user = userEvent.setup();
    phoneData = SAVED;
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Remove your phone number?')).toBeTruthy();
    expect(removeMutate).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove number' })
    );
    expect(removeMutate).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('profile:phone.removed');
  });

  it('shows the server’s field violation on the number', async () => {
    const user = userEvent.setup();
    const view = renderCard();
    await user.click(screen.getByRole('button', { name: 'Add phone number' }));
    // The PUT comes back 400 with a per-field violation.
    updateError = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      retryable: false,
      violations: [
        { field: 'phoneNumber', messageKey: 'validation:phoneNotMobile' },
      ],
    });
    view.rerender(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter initialEntries={['/profile']}>
          <div dir="ltr">
            <ProfilePhoneCard />
          </div>
        </MemoryRouter>
      </I18nextProvider>
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Enter a mobile number'
    );
  });

  it('explains the rate limit', async () => {
    const user = userEvent.setup();
    updateError = new ApiError({
      kind: 'rateLimited',
      messageKey: 'errors.auth.rateLimited',
      retryable: true,
    });
    renderCard();
    await user.click(screen.getByRole('button', { name: 'Add phone number' }));
    expect(
      screen.getByText(/changed your number several times recently/)
    ).toBeTruthy();
  });

  it('opens the editor from the prompt link (?phone=add)', () => {
    renderCard('en', '/profile?phone=add');
    expect(screen.getByLabelText('Mobile number')).toBeTruthy();
  });

  it('renders in Arabic with the number left-to-right inside right-to-left text', () => {
    phoneData = SAVED;
    renderCard('ar');
    expect(screen.getByText('رقم الهاتف')).toBeTruthy();
    expect(screen.getByText('غير موثّق')).toBeTruthy();
    const number = screen.getByTestId('phone-number-display');
    expect(number.getAttribute('dir')).toBe('ltr');
    expect(number.hasAttribute('data-ltr-content')).toBe(true);
    expect(screen.getByRole('button', { name: 'تغيير الرقم' })).toBeTruthy();
  });
});

describe('PhoneNumberPrompt', () => {
  function renderPrompt() {
    return render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <PhoneNumberPrompt profileHref="/dashboard/profile" />
        </MemoryRouter>
      </I18nextProvider>
    );
  }

  it('asks an account without a number, linking to the editor', () => {
    renderPrompt();
    const prompt = screen.getByTestId('phone-number-prompt');
    expect(within(prompt).getByText('Add your phone number')).toBeTruthy();
    expect(
      within(prompt)
        .getByRole('link', { name: 'Add phone number' })
        .getAttribute('href')
    ).toBe('/dashboard/profile?phone=add');
  });

  it('stays out of the way once a number exists', () => {
    phoneData = SAVED;
    renderPrompt();
    expect(screen.queryByTestId('phone-number-prompt')).toBeNull();
  });

  it('"Not now" hides it for 30 days in this browser', async () => {
    const user = userEvent.setup();
    renderPrompt();
    await user.click(screen.getAllByRole('button', { name: 'Not now' })[0]);
    expect(screen.queryByTestId('phone-number-prompt')).toBeNull();
    cleanup();
    renderPrompt();
    expect(screen.queryByTestId('phone-number-prompt')).toBeNull();

    // After the snooze it may ask again.
    cleanup();
    window.localStorage.setItem(
      'atlas:phone-prompt-dismissed:user-1',
      String(Date.now() - PHONE_PROMPT_SNOOZE_MS - 1)
    );
    renderPrompt();
    expect(screen.getByTestId('phone-number-prompt')).toBeTruthy();
  });

  it('still works when storage throws', async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderPrompt();
    await user.click(screen.getAllByRole('button', { name: 'Not now' })[0]);
    expect(screen.queryByTestId('phone-number-prompt')).toBeNull();
    spy.mockRestore();
    vi.restoreAllMocks();
  });
});
