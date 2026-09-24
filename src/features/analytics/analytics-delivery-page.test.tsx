/**
 * Analysis › Content delivery (P64 Phase 4).
 *
 * Native DOM assertions only (this repo has no jest-dom). The hook and
 * i18n are mocked the way `platform-video-metrics.test.tsx` does it; the
 * real `PlatformVideoInventory` renders so the moved detail is proven to
 * live here now.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsDeliveryPage from './pages/AnalyticsDeliveryPage';
import type { PlatformDeliveryMetrics } from '@types';
import type * as PlatformModule from '@features/platform';

const mockQuery = vi.fn();
vi.mock('@features/platform', async () => {
  // The real inventory component, pulled from its own module rather than
  // the barrel so the mock does not load every platform page.
  const inventory = await vi.importActual<
    Pick<typeof PlatformModule, 'PlatformVideoInventory'>
  >('@features/platform/components/PlatformVideoInventory');
  return {
    PlatformVideoInventory: inventory.PlatformVideoInventory,
    usePlatformDeliveryMetrics: (days: number) => mockQuery(days),
  };
});
vi.mock('@hooks', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
    i18n: { language: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
  mockQuery.mockReset();
});

function renderAt(url = '/dashboard/analytics/delivery') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AnalyticsDeliveryPage />
    </MemoryRouter>
  );
}

const data: PlatformDeliveryMetrics = {
  windowDays: 30,
  generatedAt: '2026-09-24T10:00:00.000Z',
  grants: {
    granted: 900,
    refused: 100,
    refusedByReason: { notEnrolled: 60, accessEnded: 30, deviceLimit: 10 },
    truncated: false,
  },
  video: {
    totalVideoAssets: 5,
    totalStoredMinutes: 35,
    totalStoredGb: 4,
    byTier: [
      { tier: 'normal', assets: 2, storedMinutes: 15, storedGb: 2 },
      { tier: 'premium', assets: 3, storedMinutes: 20, storedGb: 2 },
    ],
    byProvider: { r2_worker: 2, cloudflare_stream: 3 },
    processing: { pending: 0, processing: 1, ready: 4, failed: 0 },
    generatedAt: '2026-09-24T10:00:00.000Z',
  },
  retention: { contentAccessLogRowsPastWindow: 0, quizAttemptEventsPastWindow: 0 },
};

const empty: PlatformDeliveryMetrics = {
  ...data,
  grants: { granted: 0, refused: 0, refusedByReason: {}, truncated: false },
  video: {
    ...data.video,
    totalVideoAssets: 0,
    totalStoredMinutes: 0,
    totalStoredGb: 0,
    byTier: [],
    byProvider: {},
    processing: { pending: 0, processing: 0, ready: 0, failed: 0 },
  },
};

describe('AnalyticsDeliveryPage', () => {
  it('asks for the window the shared analytics range names', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    renderAt('/dashboard/analytics/delivery?range=7d');
    expect(mockQuery).toHaveBeenCalledWith(7);
  });

  it('renders a busy skeleton while loading', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    const { container } = renderAt();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText('analytics:delivery.grants.title')).toBeNull();
  });

  it('renders grants, the refusal-reason table, the video detail and retention', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderAt();

    // Granted appears in the headline tile and again in the grants section.
    expect(screen.getAllByText('900').length).toBe(2);
    // Refusals by reason is a real table, largest reason first.
    const table = screen.getByRole('table', { name: 'analytics:delivery.grants.byReason' });
    expect(table).toBeTruthy();
    const reasons = screen.getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(reasons).toEqual([
      'analytics:delivery.grants.reasons.notEnrolled:notEnrolled',
      'analytics:delivery.grants.reasons.accessEnded:accessEnded',
      'analytics:delivery.grants.reasons.deviceLimit:deviceLimit',
    ]);

    // The video detail that left the dashboard lives here now.
    expect(screen.getByText('platform:video.tierNormal')).toBeTruthy();
    expect(screen.getByText('platform:video.tierPremium')).toBeTruthy();
    expect(screen.getByText('r2_worker')).toBeTruthy();
    expect(screen.getByText('cloudflare_stream')).toBeTruthy();
    expect(screen.getByText('platform:video.status.failed')).toBeTruthy();

    // Retention says plainly that nothing is past its window.
    expect(screen.getByRole('status').textContent).toContain(
      'analytics:delivery.retention.ok'
    );

    // h2 sections, h3 subsections, no h1 (the layout owns it).
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(3);
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('says the purge job is behind when rows are past retention', () => {
    mockQuery.mockReturnValue({
      data: {
        ...data,
        retention: { contentAccessLogRowsPastWindow: 12, quizAttemptEventsPastWindow: 3 },
      },
      isLoading: false,
    });
    renderAt();
    expect(screen.getByRole('status').textContent).toContain(
      'analytics:delivery.retention.behind:15'
    );
  });

  it('announces a capped reason list in a status region', () => {
    mockQuery.mockReturnValue({
      data: { ...data, grants: { ...data.grants, truncated: true } },
      isLoading: false,
    });
    renderAt();
    const statuses = screen.getAllByRole('status').map((el) => el.textContent);
    expect(
      statuses.some((text) => text?.includes('analytics:delivery.grants.truncated'))
    ).toBe(true);
  });

  it('shows the empty state when the window has no activity', () => {
    mockQuery.mockReturnValue({ data: empty, isLoading: false });
    renderAt();
    // EmptyState passes the window as a value, which the mocked t echoes.
    expect(screen.getByText(/^analytics:delivery\.empty\.title/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders an error state with a retry that refetches', () => {
    const refetch = vi.fn();
    mockQuery.mockReturnValue({
      error: { kind: 'server', requestId: 'req_2' },
      isLoading: false,
      refetch,
    });
    renderAt();
    expect(screen.queryByText('analytics:delivery.grants.title')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common:actions.retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
