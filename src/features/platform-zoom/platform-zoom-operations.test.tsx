/**
 * Zoom Operations Center — what the operator actually sees.
 *
 * The important claims are that the pages render real state without
 * raw translation keys, that no credential material can reach the DOM,
 * and that Arabic renders Arabic. Authorization is NOT tested here
 * because it is not enforced here: `PlatformOwnerGuard` and the
 * platform-owner RLS context decide that, and both have their own
 * server-side tests.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';

const useZoomOverview = vi.fn();
const useZoomConnections = vi.fn();
const useZoomSessions = vi.fn();
const useZoomAttendance = vi.fn();
const useZoomRecordings = vi.fn();
const useZoomEvents = vi.fn();
const useZoomHealth = vi.fn();
const useZoomActivity = vi.fn();
const useZoomAcademyDetail = vi.fn();

vi.mock('./hooks/usePlatformZoom', () => ({
  useZoomOverview: () => useZoomOverview() as unknown,
  useZoomConnections: () => useZoomConnections() as unknown,
  useZoomSessions: () => useZoomSessions() as unknown,
  useZoomAttendance: () => useZoomAttendance() as unknown,
  useZoomRecordings: () => useZoomRecordings() as unknown,
  useZoomEvents: () => useZoomEvents() as unknown,
  useZoomHealth: () => useZoomHealth() as unknown,
  useZoomActivity: () => useZoomActivity() as unknown,
  useZoomAcademyDetail: () => useZoomAcademyDetail() as unknown,
}));

import ZoomOverviewPage from './pages/ZoomOverviewPage';
import ZoomConnectionsPage from './pages/ZoomConnectionsPage';
import ZoomSessionsPage from './pages/ZoomSessionsPage';
import ZoomAttendancePage from './pages/ZoomAttendancePage';
import ZoomRecordingsPage from './pages/ZoomRecordingsPage';
import ZoomEventsPage from './pages/ZoomEventsPage';
import ZoomHealthPage from './pages/ZoomHealthPage';
import ZoomActivityPage from './pages/ZoomActivityPage';
import ZoomAcademyDetailPage from './pages/ZoomAcademyDetailPage';

function renderPage(ui: JSX.Element, language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}

const overview = {
  connections: {
    connected: 3, reconnectRequired: 1, revoked: 2, expired: 0, error: 0,
    notConnected: 4, notInstalled: 5,
  },
  sessions: { live: 1, upcoming: 6, ended: 10, cancelled: 2, failed: 3, unprovisioned: 2 },
  events: { received: 5, processed: 40, unmatched: 2, failed: 1 },
  needsAttention: [
    { kind: 'connection.revoked', severity: 'critical' as const, count: 2 },
    { kind: 'event.failed', severity: 'warning' as const, count: 1 },
  ],
  upcomingAtRisk: [
    {
      id: 's1', title: 'Algebra live', academyId: 'a1', academyName: 'Acme Academy',
      organizationName: 'Acme', status: 'scheduled' as const,
      scheduledStartAt: '2026-09-20T10:00:00Z', scheduledEndAt: '2026-09-20T11:00:00Z',
      provisioned: false, recordingEnabled: false, reconciliationAttempts: 0,
      atRisk: true, riskReason: 'unprovisioned',
    },
  ],
  recentActivity: [
    { id: 'e1', action: 'live_provider.deauthorized', occurredAt: '2026-09-15T09:00:00Z' },
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Zoom Operations — Overview', () => {
  it('renders real counts and the attention list', () => {
    useZoomOverview.mockReturnValue({ data: overview, isLoading: false });
    const { container } = renderPage(<ZoomOverviewPage />);

    expect(screen.getByText('Zoom operations')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText(/Zoom access was revoked/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('shows an at-risk session with its stored reason', () => {
    useZoomOverview.mockReturnValue({ data: overview, isLoading: false });
    renderPage(<ZoomOverviewPage />);
    expect(screen.getByText('Algebra live')).toBeTruthy();
    expect(screen.getAllByText(/No Zoom meeting/i).length).toBeGreaterThan(0);
  });

  it('renders in Arabic with no missing keys', () => {
    useZoomOverview.mockReturnValue({ data: overview, isLoading: false });
    const { container } = renderPage(<ZoomOverviewPage />, 'ar');
    expect(container.textContent).not.toMatch(/platformZoom:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});

describe('Zoom Operations — Connections', () => {
  const page = {
    items: [
      {
        academyId: 'a1', academyName: 'Acme Academy', organizationId: 'o1',
        organizationName: 'Acme Org', addOnInstalled: true, status: 'revoked' as const,
        maskedAccountId: 'abc••••xyz', connectedAt: '2026-09-01T00:00:00Z',
        lastCheckedAt: '2026-09-10T00:00:00Z', lastCheckReason: 'app_deauthorized',
        hasIssue: true,
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };

  it('renders the masked account id and never a credential', () => {
    useZoomConnections.mockReturnValue({ data: page, isLoading: false });
    const { container } = renderPage(<ZoomConnectionsPage />);

    expect(screen.getByText('abc••••xyz')).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /access_token|refresh_token|client_secret|encryptedCredentials/i,
    );
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('translates the stored failure reason rather than showing the raw code', () => {
    useZoomConnections.mockReturnValue({ data: page, isLoading: false });
    renderPage(<ZoomConnectionsPage />);
    expect(screen.getByText(/Removed in Zoom/i)).toBeTruthy();
  });

  it('renders an empty state when nothing matches', () => {
    useZoomConnections.mockReturnValue({
      data: { items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } },
      isLoading: false,
    });
    renderPage(<ZoomConnectionsPage />);
    expect(screen.getByText(/No connections match/i)).toBeTruthy();
  });

  it('renders in Arabic with no missing keys', () => {
    useZoomConnections.mockReturnValue({ data: page, isLoading: false });
    const { container } = renderPage(<ZoomConnectionsPage />, 'ar');
    expect(container.textContent).not.toMatch(/platformZoom:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});

describe('Zoom Operations — Live Sessions', () => {
  const page = {
    items: [
      {
        id: 's1', title: 'Algebra live', academyId: 'a1', academyName: 'Acme Academy',
        organizationName: 'Acme Org', courseTitle: 'Algebra I', hostName: 'Sarah',
        status: 'scheduled' as const, scheduledStartAt: '2026-09-20T10:00:00Z',
        scheduledEndAt: '2026-09-20T11:00:00Z', provisioned: false,
        recordingEnabled: true, recordingStatus: 'processing',
        reconciliationAttempts: 0, atRisk: true, riskReason: 'unprovisioned',
      },
    ],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };

  it('renders operational state including the risk badge', () => {
    useZoomSessions.mockReturnValue({ data: page, isLoading: false });
    const { container } = renderPage(<ZoomSessionsPage />);

    expect(screen.getByText('Algebra live')).toBeTruthy();
    expect(screen.getByText('Algebra I')).toBeTruthy();
    expect(screen.getByText(/Not created/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('never renders token material', () => {
    useZoomSessions.mockReturnValue({ data: page, isLoading: false });
    const { container } = renderPage(<ZoomSessionsPage />);
    expect(container.textContent).not.toMatch(
      /access_token|refresh_token|signature|client_secret/i,
    );
  });

  it('renders in Arabic with no missing keys', () => {
    useZoomSessions.mockReturnValue({ data: page, isLoading: false });
    const { container } = renderPage(<ZoomSessionsPage />, 'ar');
    expect(container.textContent).not.toMatch(/platformZoom:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});

describe('Zoom Operations — Part 2 pages', () => {
  const paged = (items) => ({ items, pagination: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 } });

  it('Attendance renders derived reconciliation state, no raw keys', () => {
    useZoomAttendance.mockReturnValue({ data: paged([{
      sessionId: 's1', title: 'Recon Session', academyName: 'Acme', organizationName: 'Acme Org',
      status: 'ended', scheduledStartAt: '2026-09-10T10:00:00Z', reconciliationAttempts: 0,
      participantCount: 12, reconciliationState: 'reconciled',
    }]), isLoading: false });
    const { container } = renderPage(<ZoomAttendancePage />);
    expect(screen.getByText('Recon Session')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('Recordings shows quota flag from quotaConsumed and no secrets', () => {
    useZoomRecordings.mockReturnValue({ data: paged([{
      recordingId: 'r1', sessionId: 's1', title: 'Rec', academyName: 'Acme', organizationName: 'Acme Org',
      status: 'available', fileCount: 3, quotaConsumed: true, createdAt: '2026-09-10T10:00:00Z',
    }]), isLoading: false });
    const { container } = renderPage(<ZoomRecordingsPage />);
    expect(screen.getByText('Rec')).toBeTruthy();
    expect(screen.getByText('Counted')).toBeTruthy();
    expect(container.textContent).not.toMatch(/access_token|refresh_token|platformZoom:/);
  });

  it('Events renders health tiles and rows', () => {
    useZoomEvents.mockReturnValue({ data: {
      ...paged([{ id: 'e1', eventType: 'meeting.started', status: 'processed', receivedAt: '2026-09-10T10:00:00Z' }]),
      health: { received: 2, processed: 40, unmatched: 1, failed: 0, byType: [{ eventType: 'meeting.started', count: 20 }] },
    }, isLoading: false });
    const { container } = renderPage(<ZoomEventsPage />);
    expect(screen.getByText('meeting.started')).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('Health renders issue groups with sample academy links', () => {
    useZoomHealth.mockReturnValue({ data: { groups: [
      { kind: 'connection.revoked', severity: 'critical', count: 2, samples: [{ academyId: 'a1', academyName: 'Acme' }] },
    ] }, isLoading: false });
    const { container } = renderPage(<ZoomHealthPage />);
    expect(screen.getByText(/Zoom access was revoked/i)).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('Health shows all-clear empty state', () => {
    useZoomHealth.mockReturnValue({ data: { groups: [] }, isLoading: false });
    renderPage(<ZoomHealthPage />);
    expect(screen.getByText(/All clear/i)).toBeTruthy();
  });

  it('Activity lists the real audit actions', () => {
    useZoomActivity.mockReturnValue({ data: paged([
      { id: 'e1', action: 'live_provider.deauthorized', occurredAt: '2026-09-10T10:00:00Z' },
    ]), isLoading: false });
    const { container } = renderPage(<ZoomActivityPage />);
    expect(screen.getAllByText(/Zoom access removed by the customer/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/platformZoom:/);
  });

  it('Academy detail renders quota and masked account, no secrets', () => {
    useZoomAcademyDetail.mockReturnValue({ data: {
      academyId: 'a1', academyName: 'Acme Academy', organizationId: 'o1', organizationName: 'Acme Org',
      addOnInstalled: true,
      connection: { status: 'connected', maskedAccountId: 'abc••••xyz' },
      sessions: { upcoming: 3, live: 1, ended: 10, failed: 0, atRisk: 1 },
      attendance: { reconciled: 8, pending: 2 },
      recordings: { available: 4, processing: 1, failed: 0, quotaUsed: 4, quotaLimit: 5, quotaRemaining: 1 },
      upcomingAtRisk: [], recentActivity: [],
    }, isLoading: false });
    const { container } = renderPage(<ZoomAcademyDetailPage />);
    expect(screen.getByText('Acme Academy')).toBeTruthy();
    expect(screen.getByText('4 / 5')).toBeTruthy();
    expect(screen.getByText('abc••••xyz')).toBeTruthy();
    expect(container.textContent).not.toMatch(/access_token|refresh_token|encryptedCredentials|platformZoom:/);
  });

  it('Academy detail renders in Arabic with no missing keys', () => {
    useZoomAcademyDetail.mockReturnValue({ data: {
      academyId: 'a1', academyName: 'Acme', organizationId: 'o1', organizationName: 'Org',
      addOnInstalled: true, connection: { status: 'connected' },
      sessions: { upcoming: 0, live: 0, ended: 0, failed: 0, atRisk: 0 },
      attendance: { reconciled: 0, pending: 0 },
      recordings: { available: 0, processing: 0, failed: 0, quotaUsed: 0, quotaLimit: 'unlimited', quotaRemaining: null },
      upcomingAtRisk: [], recentActivity: [],
    }, isLoading: false });
    const { container } = renderPage(<ZoomAcademyDetailPage />, 'ar');
    expect(container.textContent).not.toMatch(/platformZoom:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
