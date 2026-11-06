/**
 * B4 (UX audit) — Settings › Create invite (V01, V12), Members (V11, V27),
 * Delete academy (V02). Real EN/AR catalogues: every message is the text a
 * customer reads.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Academy } from '@types';

const state = vi.hoisted(() => ({
  createError: null as ApiError | null,
  createMutate: vi.fn(),
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  deleteError: null as ApiError | null,
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({
    notifySuccess: state.notifySuccess,
    notifyError: state.notifyError,
    notify: vi.fn(),
    dismissAll: vi.fn(),
  }),
  useConfirmDialog: () => ({ confirm: state.confirm }),
}));

vi.mock('./hooks', () => ({
  useAcademyInvites: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateAcademyInvite: () => ({
    mutate: state.createMutate,
    reset: vi.fn(),
    isPending: false,
    error: state.createError,
  }),
  useRevokeAcademyInvite: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteAcademy: () => ({
    mutateAsync: vi.fn().mockRejectedValue(state.deleteError),
    reset: vi.fn(),
    isPending: false,
    error: state.deleteError,
  }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));

const { AcademyInvitesCard } = await import(
  './components/AcademyInvitesCard'
);
const { DeleteAcademyCard } = await import('./components/DeleteAcademyCard');
const { MemberAccountFields } = await import(
  './components/MemberAccountFields'
);
const { existingTeamRole } = await import('./utils/member-add.utils');

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function tree(children: ReactNode, language: 'en' | 'ar' = 'en') {
  return (
    <I18nextProvider i18n={I18N[language]}>
      <MemoryRouter>
        <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
      </MemoryRouter>
    </I18nextProvider>
  );
}

function wrap(children: ReactNode, language: 'en' | 'ar' = 'en') {
  return render(tree(children, language));
}

function openInviteDialog(language: 'en' | 'ar' = 'en') {
  const view = wrap(<AcademyInvitesCard academyId="a-1" />, language);
  fireEvent.click(
    screen.getByRole('button', {
      name: language === 'ar' ? /إنشاء دعوة/ : /create invite/i,
    })
  );
  return view;
}

function field(name: string): HTMLInputElement {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
}

function inputByLabel(label: RegExp): HTMLInputElement {
  return screen.getByLabelText(label) as HTMLInputElement;
}

beforeEach(() => {
  state.confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  state.createError = null;
  state.deleteError = null;
  state.createMutate.mockReset();
  state.confirm.mockReset();
  state.notifyError.mockReset();
});

describe('Create invite (V01, V12)', () => {
  it('refuses a bad email, 1.5 uses and 0 days with the limits stated — never greyed', async () => {
    openInviteDialog();
    fireEvent.change(inputByLabel(/email address/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(inputByLabel(/maximum uses/i), {
      target: { value: '1.5' },
    });
    fireEvent.change(inputByLabel(/valid for/i), { target: { value: '0' } });
    const submit = screen.getByTestId('invite-create-submit');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    expect(
      await screen.findAllByText('Enter a valid email address')
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText('Enter a whole number from 1 to 1,000.')
    ).not.toHaveLength(0);
    expect(
      screen.getAllByText('Enter a whole number of days from 1 to 365.')
    ).not.toHaveLength(0);
    // Three problems: the summary lists them (V3).
    expect(screen.getByText('Fix these 3 problems to continue')).toBeTruthy();
    expect(state.createMutate).not.toHaveBeenCalled();
  });

  it('refuses more than the backend allows (99999 uses, 10000 days)', async () => {
    openInviteDialog();
    fireEvent.change(inputByLabel(/maximum uses/i), {
      target: { value: '99999' },
    });
    fireEvent.change(inputByLabel(/valid for/i), {
      target: { value: '10000' },
    });
    fireEvent.click(screen.getByTestId('invite-create-submit'));
    expect(
      await screen.findAllByText('Enter a whole number from 1 to 1,000.')
    ).not.toHaveLength(0);
    expect(state.createMutate).not.toHaveBeenCalled();
  });

  it('sends whole numbers (Arabic digits read as Western)', async () => {
    openInviteDialog();
    fireEvent.change(inputByLabel(/maximum uses/i), {
      target: { value: '٣' },
    });
    fireEvent.click(screen.getByTestId('invite-create-submit'));
    await waitFor(() => expect(state.createMutate).toHaveBeenCalled());
    expect(state.createMutate.mock.calls[0][0]).toEqual({
      email: undefined,
      maxUses: 3,
      expiresInDays: 7,
    });
  });

  it('puts the server violations on their fields, with no other message', async () => {
    const view = openInviteDialog();
    // The refusal arrives while the dialog is open.
    state.createError = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [
        { field: 'maxUses', messageKey: 'validation:max', values: { max: 1000 } },
      ],
    });
    view.rerender(tree(<AcademyInvitesCard academyId="a-1" />));
    expect(
      await screen.findByText('Maximum uses must be 1000 or less')
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(state.notifyError).not.toHaveBeenCalled();
  });

  it('shows any other failure ONCE, inside the dialog, with the real reason', () => {
    const view = openInviteDialog();
    state.createError = createApiError('network');
    view.rerender(tree(<AcademyInvitesCard academyId="a-1" />));
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain('The invite could not be created.');
    expect(alert.textContent).toContain('Check your connection');
    expect(state.notifyError).not.toHaveBeenCalled();
  });

  it('asks before Escape throws a typed email away', async () => {
    state.confirm.mockResolvedValue(false);
    openInviteDialog();
    fireEvent.change(inputByLabel(/email address/i), {
      target: { value: 'learner@example.com' },
    });
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect(inputByLabel(/email address/i).value).toBe('learner@example.com');
  });

  it('states the limits in Arabic too', async () => {
    openInviteDialog('ar');
    fireEvent.change(field('maxUses'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('invite-create-submit'));
    expect(
      await screen.findAllByText('أدخل عددًا صحيحًا من 1 إلى 1000.')
    ).not.toHaveLength(0);
  });
});

describe('Add manager — the "already here" callout (V11)', () => {
  function renderCallout(
    role: 'manager' | 'instructor' | 'student',
    existingRole?: 'instructor' | 'manager',
    language: 'en' | 'ar' = 'en'
  ) {
    function Harness() {
      const form = useForm({ defaultValues: { email: 'x@example.com', name: '' } });
      return (
        <Form {...form}>
          <MemberAccountFields
            control={form.control}
            lookup={{ state: 'already_member' }}
            copyPrefix="academy:members.addManager"
            role={role}
            idPrefix="t"
            existingRole={existingRole}
          />
        </Form>
      );
    }
    return wrap(<Harness />, language);
  }

  it('names the role the person really has, from the team list', () => {
    renderCallout('manager', 'instructor');
    expect(
      screen.getByText(
        "This person is already on this academy's team, as Instructor."
      )
    ).toBeTruthy();
  });

  it('names no role when the list does not know it — never the dialog’s', () => {
    renderCallout('manager');
    expect(screen.queryByText(/already a manager/i)).toBeNull();
    expect(
      screen.getByText(
        "This person is already on this academy's team. You can see their role in the team list."
      )
    ).toBeTruthy();
  });

  it('reads correctly in Arabic', () => {
    renderCallout('manager', 'instructor', 'ar');
    expect(
      screen.getByText('هذا الشخص ضمن فريق هذه الأكاديمية بالفعل، بدور المدرب.')
    ).toBeTruthy();
    renderCallout('student', undefined, 'ar');
    expect(
      screen.getByText('هذا الشخص طالب في هذه الأكاديمية بالفعل.')
    ).toBeTruthy();
  });

  it('finds the role by email, ignoring case and removed members', () => {
    const members = [
      { email: 'Teach@Example.com', role: 'instructor', status: 'active' },
      { email: 'gone@example.com', role: 'manager', status: 'inactive' },
    ] as const;
    expect(existingTeamRole(members, ' teach@example.com ')).toBe('instructor');
    expect(existingTeamRole(members, 'gone@example.com')).toBeUndefined();
  });
});

describe('Delete academy (V02)', () => {
  const ACADEMY = { id: 'a-1', name: 'Acme' } as Academy;

  it.each([
    ['server', 'Something failed on our side'],
    ['network', 'Check your connection'],
  ] as const)('a %s failure is one inline message with the real reason', (kind, text) => {
    state.deleteError = createApiError(kind);
    wrap(<DeleteAcademyCard academy={ACADEMY} />);
    fireEvent.click(screen.getByTestId('open-delete-academy'));
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain('The academy could not be deleted');
    expect(alert.textContent).toContain(text);
    // Never the technical message.
    expect(alert.textContent).not.toMatch(/\[server\]|\[network\]|errors\./);
    expect(state.notifyError).not.toHaveBeenCalled();
  });
});
