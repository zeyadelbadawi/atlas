/**
 * Account deletion (authentication audit, Decision 1) — the dialog.
 *
 *   - typing the address only unlocks "Email me a confirmation code";
 *     nothing is deleted by that step;
 *   - step two takes the emailed code, shows where it went (masked), and
 *     only then calls the deletion with the challenge id and the code;
 *   - a wrong or expired code is explained in place and can be retried;
 *     resend waits for the cooldown;
 *   - Arabic renders the same flow right-to-left with the digits LTR;
 *   - before anything is asked, the card says forensic watermark records
 *     outlive the account (730 days after last shown), as the Privacy
 *     Policy does.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { currentUserService } from '@services/identity';
import { createApiError } from '@api';
import type { CurrentUser } from '@types';
import { DeleteAccountCard } from './components/DeleteAccountCard';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

const USER = {
  id: 'u-1',
  name: 'Sara',
  email: 'sara@example.com',
  roles: [],
  permissions: [],
  organizations: [],
  organizationMemberships: [],
} as unknown as CurrentUser;

const signOut = vi.fn(async () => undefined);
const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

function renderCard(language: 'en' | 'ar' = 'en') {
  const identity = {
    session: { status: 'authenticated', user: USER },
    user: USER,
    signOut,
  } as unknown as IdentityContextValue;
  const wrap = (children: ReactNode) => (
    <I18nextProvider i18n={createI18nInstance(language)}>
      <ToastContext.Provider value={toastValue}>
        <IdentityContext.Provider value={identity}>
          <MemoryRouter>
            <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
          </MemoryRouter>
        </IdentityContext.Provider>
      </ToastContext.Provider>
    </I18nextProvider>
  );
  return render(wrap(<DeleteAccountCard user={USER} />));
}

const CHALLENGE = {
  challengeId: '11111111-1111-4111-8111-111111111111',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  maskedEmail: 'sa***@example.com',
};

function typeCode(value: string) {
  const input = screen
    .getByTestId('delete-account-code-step')
    .querySelector('input') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  signOut.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('delete account dialog', () => {
  it('says forensic watermark records are kept after deletion (EN + AR)', () => {
    renderCard('en');
    expect(
      screen.getByText(
        /Forensic video watermark records .* are kept until 730 days after each code was last shown/
      )
    ).toBeTruthy();
    cleanup();
    renderCard('ar');
    expect(
      screen.getByText(
        /يُحتفظ بسجلات العلامة المائية التتبّعية للفيديو .* 730 يومًا/
      )
    ).toBeTruthy();
  });

  it('asks for a code first and deletes only with the emailed code', async () => {
    const request = vi
      .spyOn(currentUserService, 'requestAccountDeletion')
      .mockResolvedValue(CHALLENGE);
    const remove = vi
      .spyOn(currentUserService, 'deleteAccount')
      .mockResolvedValue({ deleted: true, academiesArchived: 0 });
    renderCard();
    fireEvent.click(screen.getByTestId('open-delete-account'));
    const send = screen.getByTestId('request-delete-code');
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('delete-account-confirmation'), {
      target: { value: 'SARA@example.com ' },
    });
    fireEvent.click(screen.getByTestId('request-delete-code'));
    expect(await screen.findByTestId('delete-account-code-step')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByText(/sa\*\*\*@example\.com/)).toBeTruthy();

    const confirm = screen.getByTestId(
      'confirm-delete-account'
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    typeCode('123456');
    fireEvent.click(screen.getByTestId('confirm-delete-account'));
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith({
        challengeId: CHALLENGE.challengeId,
        code: '123456',
        reason: undefined,
        feedback: undefined,
      })
    );
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it('explains a wrong code in place and lets the person retry; resend waits for the cooldown', async () => {
    vi.spyOn(currentUserService, 'requestAccountDeletion').mockResolvedValue(
      CHALLENGE
    );
    const remove = vi
      .spyOn(currentUserService, 'deleteAccount')
      .mockRejectedValueOnce(
        createApiError('unauthorized', {
          status: 401,
          messageKey: 'errors.account.deletionCodeInvalid',
        })
      )
      .mockResolvedValueOnce({ deleted: true, academiesArchived: 0 });
    renderCard();
    fireEvent.click(screen.getByTestId('open-delete-account'));
    fireEvent.change(screen.getByTestId('delete-account-confirmation'), {
      target: { value: 'sara@example.com' },
    });
    fireEvent.click(screen.getByTestId('request-delete-code'));
    await screen.findByTestId('delete-account-code-step');
    expect(
      (screen.getByTestId('delete-account-resend') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    typeCode('000000');
    fireEvent.click(screen.getByTestId('confirm-delete-account'));
    expect(
      (await screen.findByTestId('delete-account-error')).textContent
    ).toBe("That code isn't right. Check the email and try again.");
    expect(signOut).not.toHaveBeenCalled();
    typeCode('123456');
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-delete-account'));
    });
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2));
  });

  it('tells an unverified account why no code can be sent (Arabic, RTL)', async () => {
    vi.spyOn(currentUserService, 'requestAccountDeletion').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.account.deletionEmailUnverified',
      })
    );
    renderCard('ar');
    fireEvent.click(screen.getByTestId('open-delete-account'));
    fireEvent.change(screen.getByTestId('delete-account-confirmation'), {
      target: { value: 'sara@example.com' },
    });
    fireEvent.click(screen.getByTestId('request-delete-code'));
    expect(
      (await screen.findByTestId('delete-account-error')).textContent
    ).toBe('أكّد عنوان بريدك الإلكتروني أولًا — يُرسل رمز التأكيد إليه.');
    expect(screen.queryByTestId('delete-account-code-step')).toBeNull();
  });
});
