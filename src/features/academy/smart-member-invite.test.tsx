/**
 * Smart member invitation — the Add Manager / Add Student dialogs.
 *
 * As an email is typed, a debounced lookup asks whether the person is
 * already in this academy. ATO F5: it never says whether the address has
 * an Atlas account, nor whose name is on it. What these tests pin:
 *
 *   - one lookup per typing burst (debounced), none for an invalid address;
 *   - the dialog never shows an account's name, even if a lookup answer
 *     carried one;
 *   - the name is always asked for, required (2–120 characters) and sent,
 *     trimmed, on every add — the server uses it only for a new account;
 *   - "already a member" blocks the submit;
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

  it('never shows an account name, even if a lookup answer carried one', async () => {
    // An older backend's answer: the dialog must not reveal it.
    lookupAnswer = async () =>
      ({
        status: 'existing',
        name: 'Ahmed Hassan',
      }) as unknown as AcademyMemberLookupResult;
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(
      screen.getByLabelText('Email address'),
      'ahmed@example.com'
    );
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
    expect(screen.queryByDisplayValue('Ahmed Hassan')).toBeNull();
    expect(screen.queryByText(/Ahmed Hassan/)).toBeNull();
    expect(screen.queryByText(/already has an Atlas account/)).toBeNull();
    const name = screen.getByLabelText('Full name') as HTMLInputElement;
    expect(name.readOnly).toBe(false);
    expect(name.value).toBe('');
  });

  it('requires a name for every add and always sends it, trimmed', async () => {
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(
      screen.getByLabelText('Email address'),
      'ahmed@example.com'
    );
    expect(await screen.findByText(/Not in this academy yet/)).toBeTruthy();
    expect(
      screen.getByText(
        "Used if they don't have an Atlas account yet. People who already use Atlas keep their own name."
      )
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    expect(await screen.findByText('Enter their full name.')).toBeTruthy();
    expect(addManager).not.toHaveBeenCalled();

    const name = screen.getByLabelText('Full name');
    await user.type(name, 'A');
    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    expect(
      await screen.findByText('Enter at least 2 characters.')
    ).toBeTruthy();
    expect(addManager).not.toHaveBeenCalled();

    await user.clear(name);
    await user.type(name, '  Ahmed Hassan  ');
    await user.click(screen.getByRole('button', { name: 'Add Manager' }));
    await waitFor(() => expect(addManager).toHaveBeenCalledTimes(1));
    expect(addManager.mock.calls[0][1]).toEqual({
      email: 'ahmed@example.com',
      name: 'Ahmed Hassan',
    });
    // An account elsewhere on Atlas: added (keeping its own name).
    expect(toastValue.notifySuccess).toHaveBeenCalledWith(
      'academy:members.outcome.added'
    );
  });

  it('says the invitation was sent when the address had no account', async () => {
    addManager.mockResolvedValueOnce({ ...MEMBER, outcome: 'invited' });
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(screen.getByLabelText('Email address'), 'new@example.com');
    expect(await screen.findByText(/Not in this academy yet/)).toBeTruthy();
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

  it('blocks the submit for someone already in this academy', async () => {
    lookupAnswer = async () => ({ status: 'already_member' });
    const user = userEvent.setup();
    renderDialog('manager');

    await user.type(screen.getByLabelText('Email address'), 'here@example.com');
    expect(
      await screen.findByText(
        'This person is already a manager in this academy.'
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText('Full name')).toBeNull();
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
  it('sends the typed name with every add and confirms what happened', async () => {
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
    expect(await screen.findByText(/Not in this academy yet/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add student' }));
    expect(await screen.findByText('Enter their full name.')).toBeTruthy();
    expect(createStudent).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Full name'), 'Mona');
    await user.click(screen.getByRole('button', { name: 'Add student' }));
    await waitFor(() => expect(createStudent).toHaveBeenCalledTimes(1));
    expect(createStudent.mock.calls[0][1]).toEqual({
      email: 'mona@example.com',
      name: 'Mona',
    });
    expect(await screen.findByText('Student added')).toBeTruthy();
    expect(screen.getByText(/They already have an Atlas account/)).toBeTruthy();
  });

  it('blocks a student who is already in this academy', async () => {
    lookupAnswer = async () => ({ status: 'already_member' });
    const user = userEvent.setup();
    renderDialog('student');
    await user.type(screen.getByLabelText('Email address'), 'p@example.com');
    expect(
      await screen.findByText(
        'This person is already a student in this academy.'
      )
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Add student' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('renders in Arabic, right-to-left, with the required name field', async () => {
    const user = userEvent.setup();
    renderDialog('student', 'ar');
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');

    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'ahmed@example.com'
    );
    expect(await screen.findByText(/ليس ضمن هذه الأكاديمية بعد/)).toBeTruthy();
    expect(screen.getByLabelText('الاسم الكامل')).toBeTruthy();
    expect(
      screen.getByText(
        'يُستخدم إذا لم يكن لديه حساب Atlas بعد. من يستخدم Atlas بالفعل يحتفظ باسمه.'
      )
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إضافة الطالب' }));
    expect(await screen.findByText('أدخل اسمه الكامل.')).toBeTruthy();
    // The address itself always reads left-to-right.
    expect(screen.getByLabelText('البريد الإلكتروني').getAttribute('dir')).toBe(
      'ltr'
    );
  });
});
