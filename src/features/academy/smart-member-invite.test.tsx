/**
 * Smart member invitation — the Add Manager / Add Student dialogs.
 *
 * As an email is typed, a debounced lookup asks whether it belongs to an
 * existing Atlas account. What these tests pin:
 *
 *   - one lookup per typing burst (debounced), none for an invalid address;
 *   - an existing account's REAL name is shown read-only with an
 *     explanation, and the add never sends a name for it;
 *   - a new email keeps an editable name, which is required to invite;
 *   - "already a member" / "unavailable" block the submit;
 *   - a failed or rate-limited lookup degrades to the plain form;
 *   - the success message says what actually happened (invited /
 *     reinvited / added);
 *   - the same in Arabic, right-to-left.
 *
 * HTTP is mocked at the service layer (`academyService`), so the real
 * hooks, query cache, debounce, form and i18n run end to end.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type * as SharedHooks from '@/shared/hooks';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { ApiError } from '@api';
import type {
  AcademyMemberAddResult,
  AcademyMemberLookupResult,
  AcademyStudentAddResult,
} from '@types';
import { academyService } from './services/AcademyService';
import { AddAcademyManagerDialog } from './components/AddAcademyManagerDialog';
import { CreateAcademyStudentDialog } from './components/CreateAcademyStudentDialog';

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedHooks>()),
  useAuth: () => ({ organization: { id: 'org-1' } }),
}));

vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({
    requestClose: async (close: () => void) => {
      close();
      return true;
    },
    confirmDiscard: async () => true,
  }),
}));

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

let lookupAnswer: (email: string) => Promise<AcademyMemberLookupResult>;
let lookup: ReturnType<typeof vi.fn>;
let addManager: ReturnType<typeof vi.fn>;
let createStudent: ReturnType<typeof vi.fn>;

const MEMBER: AcademyMemberAddResult = {
  id: 'm-1',
  academyId: 'academy-1',
  userId: 'u-1',
  name: 'Ahmed Hassan',
  email: 'ahmed@example.com',
  role: 'manager',
  status: 'active',
  joinedAt: '2026-09-27T00:00:00.000Z',
  outcome: 'added',
};

beforeEach(() => {
  lookupAnswer = async () => ({ status: 'new' });
  lookup = vi.fn((_id: string, email: string) => lookupAnswer(email));
  addManager = vi.fn(async () => MEMBER);
  createStudent = vi.fn(async (): Promise<AcademyStudentAddResult> => ({
    id: 'u-2',
    name: 'Sara Ali',
    email: 'sara@example.com',
    createdAt: '2026-09-27T00:00:00.000Z',
    outcome: 'invited',
  }));
  vi.spyOn(academyService, 'lookupAcademyMember').mockImplementation(
    (id, email) => lookup(id, email) as Promise<AcademyMemberLookupResult>
  );
  vi.spyOn(academyService, 'addAcademyManager').mockImplementation(
    (id, payload) => addManager(id, payload) as Promise<AcademyMemberAddResult>
  );
  vi.spyOn(academyService, 'createAcademyStudent').mockImplementation(
    (id, payload) =>
      createStudent(id, payload) as Promise<AcademyStudentAddResult>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDialog(
  dialog: 'manager' | 'student',
  language: 'en' | 'ar' = 'en'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="root">
            {dialog === 'manager' ? (
              <AddAcademyManagerDialog
                open
                onOpenChange={onOpenChange}
                academyId="academy-1"
              />
            ) : (
              <CreateAcademyStudentDialog
                open
                onOpenChange={onOpenChange}
                academyId="academy-1"
              />
            )}
          </div>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { onOpenChange };
}

describe('smart member invitation — lookup', () => {
  it('asks once per typing burst, and never for an invalid address', async () => {
    const user = userEvent.setup();
    renderDialog('manager');
    const email = screen.getByLabelText('Email address');

    await user.type(email, 'not-an-email');
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(lookup).not.toHaveBeenCalled();

    await user.clear(email);
    await user.type(email, 'Ahmed@Example.com');
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
    expect(lookup.mock.calls[0][1]).toBe('ahmed@example.com');
  });

  it('shows an existing account read-only with an explanation, and never sends a name for it', async () => {
    lookupAnswer = async () => ({ status: 'existing', name: 'Ahmed Hassan' });
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(
      screen.getByLabelText('Email address'),
      'ahmed@example.com'
    );
    expect(
      await screen.findByText('This person already has an Atlas account')
    ).toBeTruthy();
    const name = screen.getByDisplayValue('Ahmed Hassan') as HTMLInputElement;
    expect(name.readOnly).toBe(true);
    expect(
      screen.getByText(
        'This is the name on their Atlas account. Only they can change it.'
      )
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    await waitFor(() => expect(addManager).toHaveBeenCalledTimes(1));
    expect(addManager.mock.calls[0][1]).toEqual({
      email: 'ahmed@example.com',
      name: undefined,
    });
    expect(toastValue.notifySuccess).toHaveBeenCalledWith(
      'academy:members.outcome.added'
    );
  });

  it('keeps an editable, required name for a new email, and says the invitation was sent', async () => {
    addManager.mockResolvedValueOnce({ ...MEMBER, outcome: 'invited' });
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(screen.getByLabelText('Email address'), 'new@example.com');
    expect(
      await screen.findByText(/No Atlas account uses this email yet/)
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    expect(addManager).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Full name'), 'New Person');
    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    await waitFor(() => expect(addManager).toHaveBeenCalledTimes(1));
    expect(addManager.mock.calls[0][1]).toEqual({
      email: 'new@example.com',
      name: 'New Person',
    });
    expect(toastValue.notifySuccess).toHaveBeenCalledWith(
      'academy:members.outcome.invited'
    );
  });

  it('blocks the submit for someone already here, or an unavailable account', async () => {
    lookupAnswer = async (email) =>
      email.startsWith('here')
        ? { status: 'already_member' }
        : { status: 'unavailable' };
    const user = userEvent.setup();
    renderDialog('manager');
    const email = screen.getByLabelText('Email address');

    await user.type(email, 'here@example.com');
    expect(
      await screen.findByText(
        'This person is already a manager in this academy.'
      )
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Add Manager' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    await user.clear(email);
    await user.type(email, 'gone@example.com');
    expect(
      await screen.findByText("This Atlas account can't be added right now.")
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Add Manager' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('falls back to the plain form when the lookup is rate-limited', async () => {
    lookupAnswer = async () => {
      throw new ApiError({
        kind: 'rateLimited',
        messageKey: 'errors.academy.memberLookupRateLimited',
        status: 429,
        retryable: false,
      });
    };
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(screen.getByLabelText('Email address'), 'x@example.com');
    expect(
      await screen.findByText(/Too many checks in a short time/)
    ).toBeTruthy();
    const name = screen.getByLabelText('Full name') as HTMLInputElement;
    expect(name.readOnly).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'Add Manager' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });
});

describe('smart member invitation — student dialog', () => {
  it('adds an existing account as a student and confirms what happened', async () => {
    lookupAnswer = async () => ({ status: 'existing', name: 'Mona Adel' });
    createStudent.mockResolvedValueOnce({
      id: 'u-3',
      name: 'Mona Adel',
      email: 'mona@example.com',
      createdAt: '2026-09-27T00:00:00.000Z',
      outcome: 'added',
    });
    const user = userEvent.setup();
    renderDialog('student');

    await user.type(screen.getByLabelText('Email address'), 'mona@example.com');
    expect(await screen.findByDisplayValue('Mona Adel')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add student' }));

    await waitFor(() => expect(createStudent).toHaveBeenCalledTimes(1));
    expect(createStudent.mock.calls[0][1]).toEqual({
      email: 'mona@example.com',
      name: undefined,
    });
    expect(await screen.findByText('Student added')).toBeTruthy();
    expect(screen.getByText(/They already have an Atlas account/)).toBeTruthy();
  });

  it('tells staff an unfinished account gets a fresh setup link', async () => {
    lookupAnswer = async () => ({
      status: 'existing_pending_setup',
      name: 'Pending Person',
    });
    const user = userEvent.setup();
    renderDialog('student');
    await user.type(screen.getByLabelText('Email address'), 'p@example.com');
    expect(
      await screen.findByText(
        "This person was invited to Atlas but hasn't set up their account yet"
      )
    ).toBeTruthy();
    expect(screen.getByDisplayValue('Pending Person')).toBeTruthy();
  });

  it('renders in Arabic, right-to-left, with the read-only name', async () => {
    lookupAnswer = async () => ({ status: 'existing', name: 'أحمد حسن' });
    const user = userEvent.setup();
    renderDialog('student', 'ar');
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'ahmed@example.com'
    );
    expect(
      await screen.findByText('لدى هذا الشخص حساب Atlas بالفعل')
    ).toBeTruthy();
    const name = screen.getByDisplayValue('أحمد حسن') as HTMLInputElement;
    expect(name.readOnly).toBe(true);
    // The address itself always reads left-to-right.
    expect(screen.getByLabelText('البريد الإلكتروني').getAttribute('dir')).toBe(
      'ltr'
    );
  });
});
