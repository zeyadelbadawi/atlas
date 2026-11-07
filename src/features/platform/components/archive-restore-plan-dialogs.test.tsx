/**
 * Plan management — archiving and restoring a plan.
 *
 * Archive: the confirmation shows who the plan reaches (paying, trialing,
 * switching in, founding) and says plainly that organizations keep it until
 * their period ends and then must choose another plan, and that founding
 * locks lapse at renewal; it sends the row's version; a stale version, an
 * already-archived plan and the last listed plan each say so in the dialog.
 *
 * Restore: hidden by default (`displayOrder` 0); "Show it to customers"
 * offers the next free position and sends the chosen one; a bad position
 * never leaves; a stale version and "not archived" say so in the dialog.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { PlatformPlanRow } from '@types';

const state = vi.hoisted(() => ({
  archive: vi.fn(),
  restore: vi.fn(),
  archiveError: null as ApiError | null,
  restoreError: null as ApiError | null,
  notifySuccess: vi.fn(),
}));

vi.mock('../hooks/usePlatformPlans', () => ({
  useArchivePlan: () => ({
    mutateAsync: state.archive,
    isPending: false,
    error: state.archiveError,
    reset: vi.fn(),
  }),
  useRestorePlan: () => ({
    mutateAsync: state.restore,
    isPending: false,
    error: state.restoreError,
    reset: vi.fn(),
  }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({
    notifySuccess: state.notifySuccess,
    notifyError: vi.fn(),
  }),
}));

const { ArchivePlanDialog } = await import('./ArchivePlanDialog');
const { RestorePlanDialog } = await import('./RestorePlanDialog');

const plan = (over: Partial<PlatformPlanRow> = {}): PlatformPlanRow =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    status: 'active',
    displayOrder: 2,
    version: 7,
    limits: {},
    features: {},
    trialEligible: false,
    subscribers: {
      paying: 1250,
      trialing: 4,
      scheduledIn: 2,
      foundingLocks: 3,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }) as unknown as PlatformPlanRow;

const wrap = (ui: JSX.Element, language: 'en' | 'ar' = 'en') =>
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>{ui}</I18nextProvider>
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.archiveError = null;
  state.restoreError = null;
});

describe('ArchivePlanDialog', () => {
  it('shows who the plan reaches and what archiving does to them', () => {
    wrap(<ArchivePlanDialog plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByTestId('archive-count-paying').textContent).toBe(
      '1,250'
    );
    expect(screen.getByTestId('archive-count-trialing').textContent).toBe('4');
    expect(screen.getByTestId('archive-count-scheduled-in').textContent).toBe(
      '2'
    );
    expect(screen.getByTestId('archive-count-founding').textContent).toBe('3');
    const consequence = screen.getByTestId(
      'archive-plan-consequence'
    ).textContent;
    expect(consequence).toContain('keep it until their current period ends');
    expect(consequence).toContain('must choose another plan');
    expect(consequence).toContain('lose their lock at renewal');
    expect(screen.getByTestId('archive-plan-confirm').className).toContain(
      'destructive'
    );
  });

  it('archives with the row version, says so and closes', async () => {
    state.archive.mockResolvedValue(plan({ status: 'archived' }));
    const onClose = vi.fn();
    wrap(<ArchivePlanDialog plan={plan()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('archive-plan-confirm'));
    await waitFor(() =>
      expect(state.archive).toHaveBeenCalledWith({
        key: 'growth',
        expectedVersion: 7,
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(state.notifySuccess).toHaveBeenCalledWith(
      'platform:planAdmin.archive.archivedTitle',
      'platform:planAdmin.archive.archivedDescription',
      { plan: 'Growth' }
    );
  });

  it('a stale version says someone else changed it', () => {
    state.archiveError = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.concurrency.staleVersion',
    });
    wrap(<ArchivePlanDialog plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByTestId('archive-plan-stale').textContent).toContain(
      'Someone else changed this plan'
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('refuses to archive the last plan customers can see, with the reason', () => {
    state.archiveError = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.plan.lastListedPlan',
    });
    wrap(<ArchivePlanDialog plan={plan()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('archive-plan-stale')).toBeNull();
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'This is the last plan customers can see'
    );
  });

  it('says when the plan is already archived', () => {
    state.archiveError = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.plan.alreadyArchived',
    });
    wrap(<ArchivePlanDialog plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'This plan is already archived.'
    );
  });

  it('renders the counts with Western digits in Arabic', () => {
    wrap(<ArchivePlanDialog plan={plan()} onClose={vi.fn()} />, 'ar');
    expect(screen.getByTestId('archive-count-paying').textContent).toBe(
      '1,250'
    );
    const dialog = screen.getByTestId('archive-plan-dialog');
    expect(dialog.textContent).not.toMatch(/platform:|planAdmin\./);
    expect(dialog.textContent).toMatch(/[؀-ۿ]/);
  });
});

describe('RestorePlanDialog', () => {
  const archived = plan({ status: 'archived', displayOrder: 0, version: 9 });

  it('restores hidden by default', async () => {
    state.restore.mockResolvedValue(plan());
    const onClose = vi.fn();
    wrap(
      <RestorePlanDialog
        plan={archived}
        nextListedPosition={4}
        onClose={onClose}
      />
    );
    expect(
      (screen.getByTestId('restore-plan-hidden') as HTMLInputElement).checked
    ).toBe(true);
    fireEvent.click(screen.getByTestId('restore-plan-confirm'));
    await waitFor(() =>
      expect(state.restore).toHaveBeenCalledWith({
        key: 'growth',
        expectedVersion: 9,
        displayOrder: 0,
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(state.notifySuccess).toHaveBeenCalledWith(
      'platform:planAdmin.restore.restoredTitle',
      'platform:planAdmin.restore.restoredHidden',
      expect.objectContaining({ plan: 'Growth' })
    );
  });

  it('shows it to customers at the next free position, or the one typed', async () => {
    state.restore.mockResolvedValue(plan());
    wrap(
      <RestorePlanDialog
        plan={archived}
        nextListedPosition={4}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('restore-plan-listed'));
    const position = screen.getByTestId(
      'restore-plan-position'
    ) as HTMLInputElement;
    expect(position.value).toBe('4');
    fireEvent.change(position, { target: { value: '٢' } });
    fireEvent.click(screen.getByTestId('restore-plan-confirm'));
    await waitFor(() =>
      expect(state.restore).toHaveBeenCalledWith({
        key: 'growth',
        expectedVersion: 9,
        displayOrder: 2,
      })
    );
  });

  it('never sends a position outside 1–1,000', async () => {
    wrap(
      <RestorePlanDialog
        plan={archived}
        nextListedPosition={4}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('restore-plan-listed'));
    fireEvent.change(screen.getByTestId('restore-plan-position'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('restore-plan-confirm'));
    expect(
      (await screen.findByTestId('restore-plan-position-error')).textContent
    ).toBe('Position in the plan list must be a whole number from 1 to 1,000.');
    expect(state.restore).not.toHaveBeenCalled();
  });

  it('a stale version says someone else changed it', () => {
    state.restoreError = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.concurrency.staleVersion',
    });
    wrap(
      <RestorePlanDialog
        plan={archived}
        nextListedPosition={4}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('restore-plan-stale')).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('says when the plan is no longer archived', () => {
    state.restoreError = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.plan.notArchived',
    });
    wrap(
      <RestorePlanDialog
        plan={archived}
        nextListedPosition={4}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId('restore-plan-stale')).toBeNull();
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'This plan isn’t archived'
    );
  });
});
