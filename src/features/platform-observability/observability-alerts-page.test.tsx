/**
 * Observability › Alerts.
 *
 * Pinned: rows come from the response and link to the rule-detail path
 * Slack uses; every filter is read from and written to the URL and sent to
 * the server; "no alerts" and "sources unavailable" are distinct states.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from '@testing-library/react';
import type { AlertsResponse } from '@types';
import { alertsFixture } from './test-support/fixtures';
import { queryResult, renderPage } from './test-support/render';

const useAlerts = vi.fn();
vi.mock('./hooks/usePlatformObservability', () => ({
  REFRESH_INTERVAL_MS: { alerts: 30_000 },
  useAlerts: (query: unknown) => useAlerts(query) as unknown,
}));
vi.mock('@/components/ui/select', () => import('./test-support/select-mock'));

const { default: AlertsPage } = await import('./pages/ObservabilityAlertsPage');

const BASE = '/dashboard/platform/observability/alerts';

afterEach(() => {
  cleanup();
  useAlerts.mockReset();
  vi.useRealTimers();
});

function lastQuery(): Record<string, unknown> {
  return useAlerts.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

function location(): string {
  return screen.getByTestId('location').textContent ?? '';
}

describe('ObservabilityAlertsPage', () => {
  it('renders each alert with rule, severity, status, service, duration and tenants', () => {
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    const { container } = renderPage(<AlertsPage />, { url: BASE });

    const table = screen.getByRole('table', {
      name: 'Alerts in the selected period',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    const first = within(rows[1]);
    expect(
      first.getByRole('link', { name: 'HighErrorRate' }).getAttribute('href')
    ).toBe('/dashboard/platform/observability/alerts/HighErrorRate');
    expect(first.getByText('Critical')).toBeTruthy();
    expect(first.getByText('Firing')).toBeTruthy();
    expect(first.getByText('Ongoing · 30 min')).toBeTruthy();
    expect(first.getByText('None named')).toBeTruthy();
    const second = within(rows[2]);
    expect(second.getByText('Resolved')).toBeTruthy();
    expect(second.getByText('45 min')).toBeTruthy();
    expect(second.getByText('2 tenants')).toBeTruthy();
    expect(
      screen.getByText(/History available since 11 Sep 2026/)
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformObservability:/);
  });

  it('reads the filters from the URL and sends them to the server', () => {
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    renderPage(<AlertsPage />, {
      url: `${BASE}?status=active&severity=critical&range=7d`,
    });
    expect(lastQuery()).toEqual({
      status: 'active',
      severity: 'critical',
      range: '7d',
    });
    expect(
      (screen.getByRole('combobox', { name: 'Severity' }) as HTMLSelectElement)
        .value
    ).toBe('critical');
  });

  it('ignores unknown filter values instead of sending them', () => {
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    renderPage(<AlertsPage />, {
      url: `${BASE}?status=bogus&severity=fatal&range=1y`,
    });
    expect(lastQuery()).toEqual({ status: 'all', range: '24h' });
  });

  it('updates the URL and the request when a filter changes', () => {
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    renderPage(<AlertsPage />, { url: BASE });

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'resolved' },
    });
    expect(location()).toContain('status=resolved');
    expect(lastQuery()).toMatchObject({ status: 'resolved' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Time range' }), {
      target: { value: '30d' },
    });
    expect(location()).toContain('range=30d');
    expect(lastQuery()).toMatchObject({ status: 'resolved', range: '30d' });

    const rule = screen.getByRole('searchbox', { name: 'Rule' });
    fireEvent.change(rule, { target: { value: 'QueueBacklog' } });
    fireEvent.keyDown(rule, { key: 'Enter' });
    expect(location()).toContain('rule=QueueBacklog');
    expect(lastQuery()).toMatchObject({ rule: 'QueueBacklog' });
  });

  it('commits a typed rule after the debounce without Enter', () => {
    vi.useFakeTimers();
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    renderPage(<AlertsPage />, { url: BASE });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rule' }), {
      target: { value: 'HighErrorRate' },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(location()).toContain('rule=HighErrorRate');
  });

  it('says "No alerts in this period" when the sources answered with nothing', () => {
    useAlerts.mockReturnValue(queryResult({ ...alertsFixture, items: [] }));
    renderPage(<AlertsPage />, { url: BASE });
    expect(screen.getByTestId('alerts-empty').textContent).toMatch(
      'No alerts in this period'
    );
    expect(screen.queryByTestId('alerts-unavailable')).toBeNull();
  });

  it('says the history is unavailable — not "no alerts" — when no source answered', () => {
    const data: AlertsResponse = {
      ...alertsFixture,
      items: [],
      sources: { alertmanager: 'unavailable', prometheus: 'not_configured' },
    };
    useAlerts.mockReturnValue(queryResult(data));
    const { container } = renderPage(<AlertsPage />, { url: BASE });
    expect(screen.getByTestId('alerts-unavailable').textContent).toMatch(
      'Alert history unavailable'
    );
    expect(container.textContent).not.toMatch('No alerts in this period');
    expect(container.textContent).toMatch('Alertmanager is unavailable');
    expect(container.textContent).toMatch('Prometheus is not configured');
  });

  it('renders the alert list in Arabic, right-to-left', () => {
    useAlerts.mockReturnValue(queryResult(alertsFixture));
    const { container } = renderPage(<AlertsPage />, {
      url: BASE,
      language: 'ar',
    });
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(
      screen.getByRole('heading', { level: 1, name: 'التنبيهات' })
    ).toBeTruthy();
    expect(screen.getAllByText('حرج').length).toBeGreaterThan(0);
    expect(screen.getAllByText('مستأجران').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(
      /platformObservability:|navigation:/
    );
  });
});
