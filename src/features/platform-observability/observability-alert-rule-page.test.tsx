/**
 * Observability › Alerts › rule detail — the page Slack's "View Alert" opens.
 *
 * Pinned: the rule name comes from the path; the definition, current value,
 * instances and tenants render from the response; the timeline lists ONLY
 * the events returned (nothing inferred from startsAt/endsAt); a 404 shows
 * "not found" rather than a generic error.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import type { AlertRuleDetailResponse } from '@types';
import { alertItem, ruleFixture } from './test-support/fixtures';
import { queryResult, renderPage } from './test-support/render';

const useAlertRule = vi.fn();
vi.mock('./hooks/usePlatformObservability', () => ({
  REFRESH_INTERVAL_MS: { alertRule: 30_000 },
  useAlertRule: (rule: string, range: string) =>
    useAlertRule(rule, range) as unknown,
}));
vi.mock('@/components/ui/select', () => import('./test-support/select-mock'));

const { default: RulePage } =
  await import('./pages/ObservabilityAlertRulePage');

const PATH = '/dashboard/platform/observability/alerts/:ruleName';

function renderRule(
  data: unknown,
  url = '/dashboard/platform/observability/alerts/HighErrorRate',
  extra = {}
) {
  useAlertRule.mockReturnValue(queryResult(data, extra));
  return renderPage(<RulePage />, { url, path: PATH });
}

afterEach(() => {
  cleanup();
  useAlertRule.mockReset();
});

describe('ObservabilityAlertRulePage', () => {
  it('requests the rule named in the path, over the range in the URL', () => {
    renderRule(
      ruleFixture,
      '/dashboard/platform/observability/alerts/HighErrorRate?range=6h'
    );
    expect(useAlertRule).toHaveBeenLastCalledWith('HighErrorRate', '6h');
  });

  it('renders the rule definition and its current state from the response', () => {
    const { container } = renderRule(ruleFixture);
    expect(
      screen.getByRole('heading', { level: 1, name: 'HighErrorRate' })
    ).toBeTruthy();
    expect(screen.getByText('> 5% for 5 minutes')).toBeTruthy();
    expect(screen.getByText('5 min')).toBeTruthy();
    expect(screen.getAllByText('Managed in code').length).toBeGreaterThan(0);
    const expression = screen.getByLabelText('Expression');
    expect(expression.tagName).toBe('PRE');
    expect(expression.getAttribute('dir')).toBe('ltr');
    expect(expression.textContent).toBe(ruleFixture.rule.expression);
    expect(
      screen.getByRole('button', { name: 'Copy expression' })
    ).toBeTruthy();
    expect(screen.getByText('0.0712')).toBeTruthy();
    expect(screen.getByText('Cairo Coding Academy')).toBeTruthy();
    expect(screen.getByText('organization_id=org-9')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformObservability:/);
  });

  it('shows only the timeline events the API returned', () => {
    // The instance has resolved (endsAt set) but the API returned only the
    // trigger event — the page must not invent a "Resolved" entry.
    const data: AlertRuleDetailResponse = {
      ...ruleFixture,
      instances: [
        alertItem({ endsAt: '2026-09-26T09:50:00.000Z', status: 'resolved' }),
      ],
      timeline: [
        { at: '2026-09-26T09:30:00.000Z', kind: 'triggered', alertId: 'a1' },
      ],
    };
    renderRule(data);
    const timeline = screen.getByTestId('timeline');
    const events = within(timeline).getAllByRole('listitem');
    expect(events).toHaveLength(1);
    expect(events[0].textContent).toMatch('Triggered');
    expect(timeline.textContent).not.toMatch('Resolved');
  });

  it('lists several events newest first', () => {
    renderRule({
      ...ruleFixture,
      timeline: [
        { at: '2026-09-26T08:00:00.000Z', kind: 'triggered', alertId: 'a0' },
        { at: '2026-09-26T08:20:00.000Z', kind: 'resolved', alertId: 'a0' },
        { at: '2026-09-26T09:29:00.000Z', kind: 'pending', alertId: 'a1' },
      ],
    });
    const events = within(screen.getByTestId('timeline')).getAllByRole(
      'listitem'
    );
    expect(
      events.map((event) => event.querySelector('p')?.textContent)
    ).toEqual(['Pending', 'Resolved', 'Triggered']);
  });

  it('says there are no events rather than drawing an empty timeline', () => {
    renderRule({ ...ruleFixture, timeline: [] });
    expect(screen.getByTestId('timeline-empty').textContent).toMatch(
      'No events'
    );
    expect(screen.queryByTestId('timeline')).toBeNull();
  });

  it('does not show a current value when Prometheus is unavailable', () => {
    const { container } = renderRule({
      ...ruleFixture,
      sources: { alertmanager: 'ok', prometheus: 'unavailable' },
      currentValues: [],
      expressionSeries: [],
    });
    expect(container.textContent).toMatch('Prometheus is unavailable');
    expect(screen.getAllByText(/Prometheus must answer/).length).toBe(2);
  });

  it('shows "not found" for an unknown rule', () => {
    renderRule(undefined, '/dashboard/platform/observability/alerts/Nope', {
      isError: true,
      error: { kind: 'notFound' },
    });
    expect(screen.getByText('Alert rule not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Alerts' })).toBeTruthy();
  });

  it('renders in Arabic, right-to-left, keeping the expression left-to-right', () => {
    useAlertRule.mockReturnValue(queryResult(ruleFixture));
    const view = renderPage(<RulePage />, {
      url: '/dashboard/platform/observability/alerts/HighErrorRate',
      path: PATH,
      language: 'ar',
    });
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(screen.getByText('الخط الزمني')).toBeTruthy();
    expect(screen.getByLabelText('التعبير').getAttribute('dir')).toBe('ltr');
    expect(view.container.textContent).not.toMatch(
      /platformObservability:|navigation:/
    );
  });
});
