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
 * Native DOM assertions only (this repo has no jest-dom).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LifecyclePanel } from './components/LifecyclePanel';
import type { SubscriptionLifecycleState } from '@types';

const mockLifecycle = vi.fn();

vi.mock('./hooks/useSubscriptionLifecycleState', () => ({
  useSubscriptionLifecycleState: () => mockLifecycle(),
}));
vi.mock('@hooks', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Owner' }, organization: { id: 'o1' } }),
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

function renderWith(s: SubscriptionLifecycleState) {
  mockLifecycle.mockReturnValue({
    state: s,
    isLoading: false,
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
});
