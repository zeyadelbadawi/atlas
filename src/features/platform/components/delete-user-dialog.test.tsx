/**
 * DeleteUserDialog — the Platform Owner's irreversible administrative act.
 *
 * Native DOM assertions only (this repo has no jest-dom), and the mocked
 * `t` echoes its key so the assertions stay on structure rather than copy.
 *
 * What is pinned here is everything that stands between an operator and
 * deleting the wrong account, or being told something untrue about what was
 * deleted:
 *
 *   - the confirm button is inert until the target's exact email is typed
 *   - a refused or already-deleted account cannot be submitted at all
 *   - each group of records is labelled with the treatment it actually gets,
 *     in words, so colour is never the only signal that the financial
 *     records are being KEPT rather than destroyed
 *   - the outcome is rendered in place, not as a toast that disappears
 *
 * The last two matter most. An impact list that said "delete" for all five
 * treatments would be a lie told at the exact moment a person is deciding,
 * and nothing else in the system would catch it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeletionPlan } from '@types';

const mockPlan = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();
const mockMutation = vi.fn();

vi.mock('../hooks', () => ({
  useUserDeletionPlan: () => mockPlan(),
  useDeleteUserAsPlatformOwner: () => mockMutation(),
}));
vi.mock('@utils', () => ({
  apiErrorMessage: (_t: unknown, _i18n: unknown, _error: unknown) =>
    'the-error-message',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
    i18n: { exists: () => true },
  }),
}));

import { DeleteUserDialog } from './DeleteUserDialog';

const EMAIL = 'Learner@Example.com';

const readyPlan: DeletionPlan = {
  userId: 'u1',
  subjectRole: 'client_owner',
  deletable: true,
  alreadyDeleted: false,
  lines: [
    { key: 'financialRecords', treatment: 'retain', count: 1 },
    { key: 'academies', treatment: 'destroy', count: 2, examples: ['Northwind'] },
    { key: 'enrollments', treatment: 'tombstone', count: 7 },
    { key: 'sessions', treatment: 'revoke', count: 3 },
    { key: 'identity', treatment: 'deidentify', count: 1 },
  ],
};

function setMutation(overrides: Record<string, unknown> = {}) {
  mockMutation.mockReturnValue({
    mutate: mockMutate,
    reset: mockReset,
    isPending: false,
    isSuccess: false,
    error: null,
    data: undefined,
    ...overrides,
  });
}

function renderDialog() {
  return render(
    <DeleteUserDialog
      open
      onOpenChange={() => undefined}
      userId="u1"
      userEmail={EMAIL}
      userName="A Learner"
    />
  );
}

/** The destructive submit, found by its key-echoed label. */
function confirmButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: 'platform:users.delete.confirmAction',
  }) as HTMLButtonElement;
}

afterEach(() => {
  cleanup();
  mockPlan.mockReset();
  mockMutation.mockReset();
  mockMutate.mockReset();
  mockReset.mockReset();
});

describe('DeleteUserDialog', () => {
  describe('the typed confirmation', () => {
    it('keeps the destructive action inert until the exact email is typed', async () => {
      const user = userEvent.setup();
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();

      expect(confirmButton().disabled).toBe(true);

      const field = screen.getByLabelText(/confirmLabel/);
      await user.type(field, 'wrong@example.com');
      expect(confirmButton().disabled).toBe(true);

      await user.clear(field);
      // Case and surrounding space must not defeat a legitimate operator.
      await user.type(field, '  learner@example.com  ');
      expect(confirmButton().disabled).toBe(false);
    });

    it('does not delete anything on a click while the confirmation is wrong', async () => {
      const user = userEvent.setup();
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();

      await user.type(screen.getByLabelText(/confirmLabel/), 'nope');
      await user.click(confirmButton());
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('submits once the email matches', async () => {
      const user = userEvent.setup();
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();

      await user.type(screen.getByLabelText(/confirmLabel/), EMAIL);
      await user.click(confirmButton());
      expect(mockMutate).toHaveBeenCalledWith({ userId: 'u1', payload: {} });
    });
  });

  describe('accounts it will not delete', () => {
    it('blocks a refused account and says so', () => {
      mockPlan.mockReturnValue({
        data: { ...readyPlan, deletable: false, refusalKey: 'errors.forbidden' },
        isLoading: false,
        error: null,
      });
      setMutation();
      renderDialog();

      expect(screen.getByText('platform:users.delete.refused')).toBeDefined();
      expect(confirmButton().disabled).toBe(true);
    });

    it('blocks an already-deleted account without calling it an error', () => {
      mockPlan.mockReturnValue({
        data: { ...readyPlan, deletable: false, alreadyDeleted: true },
        isLoading: false,
        error: null,
      });
      setMutation();
      renderDialog();

      const notice = screen.getByText('platform:users.delete.alreadyDeleted');
      expect(notice).toBeDefined();
      // A finished state, not a failure — so a status region, not an alert.
      expect(notice.getAttribute('role')).toBe('status');
      expect(confirmButton().disabled).toBe(true);
    });

    it('blocks submission while the plan is still loading', () => {
      mockPlan.mockReturnValue({ data: undefined, isLoading: true, error: null });
      setMutation();
      renderDialog();
      expect(confirmButton().disabled).toBe(true);
    });

    it('reports a failed plan as an alert, and makes clear nothing was deleted', () => {
      mockPlan.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('boom'),
      });
      setMutation();
      renderDialog();

      const alert = screen.getByText('platform:users.delete.planFailed');
      expect(alert.getAttribute('role')).toBe('alert');
      expect(confirmButton().disabled).toBe(true);
    });
  });

  describe('telling the truth about what happens', () => {
    it('labels every group with its own treatment, in words', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();

      // The five treatments must be distinguishable without colour.
      expect(screen.getByText('platform:users.delete.treatment.destroy')).toBeDefined();
      expect(screen.getByText('platform:users.delete.treatment.retain')).toBeDefined();
      expect(
        screen.getByText('platform:users.delete.treatment.tombstone')
      ).toBeDefined();
      expect(screen.getByText('platform:users.delete.treatment.revoke')).toBeDefined();
      expect(
        screen.getByText('platform:users.delete.treatment.deidentify')
      ).toBeDefined();
    });

    it('does not describe retained financial records as destroyed', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();

      // The financial line exists, and the word beside it is "kept".
      expect(screen.getByText(/plan\.financialRecords/)).toBeDefined();
      const destroyLabels = screen.getAllByText(
        'platform:users.delete.treatment.destroy'
      );
      // Only the academies line is destroyed in this fixture.
      expect(destroyLabels).toHaveLength(1);
    });

    it('names a few of the academies it will take offline', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation();
      renderDialog();
      expect(screen.getByText('Northwind')).toBeDefined();
    });
  });

  describe('after the deletion', () => {
    it('renders the outcome in place rather than leaving it to a toast', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation({ isSuccess: true, data: { deleted: true, academiesArchived: 2 } });
      renderDialog();

      expect(screen.getByText('platform:users.delete.doneTitle')).toBeDefined();
      expect(screen.getByText(/academiesArchived:2/)).toBeDefined();
      // And it still says what survived, so "deleted" is not overclaimed.
      expect(screen.getByText('platform:users.delete.retainedNotice')).toBeDefined();
      // The destructive action is gone — there is nothing left to press.
      expect(
        screen.queryByRole('button', {
          name: 'platform:users.delete.confirmAction',
        })
      ).toBeNull();
    });

    it('surfaces a failure as an alert instead of a silent close', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation({ error: new Error('nope') });
      renderDialog();

      const alert = screen.getByText('the-error-message');
      expect(alert.getAttribute('role')).toBe('alert');
    });

    it('disables both buttons while the deletion is in flight', () => {
      mockPlan.mockReturnValue({ data: readyPlan, isLoading: false, error: null });
      setMutation({ isPending: true });
      renderDialog();

      expect(
        (
          screen.getByRole('button', {
            name: 'platform:users.delete.deleting',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
      expect(
        (
          screen.getByRole('button', {
            name: 'common:actions.cancel',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });
  });
});
