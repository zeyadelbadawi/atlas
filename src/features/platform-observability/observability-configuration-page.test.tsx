/**
 * Observability › Monitoring & alerts.
 *
 * Pinned: scrape mode, Slack state and counts come from the response and a
 * webhook URL is never shown; a channel whose source is down shows a notice
 * instead of zeros; the synthetic alert is armed ONLY after confirmation,
 * with exactly `{minutes}`; cancelling sends nothing; out-of-range minutes
 * never reach the API; "Resolve now" is confirmed too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { MonitoringConfigurationResponse } from '@types';
import { configurationFixture } from './test-support/fixtures';
import { queryResult, renderPage } from './test-support/render';

const useMonitoringConfiguration = vi.fn();
const armMutate = vi.fn();
const resolveMutate = vi.fn();
const confirm = vi.fn<(request: Record<string, unknown>) => Promise<boolean>>();
const idle = { isPending: false, error: null, reset: vi.fn() };

vi.mock('./hooks/usePlatformObservability', () => ({
  REFRESH_INTERVAL_MS: { configuration: 30_000 },
  useMonitoringConfiguration: () => useMonitoringConfiguration() as unknown,
  useArmSyntheticAlert: () => ({ ...idle, mutate: armMutate }),
  useResolveSyntheticAlert: () => ({ ...idle, mutate: resolveMutate }),
}));
vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm }),
}));

const { default: ConfigurationPage } =
  await import('./pages/ObservabilityConfigurationPage');

const URL = '/dashboard/platform/observability/configuration';

function renderWith(
  data: MonitoringConfigurationResponse = configurationFixture,
  language: 'en' | 'ar' = 'en'
) {
  useMonitoringConfiguration.mockReturnValue(queryResult(data));
  return renderPage(<ConfigurationPage />, { url: URL, language });
}

beforeEach(() => {
  confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ObservabilityConfigurationPage', () => {
  it('renders scrape mode, Slack delivery counts and the read-only rules', () => {
    const { container } = renderWith();
    expect(screen.getByText('Bearer token')).toBeTruthy();
    const slack = container.querySelector<HTMLElement>(
      '[data-channel="slack"]'
    )!;
    expect(slack.textContent).toMatch('Connected');
    expect(within(slack).getByText('12')).toBeTruthy();
    expect(within(slack).getByText('1')).toBeTruthy();
    const rules = screen.getByRole('table', { name: 'Alert rules' });
    expect(
      within(rules)
        .getByRole('link', { name: 'QueueBacklog' })
        .getAttribute('href')
    ).toBe('/dashboard/platform/observability/alerts/QueueBacklog');
    expect(screen.getAllByText('Managed in code').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/https?:\/\//);
    expect(container.textContent).not.toMatch(/platformObservability:/);
  });

  it('shows Slack as not connected without delivery counts', () => {
    const { container } = renderWith({
      ...configurationFixture,
      channels: [
        {
          kind: 'slack',
          configured: false,
          source: 'ok',
          sent24h: null,
          failed24h: null,
        },
      ],
    });
    const slack = container.querySelector<HTMLElement>(
      '[data-channel="slack"]'
    )!;
    expect(slack.textContent).toMatch('Not connected');
    expect(slack.querySelector('[data-tone="healthy"]')).toBeNull();
    expect(slack.textContent).not.toMatch(/\b0\b/);
  });

  it('replaces channel counts with a notice when Alertmanager is unavailable', () => {
    const { container } = renderWith({
      ...configurationFixture,
      channels: [
        {
          kind: 'slack',
          configured: false,
          source: 'unavailable',
          sent24h: null,
          failed24h: null,
        },
      ],
    });
    const slack = container.querySelector<HTMLElement>(
      '[data-channel="slack"]'
    )!;
    expect(slack.textContent).toMatch('Alertmanager is unavailable');
    expect(slack.textContent).not.toMatch(/Sent \(24 h\)/);
    expect(slack.textContent).not.toMatch(/\b0\b/);
  });

  it('arms the synthetic alert with {minutes} only after confirmation', async () => {
    renderWith();
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fire test alert' }));
    await waitFor(() => expect(armMutate).toHaveBeenCalledWith(15));
    const request = confirm.mock.calls[0][0];
    expect(request.titleKey).toBe(
      'platformObservability:configuration.synthetic.confirmArm.title'
    );
    expect(request.values).toEqual({ count: 15 });
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    confirm.mockResolvedValue(false);
    renderWith();
    fireEvent.click(screen.getByRole('button', { name: 'Fire test alert' }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(armMutate).not.toHaveBeenCalled();
  });

  it('never sends out-of-range minutes', () => {
    renderWith();
    fireEvent.change(screen.getByLabelText('Duration (minutes)'), {
      target: { value: '3' },
    });
    const button = screen.getByRole('button', {
      name: 'Fire test alert',
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(
      screen.getByText('Enter a whole number of minutes from 5 to 30.')
    ).toBeTruthy();
    fireEvent.submit(button.closest('form')!);
    expect(confirm).not.toHaveBeenCalled();
    expect(armMutate).not.toHaveBeenCalled();
  });

  it('shows the armed state and resolves only after a destructive confirmation', async () => {
    const armed = {
      ...configurationFixture,
      syntheticAlert: {
        armed: true,
        armedAt: '2026-09-26T09:55:00.000Z',
        expiresAt: '2026-09-26T10:10:00.000Z',
        armedBy: 'owner@atlas.dev',
      },
    };
    renderWith(armed);
    expect(screen.getByText('Armed — a test alert is firing')).toBeTruthy();
    expect(
      screen.getByText(/Resolves automatically at 26 Sep 2026, /)
    ).toBeTruthy();
    expect(screen.getByText(/by owner@atlas\.dev/)).toBeTruthy();

    confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Resolve now' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(resolveMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Resolve now' }));
    await waitFor(() => expect(resolveMutate).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[1][0].intent).toBe('destructive');
  });

  it('renders in Arabic, right-to-left', () => {
    const { container } = renderWith(configurationFixture, 'ar');
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(
      screen.getByRole('heading', { level: 1, name: 'المراقبة والتنبيهات' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'إطلاق تنبيه اختباري' })
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /platformObservability:|navigation:/
    );
  });
});
