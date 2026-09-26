/**
 * Observability › Metrics.
 *
 * Pinned: metrics are grouped by domain; an unavailable metric is shown as
 * "Not available — not instrumented or not scraped yet" and never requests
 * a series; available metrics request their own series for the selected
 * range; multi-label series get a legend; the table view prints values
 * (percent ratios as %) and a null point as "Not reported", not 0.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { MetricCatalogResponse } from '@types';
import { catalogFixture, seriesFixture } from './test-support/fixtures';
import { queryResult, renderPage } from './test-support/render';

const useMetricCatalog = vi.fn();
const useMetricSeries = vi.fn();
vi.mock('./hooks/usePlatformObservability', () => ({
  REFRESH_INTERVAL_MS: { metrics: 60_000 },
  useMetricCatalog: () => useMetricCatalog() as unknown,
  useMetricSeries: (id: string, range: string, enabled: boolean) =>
    useMetricSeries(id, range, enabled) as unknown,
}));
vi.mock('@/components/ui/select', () => import('./test-support/select-mock'));

const { default: MetricsPage } =
  await import('./pages/ObservabilityMetricsPage');

const URL = '/dashboard/platform/observability/metrics';

function setup(catalog: MetricCatalogResponse = catalogFixture) {
  useMetricCatalog.mockReturnValue(queryResult(catalog));
  useMetricSeries.mockImplementation((id: string) =>
    queryResult(seriesFixture(catalog.metrics.find((m) => m.id === id)!))
  );
}

function metricCard(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-metric="${id}"]`);
  if (!element) throw new Error(`no card for ${id}`);
  return element;
}

afterEach(() => {
  cleanup();
  useMetricCatalog.mockReset();
  useMetricSeries.mockReset();
});

describe('ObservabilityMetricsPage', () => {
  it('groups metrics by domain with translated names', () => {
    setup();
    const { container } = renderPage(<MetricsPage />, { url: URL });
    expect(screen.getByRole('heading', { level: 2, name: 'API' })).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Background jobs' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Learning' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Server error rate (5xx)' })
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformObservability:/);
  });

  it('shows an unavailable metric honestly and never requests its series', () => {
    setup();
    renderPage(<MetricsPage />, { url: URL });
    const card = metricCard('learning.integrityEvents');
    expect(card.textContent).toMatch(
      'Not available — not instrumented or not scraped yet.'
    );
    expect(card.querySelector('figure')).toBeNull();
    expect(card.textContent).not.toMatch(/\b0\b/);
    expect(useMetricSeries.mock.calls.map(([id]) => id)).not.toContain(
      'learning.integrityEvents'
    );
  });

  it('requests each available series for the range in the URL', () => {
    setup();
    renderPage(<MetricsPage />, { url: `${URL}?range=7d` });
    expect(useMetricSeries).toHaveBeenCalledWith(
      'api.errorRate5xx',
      '7d',
      true
    );
    expect(useMetricSeries).toHaveBeenCalledWith('jobs.waiting', '7d', true);

    fireEvent.change(screen.getByRole('combobox', { name: 'Time range' }), {
      target: { value: '1h' },
    });
    expect(useMetricSeries).toHaveBeenLastCalledWith(
      expect.any(String),
      '1h',
      true
    );
  });

  it('shows the latest value by unit and a legend for multi-label series', () => {
    setup();
    renderPage(<MetricsPage />, { url: URL });
    // 0.034 is a ratio → 3.4%.
    expect(
      within(metricCard('api.errorRate5xx')).getByText('3.4%')
    ).toBeTruthy();
    const legend = within(metricCard('jobs.waiting')).getByRole('list', {
      name: 'Series',
    });
    expect(within(legend).getByText('queue=email')).toBeTruthy();
    expect(within(legend).getByText('queue=video')).toBeTruthy();
  });

  it('prints a null point as "Not reported" in the table view, never 0', () => {
    setup();
    renderPage(<MetricsPage />, { url: URL });
    const card = within(metricCard('jobs.waiting'));
    fireEvent.click(card.getByRole('button', { name: 'Show as table' }));
    const table = card.getByRole('table', { name: 'Waiting jobs' });
    const cells = within(table)
      .getAllByRole('cell')
      .map((cell) => cell.textContent);
    expect(cells).toEqual(['3', '1', '5', 'Not reported']);
  });

  it('states when the metrics source is unavailable', () => {
    setup({ ...catalogFixture, source: 'unavailable', metrics: [] });
    const { container } = renderPage(<MetricsPage />, { url: URL });
    expect(container.textContent).toMatch('Prometheus is unavailable');
  });

  it('renders in Arabic, right-to-left', () => {
    setup();
    const { container } = renderPage(<MetricsPage />, {
      url: URL,
      language: 'ar',
    });
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(metricCard('learning.integrityEvents').textContent).toMatch(
      'غير متاح'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'المهام الخلفية' })
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /platformObservability:|navigation:/
    );
  });
});
