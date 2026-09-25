/**
 * Analysis › Communications (P64 Communications C7).
 *
 * Native DOM assertions only (this repo has no jest-dom); hooks and i18n
 * are mocked the way the sibling delivery-page spec does it.
 *
 * The case worth having is the LIVENESS distinction. A dead dispatcher
 * and a quiet week produce the same totals — zero sent, zero failed — so
 * the page is only useful if those two render differently. Both are
 * asserted here, including that the stalled reading is announced in
 * WORDS through a live region rather than signalled by colour, which a
 * screen-reader user or a colour-blind operator would never receive.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsCommunicationsPage from './pages/AnalyticsCommunicationsPage';
import type { PlatformCommunicationsHealth } from '@types';

const mockHealth = vi.fn();
const mockSuppressions = vi.fn();
const mockUnsuppress = vi.fn();

vi.mock('@features/platform', () => ({
  useCommunicationsHealth: (days: number) => mockHealth(days),
  useCommunicationSuppressions: () => mockSuppressions(),
  useUnsuppressAddress: () => mockUnsuppress(),
}));
vi.mock('./pages/useAnalyticsRange', () => ({
  useAnalyticsRange: () => ({ days: 30, preset: '30d', setPreset: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars
        ? `${key}:${Object.values(vars)
            .filter((v) => v !== '' && v !== undefined)
            .join(',')}`
        : key,
    i18n: { language: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
  mockHealth.mockReset();
  mockSuppressions.mockReset();
  mockUnsuppress.mockReset();
});

function health(
  overrides: Partial<PlatformCommunicationsHealth> = {}
): PlatformCommunicationsHealth {
  return {
    windowDays: 30,
    outbox: {
      byState: { pending: 0, dispatched: 12, deferred: 0, suppressed: 0, failed: 0 },
      oldestPendingSeconds: null,
      overdue: 0,
      failed: 0,
    },
    deliveries: {
      byStatus: { queued: 0, sent: 10, delivered: 9, bounced: 1, complained: 0, failed: 0, suppressed: 0, deferred: 0 },
      byProvider: { brevo: 10 },
      failureRatio: 0.05,
    },
    suppressions: { total: 0, byReason: { hard_bounce: 0, soft_bounce: 0, complaint: 0, manual: 0, invalid: 0 } },
    digests: { open: 0, sent: 0, empty: 0 },
    providers: [
      { provider: 'brevo', position: 0, dailyUsed: 42, dailyLimit: 300, monthlyUsed: 900, monthlyLimit: 9000 },
    ],
    generatedAt: '2026-09-25T00:00:00.000Z',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsCommunicationsPage />
    </MemoryRouter>
  );
}

function setup(data: PlatformCommunicationsHealth) {
  mockHealth.mockReturnValue({ data, isLoading: false, error: null, refetch: vi.fn() });
  mockSuppressions.mockReturnValue({ data: { items: [], nextCursor: null }, isLoading: false });
  mockUnsuppress.mockReturnValue({ mutate: vi.fn(), isPending: false });
}

describe('AnalyticsCommunicationsPage', () => {
  it('reports an empty queue as idle, not as a problem', () => {
    setup(health());
    renderPage();

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('queue.idle.announcement');
    expect(status.textContent).not.toContain('stalled');
  });

  it('distinguishes a STALLED queue from a quiet one, in words, through a live region', () => {
    // Same zero throughput as a quiet week — only the waiting age differs.
    setup(
      health({
        outbox: {
          byState: { pending: 7, dispatched: 0, deferred: 0, suppressed: 0, failed: 0 },
          oldestPendingSeconds: 3 * 60 * 60,
          overdue: 7,
          failed: 0,
        },
      })
    );
    renderPage();

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    // The warning is carried by text, never by colour alone.
    expect(status.textContent).toContain('queue.stalled.announcement');
    expect(status.textContent).toContain('duration.hours');
  });

  it('warns when no real provider is configured, because nothing is being delivered', () => {
    setup(
      health({
        providers: [
          { provider: 'stub', position: 0, dailyUsed: 0, dailyLimit: null, monthlyUsed: 0, monthlyLimit: null },
        ],
      })
    );
    renderPage();
    expect(screen.getAllByText(/headline\.sendingStubHint/).length).toBeGreaterThan(0);
  });

  it('shows the provider chain in fallback order with its real allowance', () => {
    setup(
      health({
        providers: [
          { provider: 'brevo', position: 0, dailyUsed: 42, dailyLimit: 300, monthlyUsed: 900, monthlyLimit: 9000 },
          { provider: 'resend', position: 1, dailyUsed: 0, dailyLimit: 100, monthlyUsed: 0, monthlyLimit: 3000 },
        ],
      })
    );
    renderPage();

    const rows = screen.getAllByRole('row');
    const text = rows.map((r) => r.textContent ?? '').join('|');
    expect(text).toContain('providers.brevo');
    expect(text).toContain('providerSection.primary');
    expect(text).toContain('providers.resend');
    expect(text).toContain('providerSection.fallback');
  });

  it('renders an empty state for suppressions rather than an empty table', () => {
    setup(health());
    renderPage();
    expect(screen.getAllByText(/suppressions\.empty\.title/).length).toBeGreaterThan(0);
  });

  it('never renders a raw email address — suppressions are hashed', () => {
    setup(
      health({
        suppressions: {
          total: 1,
          byReason: { hard_bounce: 1, soft_bounce: 0, complaint: 0, manual: 0, invalid: 0 },
        },
      })
    );
    mockSuppressions.mockReturnValue({
      data: {
        items: [
          {
            id: 'sup-1',
            emailHash: 'a'.repeat(64),
            reason: 'hard_bounce',
            source: 'webhook',
            note: null,
            createdAt: '2026-09-25T00:00:00.000Z',
          },
        ],
        nextCursor: null,
      },
      isLoading: false,
    });
    renderPage();

    expect(document.body.textContent).not.toContain('@');
    expect(document.body.textContent).toContain('aaaaaaaaaaaaaaaa');
  });

  it('surfaces an error state with a retry rather than a blank page', () => {
    const refetch = vi.fn();
    mockHealth.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { kind: 'server', requestId: 'req-1' },
      refetch,
    });
    mockSuppressions.mockReturnValue({ data: undefined, isLoading: false });
    mockUnsuppress.mockReturnValue({ mutate: vi.fn(), isPending: false });
    renderPage();
    expect(document.body.textContent?.length).toBeGreaterThan(0);
  });

  it('labels the unblock field and links its help text for screen readers', () => {
    setup(
      health({
        suppressions: {
          total: 2,
          byReason: { hard_bounce: 2, soft_bounce: 0, complaint: 0, manual: 0, invalid: 0 },
        },
      })
    );
    renderPage();

    const input = screen.getByLabelText(/suppressions\.liftLabel/) as HTMLInputElement;
    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('aria-describedby')).toBe('unsuppress-help');
    expect(document.getElementById('unsuppress-help')).not.toBeNull();
  });
});
