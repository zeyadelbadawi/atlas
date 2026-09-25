/**
 * The lifecycle panel, state by state.
 *
 * Written because of a specific hole: `grace_period` had no case, so it
 * fell through to the `active` default and rendered as SILENCE. An owner
 * whose payment was late saw exactly what a healthy account sees — while
 * the lifecycle sequence emailed them to say their site would go offline
 * in seven days. The dashboard and the inbox contradicted each other, and
 * the dashboard was the one the owner would check first.
 *
 * The cases below therefore pin the two things that distinguish these
 * states from one another rather than the exact wording: that a state
 * which needs action is never silent, and that a state where nothing has
 * been switched off is never rendered as destructive. Getting that second
 * one wrong would tell a customer their site is gone when it is running.
 *
 * P64 C6 added a ninth thing this panel can say — `retention_warning`,
 * which is not a subscription lifecycle at all but an overlay fed by the
 * retention read. Its cases are at the bottom, and they pin the two
 * properties that make it safe: it speaks only once a warning has really
 * been SENT (so the dashboard and the customer's inbox cannot contradict
 * each other), and it is never destructive, because nothing has been
 * deleted.
 *
 * Native DOM assertions only (this repo has no jest-dom).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LifecyclePanel } from './components/LifecyclePanel';
import type { SubscriptionLifecycleState, TenantRetention } from '@types';

const mockLifecycle = vi.fn();
const mockRetention = vi.fn();

vi.mock('./hooks/useSubscriptionLifecycleState', () => ({
  useSubscriptionLifecycleState: () => mockLifecycle(),
}));
vi.mock('./hooks/useTenantRetention', () => ({
  useTenantRetention: () => mockRetention(),
}));
vi.mock('@hooks', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Owner' }, organization: { id: 'o1' } }),
  // The panel checks the owner-exclusive marker only to avoid provoking a
  // 403 per page load for a Manager; it grants nothing.
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
    i18n: { language: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
  mockLifecycle.mockReset();
  mockRetention.mockReset();
});

function state(
  overrides: Partial<SubscriptionLifecycleState>,
): SubscriptionLifecycleState {
  return {
    lifecycle: 'active',
    hasAccess: true,
    trialAvailable: false,
    ...overrides,
  } as SubscriptionLifecycleState;
}

/** A retention payload. Warned-about-but-nothing-deleted by default. */
function retention(overrides: Partial<TenantRetention> = {}): TenantRetention {
  return {
    organizationId: 'o1',
    state: 'warning',
    mode: 'warn_only',
    windowOpen: true,
    origin: 'trial',
    windowDays: 90,
    anchorAt: '2026-10-01T09:00:00.000Z',
    deletionAt: '2026-12-30T09:00:00.000Z',
    daysUntilDeletion: 25,
    warnings: [
      { step: 'retention_warning_30d', dueAt: '2026-11-30T09:00:00.000Z', sent: true },
      { step: 'retention_warning_14d', dueAt: '2026-12-16T09:00:00.000Z', sent: false },
      { step: 'retention_warning_7d', dueAt: '2026-12-23T09:00:00.000Z', sent: false },
      { step: 'retention_warning_24h', dueAt: '2026-12-29T09:00:00.000Z', sent: false },
    ],
    hold: { held: false, reason: null },
    video: {
      assetCount: 2,
      storedMinutes: 30,
      storedBytes: '20000000',
      deletedAssetCount: 0,
      lastDeletedAt: null,
    },
    courses: [],
    coursesTruncated: false,
    generatedAt: '2026-12-05T09:00:00.000Z',
    ...overrides,
  };
}

function renderWith(
  s: SubscriptionLifecycleState,
  retentionData?: TenantRetention,
) {
  mockLifecycle.mockReturnValue({
    state: s,
    isLoading: false,
    hasNoOrganization: false,
  });
  mockRetention.mockReturnValue({
    data: retentionData,
    isLoading: false,
    error: null,
    refetch: () => {},
    hasNoOrganization: false,
  });
  return render(
    <MemoryRouter>
      <LifecyclePanel />
    </MemoryRouter>,
  );
}

describe('LifecyclePanel', () => {
  it('says nothing at all when the subscription is healthy', () => {
    const { container } = renderWith(state({ lifecycle: 'active' }));
    // Silence is the correct UI for "everything is fine".
    expect(container.textContent?.trim()).toBe('');
  });

  it('GRACE PERIOD is not silent — this is the regression that prompted the test', () => {
    const { container } = renderWith(
      state({
        lifecycle: 'grace_period',
        hasAccess: true,
        graceEndsAt: '2026-10-08T09:00:00.000Z',
      }),
    );
    expect(container.textContent?.trim()).not.toBe('');
    expect(container.textContent).toContain('lifecycle.gracePeriod.title');
  });

  it('grace period carries the DEADLINE, which is the only fact that decides what the owner does', () => {
    renderWith(
      state({
        lifecycle: 'grace_period',
        hasAccess: true,
        graceEndsAt: '2026-10-08T09:00:00.000Z',
      }),
    );
    // The description key is interpolated with a formatted date rather
    // than falling back to the dateless variant.
    const withDate = screen.getByText(/lifecycle\.gracePeriod\.description:/);
    expect(withDate.textContent).toMatch(/description:.+/);
  });

  it('falls back to the dateless wording rather than printing an empty date', () => {
    renderWith(state({ lifecycle: 'grace_period', hasAccess: true }));
    expect(
      screen.getAllByText(/lifecycle\.gracePeriod\.descriptionNoDate/).length,
    ).toBeGreaterThan(0);
  });

  it('grace period is NOT destructive — nothing of theirs is switched off yet', () => {
    const { container } = renderWith(
      state({
        lifecycle: 'grace_period',
        hasAccess: true,
        graceEndsAt: '2026-10-08T09:00:00.000Z',
      }),
    );
    // Telling a customer their site is gone while it is still serving
    // traffic is the one thing this panel must never do.
    //
    // Asserted together with "it rendered at all", because an empty panel
    // also contains no destructive markup — without this line the case
    // would pass vacuously against the very bug it is here to catch.
    expect(container.textContent).toContain('lifecycle.gracePeriod.title');
    expect(container.querySelector('[data-variant="destructive"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/destructive/);
  });

  it('an expired account IS destructive, so the two states cannot be confused', () => {
    const { container } = renderWith(
      state({ lifecycle: 'expired', hasAccess: false }),
    );
    expect(container.textContent).toContain('lifecycle.expired.title');
    expect(container.innerHTML).toMatch(/destructive/);
  });

  it('an expired row that went through grace reports when access ACTUALLY ended', () => {
    renderWith(
      state({
        lifecycle: 'expired',
        hasAccess: false,
        currentPeriodEnd: '2026-10-01T09:00:00.000Z',
        graceEndsAt: '2026-10-08T09:00:00.000Z',
      }),
    );
    // The grace end, not the period end — a week's difference, and it is
    // the date the customer will quote at support.
    const footnote = screen.getByText(/lifecycle\.expired\.endedOn:/);
    expect(footnote.textContent).toContain('endedOn:');
    expect(footnote.textContent).not.toContain('Oct 1');
  });

  // --- retention_warning (P64 C6) ----------------------------------------

  it('says nothing about deletion until a warning has actually been SENT', () => {
    // A window is open and a date exists, but the customer has not been
    // emailed. The dashboard must not get there first.
    const { container } = renderWith(
      state({ lifecycle: 'trial_expired', hasAccess: false }),
      retention({
        state: 'scheduled',
        warnings: retention().warnings.map((w) => ({ ...w, sent: false })),
      }),
    );
    expect(container.querySelector('[data-lifecycle]')?.getAttribute('data-lifecycle'))
      .toBe('trial_expired');
    expect(container.textContent).toContain('lifecycle.trialExpired.title');
    expect(container.textContent).not.toContain('retentionWarning');
  });

  it('REPLACES the lapsed-subscription message once a warning has gone out', () => {
    const { container } = renderWith(
      state({ lifecycle: 'trial_expired', hasAccess: false }),
      retention(),
    );
    expect(container.querySelector('[data-lifecycle]')?.getAttribute('data-lifecycle'))
      .toBe('retention_warning');
    expect(container.textContent).toContain('lifecycle.retentionWarning.title');
    // Two alerts about the same lapse is how the one that matters is missed.
    expect(container.textContent).not.toContain('lifecycle.trialExpired.title');
  });

  it('carries the deletion date and links to the retention page', () => {
    const { container } = renderWith(
      state({ lifecycle: 'expired', hasAccess: false }),
      retention(),
    );
    expect(
      screen.getByText(/lifecycle\.retentionWarning\.description:/).textContent,
    ).toMatch(/description:.+/);
    // The action is the page, not the plans screen — the owner came here
    // to find out WHAT is affected before deciding to pay.
    expect(container.textContent).toContain('lifecycle.retentionWarning.action');
  });

  it('is NOT destructive — nothing has been deleted, and saying so would be false', () => {
    const { container } = renderWith(
      state({ lifecycle: 'expired', hasAccess: false }),
      retention(),
    );
    // `expired` alone IS destructive (asserted above), so this proves the
    // overlay deliberately softens it rather than inheriting it.
    expect(container.textContent).toContain('lifecycle.retentionWarning.title');
    expect(container.innerHTML).not.toMatch(/destructive/);
  });

  it('reports a frozen clock as paused rather than as a countdown', () => {
    const { container } = renderWith(
      state({ lifecycle: 'expired', hasAccess: false }),
      retention({ state: 'held', hold: { held: true, reason: 'legal_hold' } }),
    );
    expect(container.textContent).toContain('retention.state.held.description');
  });
});
