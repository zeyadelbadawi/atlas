/**
 * Observability › System health.
 *
 * Pinned: every figure comes from the response; an unverified component
 * (unknown / not_configured) never reads "Healthy" or 0; alert counts are
 * replaced by an honest notice when Alertmanager is not answering; the stale
 * indicator appears once the last successful fetch is two intervals old;
 * Arabic renders right-to-left with no raw keys.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { SystemHealthResponse } from '@types';
import { healthFixture } from './test-support/fixtures';
import { queryResult, renderPage } from './test-support/render';

const useSystemHealth = vi.fn();
vi.mock('./hooks/usePlatformObservability', () => ({
  REFRESH_INTERVAL_MS: { health: 30_000 },
  useSystemHealth: () => useSystemHealth() as unknown,
}));

const { default: HealthPage } = await import('./pages/ObservabilityHealthPage');

const URL = '/dashboard/platform/observability/health';

afterEach(() => {
  cleanup();
  useSystemHealth.mockReset();
});

function card(key: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[data-component="${key}"]`
  );
  if (!element) throw new Error(`no card for ${key}`);
  return element;
}

describe('ObservabilityHealthPage', () => {
  it('renders the overall state and every component from the response', () => {
    useSystemHealth.mockReturnValue(queryResult(healthFixture));
    const { container } = renderPage(<HealthPage />, { url: URL });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Degraded performance' })
    ).toBeTruthy();
    expect(screen.getByText('API')).toBeTruthy();
    // Details formatted by unit.
    const api = within(card('api'));
    expect(api.getByText('120 ms')).toBeTruthy();
    expect(api.getByText('1.2%')).toBeTruthy();
    expect(api.getByText('4 ms')).toBeTruthy();
    const redis = within(card('redis'));
    expect(redis.getByText('1 MB')).toBeTruthy();
    expect(redis.getByText('Latency is above its threshold.')).toBeTruthy();
    // An unknown detail key renders generically instead of crashing.
    expect(redis.getByText('someFutureDetail')).toBeTruthy();
    expect(redis.getByText('7')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformObservability:/);
  });

  it('links each active-alert count to the Alerts Center, filtered', () => {
    useSystemHealth.mockReturnValue(queryResult(healthFixture));
    renderPage(<HealthPage />, { url: URL });
    const critical = screen.getByRole('link', {
      name: /1 active Critical alert/,
    });
    expect(critical.getAttribute('href')).toBe(
      '/dashboard/platform/observability/alerts?status=active&severity=critical'
    );
    expect(
      screen
        .getByRole('link', { name: /2 active Warning alerts/ })
        .getAttribute('href')
    ).toContain('severity=warning');
  });

  it('never shows an unverified component as healthy or as zero', () => {
    useSystemHealth.mockReturnValue(queryResult(healthFixture));
    renderPage(<HealthPage />, { url: URL });

    for (const key of ['prometheus', 'alertmanager']) {
      const text = card(key).textContent ?? '';
      expect(text).not.toMatch(/Healthy/);
      expect(text).not.toMatch(/\b0\b/);
    }
    expect(card('prometheus').textContent).toMatch(/Unknown/);
    expect(card('prometheus').textContent).toMatch(/has not been verified/);
    expect(card('alertmanager').textContent).toMatch(/Not configured/);
    expect(card('alertmanager').textContent).toMatch(/nothing to check/);
    // The healthy one does say so, with its word, not colour alone.
    expect(card('api').textContent).toMatch(/Healthy/);
  });

  it('replaces the alert counts with a notice when Alertmanager is unavailable', () => {
    const data: SystemHealthResponse = {
      ...healthFixture,
      alerts: {
        source: 'unavailable',
        active: 0,
        critical: 0,
        warning: 0,
        info: 0,
      },
    };
    useSystemHealth.mockReturnValue(queryResult(data));
    renderPage(<HealthPage />, { url: URL });

    expect(
      screen.queryByRole('link', { name: /active Critical alert/ })
    ).toBeNull();
    const notice = document.querySelector('[data-source-state="unavailable"]');
    expect(notice?.textContent).toMatch(/Alertmanager is unavailable/);
    expect(notice?.textContent).not.toMatch(/\b0\b/);
  });

  it('marks the data stale once the last successful fetch is over two intervals old', () => {
    useSystemHealth.mockReturnValue(
      queryResult(healthFixture, { dataUpdatedAt: Date.now() - 61_000 })
    );
    renderPage(<HealthPage />, { url: URL });
    expect(screen.getByTestId('stale-indicator').textContent).toMatch(
      /out of date/
    );
  });

  it('is not stale within two intervals, and says so when a refetch failed', () => {
    useSystemHealth.mockReturnValue(
      queryResult(healthFixture, { dataUpdatedAt: Date.now() - 20_000 })
    );
    renderPage(<HealthPage />, { url: URL });
    expect(screen.queryByTestId('stale-indicator')).toBeNull();
    expect(screen.getByText(/^Last updated/)).toBeTruthy();
    cleanup();

    useSystemHealth.mockReturnValue(
      queryResult(healthFixture, { isError: true })
    );
    renderPage(<HealthPage />, { url: URL });
    expect(screen.getByTestId('stale-indicator').textContent).toMatch(
      /Refresh failed/
    );
  });

  it('shows a skeleton while loading and an error with retry on failure', () => {
    useSystemHealth.mockReturnValue(
      queryResult(undefined, { isLoading: true })
    );
    const { container } = renderPage(<HealthPage />, { url: URL });
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    cleanup();

    const refetch = vi.fn();
    useSystemHealth.mockReturnValue(
      queryResult(undefined, {
        isError: true,
        error: { kind: 'server' },
        refetch,
      })
    );
    renderPage(<HealthPage />, { url: URL });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders in Arabic, right-to-left, with no untranslated keys', () => {
    useSystemHealth.mockReturnValue(queryResult(healthFixture));
    const { container } = renderPage(<HealthPage />, {
      url: URL,
      language: 'ar',
    });
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(
      screen.getByRole('heading', { level: 1, name: 'صحة النظام' })
    ).toBeTruthy();
    expect(card('prometheus').textContent).toMatch(/غير معروف/);
    expect(card('prometheus').textContent).not.toMatch(/سليم/);
    expect(container.textContent).not.toMatch(
      /platformObservability:|navigation:/
    );
  });
});
