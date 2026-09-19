/**
 * The registration policy is the academy's front door: `open` lets anyone
 * sign up on the academy website, `invite` admits only a valid invite
 * link, `approval` holds every sign-up as pending.
 *
 * Changing it is a SECURITY policy and is restricted to the Client Owner
 * (P64 Phase 1, decision D8 — `assertCanManageSecurityPolicy`). A Manager
 * may read it and gets `403 errors.academy.insufficientRole` on write.
 *
 * These tests pin both halves of how the card treats that rule:
 *
 *  - an owner can change the policy and the chosen value is what is sent;
 *  - a non-owner is shown the restriction instead of a Save that can only
 *    fail, AND a 403 arriving anyway is turned into that same explanation
 *    rather than a generic failure.
 *
 * The second half matters because the first is only a hint. The session's
 * organization role is what the client happens to believe; the server
 * decides. A card that merely hid its Save would have nothing to say when
 * the server disagreed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { ApiError } from '@api';
import type {
  AcademyRegistrationPolicy,
  AcademyRegistrationPolicySettings,
} from '@types';

/** What the server currently holds. */
let policy: AcademyRegistrationPolicy = 'open';

/** When set, `mutate` fails with this instead of succeeding. */
let failure: Pick<ApiError, 'kind' | 'messageKey'> | null = null;

const mutate = vi.fn(
  (
    payload: { readonly registrationPolicy: AcademyRegistrationPolicy },
    handlers?: {
      readonly onSuccess?: (data: unknown) => void;
      readonly onError?: (error: unknown) => void;
    }
  ) => {
    if (failure) handlers?.onError?.(failure);
    else handlers?.onSuccess?.({ academyId: 'academy-1', ...payload });
  }
);

const notifySuccess = vi.fn();
const notifyError = vi.fn();

/*
  `data` must keep a stable identity across renders, exactly as react-query
  gives it: the card syncs its selection from `data` in an effect keyed on
  that identity, so a fresh object per render would silently reset the
  user's choice before they could save it.
*/
let settings: AcademyRegistrationPolicySettings = {
  academyId: 'academy-1',
  registrationPolicy: policy,
};

vi.mock('./hooks', () => ({
  useAcademyRegistrationPolicy: () => ({
    data: settings,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateAcademyRegistrationPolicy: () => ({ mutate, isPending: false }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError }),
}));

const { RegistrationPolicyCard } =
  await import('./components/RegistrationPolicyCard');

/*
  One i18n instance for the file: `createI18nInstance` builds every
  namespace in the product, which is far more expensive than the render
  under test.
*/
const i18n = createI18nInstance('en');

/** See the roster suite: user-event's defaults are too slow for this tree in jsdom. */
const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

afterEach(() => {
  cleanup();
  policy = 'open';
  failure = null;
  vi.clearAllMocks();
});

function renderCard(canEdit: boolean) {
  settings = { academyId: 'academy-1', registrationPolicy: policy };
  return render(
    <I18nextProvider i18n={i18n}>
      <RegistrationPolicyCard academyId="academy-1" canEdit={canEdit} />
    </I18nextProvider>
  );
}

describe('RegistrationPolicyCard', () => {
  it('shows the academy’s current policy as the selected option', () => {
    policy = 'approval';
    renderCard(true);

    expect(
      screen
        .getByRole('radio', { name: /approval required/i })
        .getAttribute('aria-checked')
    ).toBe('true');
  });

  it('lets the owner change the policy and sends the option they chose', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderCard(true);

    // Save stays inert until something actually changed.
    expect(
      screen
        .getByRole('button', { name: /save policy/i })
        .hasAttribute('disabled')
    ).toBe(true);

    await user.click(screen.getByRole('radio', { name: /invite only/i }));
    await user.click(screen.getByRole('button', { name: /save policy/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ registrationPolicy: 'invite' });
    expect(notifySuccess).toHaveBeenCalledWith(
      'academy:registration.policy.saved'
    );
  });

  it('tells a non-owner the restriction instead of offering a Save that would 403', () => {
    renderCard(false);

    expect(
      screen.getByText(
        /only the account owner can change the registration policy/i
      )
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /save policy/i })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('radio', { name: /invite only/i })
        .hasAttribute('disabled')
    ).toBe(true);
  });

  it('turns the server’s insufficient-role refusal into that same explanation', async () => {
    failure = {
      kind: 'forbidden',
      messageKey: 'errors.academy.insufficientRole',
    } as Pick<ApiError, 'kind' | 'messageKey'>;
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderCard(true);

    await user.click(screen.getByRole('radio', { name: /invite only/i }));
    await user.click(screen.getByRole('button', { name: /save policy/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/role on this academy does not allow/i);
    expect(notifyError).toHaveBeenCalledWith(
      'academy:students.errors.insufficientRole'
    );
    // The generic "could not be saved" copy would have been the wrong
    // answer: the save did not fail, it was refused.
    await waitFor(() =>
      expect(
        screen.queryByText(/registration policy could not be saved/i)
      ).toBeNull()
    );
  });
});
