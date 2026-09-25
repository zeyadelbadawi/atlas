/**
 * Data & retention, state by state.
 *
 * WHAT THESE CASES ARE REALLY PINNING. This page is the destination of an
 * email that tells an academy owner their video will be deleted, so two
 * properties matter more than any wording:
 *
 *   1. It NEVER renders as destructive while nothing has been destroyed.
 *      Asserted structurally rather than by eye: the design system's
 *      destructive tokens all carry `destructive` in the class name, so
 *      "no element on this page uses one" is a real, falsifiable check —
 *      and the paired case proves the assertion can fail, by rendering a
 *      tenant that genuinely HAS lost video and finding those tokens.
 *
 *   2. The exact deletion date is on the page whenever one exists, since
 *      that is the single fact the owner came for.
 *
 * Plus the states themselves: loading, error (with a retry that really
 * calls the hook back), no window, warning, held, flag off, and nothing
 * hosted at all.
 *
 * Native DOM assertions only (this repo has no jest-dom). i18n is mocked
 * to echo its key, the way `analytics-delivery-page.test.tsx` does it, so
 * a case asserts which SENTENCE was chosen rather than its copy.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TenantRetentionPage from './pages/TenantRetentionPage';
import { formatDate } from '@utils';
import type { TenantRetention } from '@types';

const mockRetention = vi.fn();

vi.mock('./hooks/useTenantRetention', () => ({
  useTenantRetention: () => mockRetention(),
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
  mockRetention.mockReset();
});

const DELETION_AT = '2026-12-30T09:00:00.000Z';
const ANCHOR_AT = '2026-10-01T09:00:00.000Z';
/** Rendered through the real formatter, never a hand-written string. */
const DELETION_LABEL = formatDate(DELETION_AT, 'en', 'long');

function retention(overrides: Partial<TenantRetention> = {}): TenantRetention {
  return {
    organizationId: 'org-1',
    state: 'warning',
    mode: 'warn_only',
    windowOpen: true,
    origin: 'trial',
    windowDays: 90,
    anchorAt: ANCHOR_AT,
    deletionAt: DELETION_AT,
    daysUntilDeletion: 25,
    warnings: [
      {
        step: 'retention_warning_30d',
        dueAt: '2026-11-30T09:00:00.000Z',
        sent: true,
      },
      {
        step: 'retention_warning_14d',
        dueAt: '2026-12-16T09:00:00.000Z',
        sent: false,
      },
      {
        step: 'retention_warning_7d',
        dueAt: '2026-12-23T09:00:00.000Z',
        sent: false,
      },
      {
        step: 'retention_warning_24h',
        dueAt: '2026-12-29T09:00:00.000Z',
        sent: false,
      },
    ],
    hold: { held: false, reason: null },
    video: {
      assetCount: 2,
      storedMinutes: 30,
      storedBytes: '20000000',
      deletedAssetCount: 0,
      lastDeletedAt: null,
    },
    courses: [
      { id: 'c1', title: 'Fire safety', videoCount: 2, storedMinutes: 30 },
    ],
    coursesTruncated: false,
    generatedAt: '2026-12-05T09:00:00.000Z',
    ...overrides,
  };
}

function renderWith(
  result: Partial<{
    data: TenantRetention | undefined;
    isLoading: boolean;
    error: { kind: string; requestId?: string } | null;
    refetch: () => void;
    hasNoOrganization: boolean;
  }>
) {
  mockRetention.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasNoOrganization: false,
    ...result,
  });
  return render(
    <MemoryRouter>
      <TenantRetentionPage />
    </MemoryRouter>
  );
}

/** Every destructive design token carries the word in its class name. */
function destructiveNodes(container: HTMLElement): Element[] {
  return [...container.querySelectorAll('[class*="destructive"]')];
}

describe('TenantRetentionPage', () => {
  it('shows a real loading state, not a blank page', () => {
    const { container } = renderWith({ isLoading: true });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    // The heading is already there, so the page never flashes empty.
    expect(container.textContent).toContain('tenant:retention.title');
  });

  it('shows an error state with a retry that actually retries', () => {
    const refetch = vi.fn();
    const { container } = renderWith({ error: { kind: 'server' }, refetch });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(container.textContent).toContain('tenant:retention.error.title');

    const retry = screen.getByText('common:actions.retry');
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there is no hosted video at all', () => {
    const { container } = renderWith({
      data: retention({
        state: 'not_scheduled',
        windowOpen: false,
        origin: null,
        windowDays: null,
        anchorAt: null,
        deletionAt: null,
        daysUntilDeletion: null,
        warnings: [],
        courses: [],
        video: {
          assetCount: 0,
          storedMinutes: 0,
          storedBytes: '0',
          deletedAssetCount: 0,
          lastDeletedAt: null,
        },
      }),
    });
    expect(container.textContent).toContain('tenant:retention.empty.title');
    expect(container.querySelector('[data-testid="retention-page"]')).toBeNull();
  });

  it('NO WINDOW: says nothing is scheduled, and says it calmly', () => {
    const { container } = renderWith({
      data: retention({
        state: 'not_scheduled',
        windowOpen: false,
        origin: null,
        windowDays: null,
        anchorAt: null,
        deletionAt: null,
        daysUntilDeletion: null,
        warnings: [],
      }),
    });

    const page = container.querySelector('[data-testid="retention-page"]')!;
    expect(page.getAttribute('data-retention-state')).toBe('not_scheduled');
    expect(page.getAttribute('data-retention-tone')).toBe('calm');
    expect(container.textContent).toContain(
      'tenant:retention.summary.nothingDeleted'
    );
    expect(container.textContent).toContain(
      'tenant:retention.summary.notScheduled'
    );
    // No window means no timeline to show — not an empty one.
    expect(container.querySelector('[data-testid="retention-timeline"]')).toBeNull();
  });

  it('WARNING: leads with what is still true, then gives the exact date', () => {
    const { container } = renderWith({ data: retention() });

    const page = container.querySelector('[data-testid="retention-page"]')!;
    expect(page.getAttribute('data-retention-state')).toBe('warning');

    // The reassurance is announced politely, as one complete phrase.
    const summary = container.querySelector('[data-testid="retention-summary"]')!;
    expect(summary.getAttribute('role')).toBe('status');
    expect(summary.getAttribute('aria-atomic')).toBe('true');
    expect(summary.textContent).toContain(
      'tenant:retention.summary.nothingDeleted'
    );
    // ...and it LEADS: the reassurance comes before the date, which is the
    // whole difference between informing someone and threatening them.
    const text = summary.textContent!;
    expect(text.indexOf('nothingDeleted')).toBeLessThan(
      text.indexOf('summary.scheduled')
    );
    expect(text).toContain('tenant:retention.summary.scheduled');

    // The exact date, rendered by the real formatter.
    expect(
      container.querySelector('[data-testid="retention-deletion-date"]')!
        .textContent
    ).toBe(DELETION_LABEL);
  });

  it('WARNING: the timeline shows which stages have passed, in words', () => {
    const { container } = renderWith({ data: retention() });

    const timeline = container.querySelector('[data-testid="retention-timeline"]')!;
    expect(timeline.tagName).toBe('OL');

    const steps = [...timeline.querySelectorAll('li[data-step]')];
    // W1–W4 plus the deletion itself.
    expect(steps.map((li) => li.getAttribute('data-step'))).toEqual([
      'retention_warning_30d',
      'retention_warning_14d',
      'retention_warning_7d',
      'retention_warning_24h',
      'deletion',
    ]);
    expect(steps[0].getAttribute('data-sent')).toBe('true');
    expect(steps[1].getAttribute('data-sent')).toBe('false');

    // Status is stated in words, so the tick is never the only signal.
    expect(steps[0].textContent).toContain('tenant:retention.timeline.sent');
    expect(steps[1].textContent).toContain('tenant:retention.timeline.upcoming');
    // And the progress is countable: "1 of 4 sent".
    expect(container.textContent).toContain(
      'tenant:retention.timeline.progress:1,4'
    );
  });

  it('HELD: reports the pause rather than a countdown', () => {
    const { container } = renderWith({
      data: retention({ state: 'held', hold: { held: true, reason: 'legal_hold' } }),
    });

    const page = container.querySelector('[data-testid="retention-page"]')!;
    expect(page.getAttribute('data-retention-state')).toBe('held');
    expect(page.getAttribute('data-retention-tone')).toBe('paused');
    expect(container.textContent).toContain('tenant:retention.summary.held');
    // The date is still shown — a hold suspends the window, it does not
    // erase it, and the owner is entitled to both facts.
    expect(
      container.querySelector('[data-testid="retention-deletion-date"]')!
        .textContent
    ).toBe(DELETION_LABEL);
  });

  it('FLAG OFF: says nothing is actually scheduled, without hiding the date', () => {
    const { container } = renderWith({
      data: retention({ state: 'scheduled', mode: 'off', warnings: [] }),
    });

    const page = container.querySelector('[data-testid="retention-page"]')!;
    expect(page.getAttribute('data-retention-mode')).toBe('off');
    expect(container.textContent).toContain('tenant:retention.modeOff');
    expect(container.textContent).toContain(
      `tenant:retention.summary.notEnabled:${DELETION_LABEL}`
    );
  });

  it('is NEVER destructive while nothing has been deleted', () => {
    const { container } = renderWith({ data: retention() });
    expect(container.querySelector('[data-retention-tone]')!.getAttribute(
      'data-retention-tone'
    )).not.toBe('destructive');
    expect(destructiveNodes(container)).toHaveLength(0);
    expect(container.textContent).toContain('tenant:retention.tiles.removedNone');
  });

  it('DOES use the destructive tokens once video has genuinely been removed', () => {
    const { container } = renderWith({
      data: retention({
        video: {
          assetCount: 1,
          storedMinutes: 10,
          storedBytes: '1000',
          deletedAssetCount: 3,
          lastDeletedAt: '2026-12-31T09:00:00.000Z',
        },
      }),
    });
    // Proves the previous case is a real constraint and not a vacuous one.
    expect(destructiveNodes(container).length).toBeGreaterThan(0);
    expect(container.textContent).toContain(
      'tenant:retention.summary.someRemoved:3'
    );
  });

  it('names the courses that would lose video', () => {
    const { container } = renderWith({ data: retention() });
    expect(container.textContent).toContain('Fire safety');
    expect(container.querySelector('table')).not.toBeNull();
  });
});
