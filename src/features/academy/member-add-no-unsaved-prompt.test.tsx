/**
 * B0-IAM-04 — after a SUCCESSFUL add, the Add Manager / Add Instructor
 * dialogs close without asking "Leave without saving?". The dialogs used
 * to close through the dirty guard, and the form still held the typed
 * address, so every successful add asked. Closing a dirty form without
 * saving must still ask.
 *
 * Unlike `smart-member-invite.test.tsx`, the REAL dirty guard runs here;
 * only the confirm dialog itself is replaced by a spy.
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
import type { AcademyMemberAddResult } from '@types';
import { academyService } from './services/AcademyService';
import { AddAcademyManagerDialog } from './components/AddAcademyManagerDialog';
import { AddAcademyInstructorDialog } from './components/AddAcademyInstructorDialog';

const confirm = vi.fn(async () => true);

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedHooks>()),
  useAuth: () => ({ organization: { id: 'org-1' } }),
}));

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

function member(role: 'manager' | 'instructor'): AcademyMemberAddResult {
  return {
    id: 'm-1',
    academyId: 'academy-1',
    userId: 'u-1',
    name: 'New Person',
    email: 'new@example.com',
    role,
    status: 'active',
    joinedAt: '2026-10-13T00:00:00.000Z',
    outcome: 'invited',
  };
}

beforeEach(() => {
  vi.spyOn(academyService, 'lookupAcademyMember').mockResolvedValue({
    status: 'new',
  });
  vi.spyOn(academyService, 'addAcademyManager').mockResolvedValue(
    member('manager')
  );
  vi.spyOn(academyService, 'addAcademyInstructor').mockResolvedValue(
    member('instructor')
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderDialog(kind: 'manager' | 'instructor') {
  const onOpenChange = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Dialog =
    kind === 'manager' ? AddAcademyManagerDialog : AddAcademyInstructorDialog;
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <Dialog open onOpenChange={onOpenChange} academyId="academy-1" />
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { onOpenChange };
}

describe.each([
  ['manager', 'Add Manager'],
  ['instructor', 'Add Instructor'],
] as const)('Add %s dialog (B0-IAM-04)', (kind, submitLabel) => {
  it('closes after a successful add without asking to discard changes', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog(kind);
    await user.type(screen.getByLabelText('Email address'), 'new@example.com');
    expect(await screen.findByText(/Not in this academy yet/)).toBeTruthy();
    await user.type(screen.getByLabelText('Full name'), 'New Person');
    await user.click(screen.getByRole('button', { name: submitLabel }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(confirm).not.toHaveBeenCalled();
    expect(toastValue.notifySuccess).toHaveBeenCalledWith(
      'academy:members.outcome.invited'
    );
  });

  it('still asks before closing a filled-in form that was not submitted', async () => {
    confirm.mockResolvedValueOnce(false);
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog(kind);
    await user.type(screen.getByLabelText('Email address'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
