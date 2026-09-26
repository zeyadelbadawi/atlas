/**
 * The service sends exactly the contract's paths and parameters: absent
 * filters are omitted (not `severity=undefined`), path segments are
 * encoded, and the synthetic alert is armed with a `{ minutes }` body.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '@services';
import { PlatformObservabilityService } from './services/PlatformObservabilityService';

function fakeClient() {
  const client = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  return {
    client,
    service: new PlatformObservabilityService(client as unknown as ApiClient),
  };
}

describe('PlatformObservabilityService', () => {
  it('omits absent alert filters', async () => {
    const { client, service } = fakeClient();
    await service.listAlerts({ status: 'all', range: '24h' });
    expect(client.get).toHaveBeenCalledWith('platform-observability/alerts', {
      params: { status: 'all', range: '24h' },
    });
  });

  it('sends every filter that is set', async () => {
    const { client, service } = fakeClient();
    await service.listAlerts({
      status: 'active',
      severity: 'critical',
      rule: 'X',
      range: '7d',
    });
    expect(client.get.mock.calls[0][1]).toEqual({
      params: {
        status: 'active',
        severity: 'critical',
        rule: 'X',
        range: '7d',
      },
    });
  });

  it('encodes the rule name and metric id in the path', async () => {
    const { client, service } = fakeClient();
    await service.getAlertRule('A/B rule', '1h');
    await service.getMetricSeries('api.requestRate', '30d');
    expect(client.get.mock.calls[0]).toEqual([
      'platform-observability/alerts/rules/A%2FB%20rule',
      { params: { range: '1h' } },
    ]);
    expect(client.get.mock.calls[1]).toEqual([
      'platform-observability/metrics/api.requestRate',
      { params: { range: '30d' } },
    ]);
  });

  it('arms with { minutes } and resolves with DELETE', async () => {
    const { client, service } = fakeClient();
    await service.armSyntheticAlert(12);
    await service.resolveSyntheticAlert();
    expect(client.post).toHaveBeenCalledWith(
      'platform-observability/synthetic-alert',
      {
        minutes: 12,
      }
    );
    expect(client.delete).toHaveBeenCalledWith(
      'platform-observability/synthetic-alert'
    );
  });
});
