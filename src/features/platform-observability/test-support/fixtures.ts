/** Contract-shaped responses for the Observability page tests. */
import type {
  AlertItem,
  AlertRuleDetailResponse,
  AlertRuleInfo,
  AlertsResponse,
  MetricCatalogResponse,
  MetricSeriesResponse,
  MonitoringConfigurationResponse,
  SystemHealthResponse,
} from '@types';

const NOW = '2026-09-26T10:00:00.000Z';

export const healthFixture: SystemHealthResponse = {
  generatedAt: NOW,
  overall: 'degraded',
  alerts: { source: 'ok', active: 4, critical: 1, warning: 2, info: 1 },
  components: [
    {
      key: 'api',
      status: 'healthy',
      checkedAt: NOW,
      latencyMs: 4,
      reason: null,
      details: [
        { key: 'latencyP95Ms', value: 120, unit: 'ms' },
        { key: 'errorRate5xx', value: 0.012, unit: 'percent' },
        { key: 'requestRate', value: 37.5, unit: 'count' },
      ],
    },
    {
      key: 'redis',
      status: 'degraded',
      checkedAt: NOW,
      latencyMs: 250,
      reason: 'highLatency',
      details: [
        { key: 'usedMemoryBytes', value: 1_048_576, unit: 'bytes' },
        { key: 'someFutureDetail', value: 7, unit: 'count' },
      ],
    },
    {
      key: 'prometheus',
      status: 'unknown',
      checkedAt: NOW,
      latencyMs: null,
      reason: 'sourceUnavailable',
      details: [],
    },
    {
      key: 'alertmanager',
      status: 'not_configured',
      checkedAt: NOW,
      latencyMs: null,
      reason: 'notConfigured',
      details: [],
    },
  ],
};

export function alertItem(overrides: Partial<AlertItem> = {}): AlertItem {
  return {
    id: 'a1',
    rule: 'HighErrorRate',
    severity: 'critical',
    status: 'firing',
    summary: 'API 5xx ratio above 5%',
    description: 'The API is returning too many server errors.',
    service: 'api',
    labels: { alertname: 'HighErrorRate', service: 'api' },
    startsAt: '2026-09-26T09:30:00.000Z',
    endsAt: null,
    durationSeconds: 1_800,
    affectedTenants: [],
    ...overrides,
  };
}

export const alertsFixture: AlertsResponse = {
  generatedAt: NOW,
  sources: { alertmanager: 'ok', prometheus: 'ok' },
  historyFrom: '2026-09-11T00:00:00.000Z',
  items: [
    alertItem(),
    alertItem({
      id: 'a2',
      rule: 'QueueBacklog',
      severity: 'warning',
      status: 'resolved',
      service: 'queues',
      endsAt: '2026-09-26T08:45:00.000Z',
      startsAt: '2026-09-26T08:00:00.000Z',
      durationSeconds: 2_700,
      affectedTenants: [
        { organizationId: 'org-1', academyId: null, name: 'Nile Academy' },
        { organizationId: 'org-2', academyId: null, name: 'Delta School' },
      ],
    }),
  ],
};

export const ruleInfo: AlertRuleInfo = {
  name: 'HighErrorRate',
  group: 'atlas-api',
  expression:
    'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05',
  forSeconds: 300,
  severity: 'critical',
  service: 'api',
  summary: 'API 5xx ratio above 5%',
  description: 'The API is returning too many server errors.',
  threshold: '> 5% for 5 minutes',
  state: 'firing',
  health: 'ok',
  lastError: null,
  lastEvaluation: NOW,
  lastTriggeredAt: '2026-09-26T09:30:00.000Z',
  lastResolvedAt: null,
  editable: false,
};

export const ruleFixture: AlertRuleDetailResponse = {
  generatedAt: NOW,
  sources: { alertmanager: 'ok', prometheus: 'ok' },
  rule: ruleInfo,
  currentValues: [{ labels: { service: 'api' }, value: 0.0712 }],
  instances: [
    alertItem({
      labels: {
        alertname: 'HighErrorRate',
        service: 'api',
        organization_id: 'org-9',
      },
      affectedTenants: [
        {
          organizationId: 'org-9',
          academyId: 'ac-3',
          name: 'Cairo Coding Academy',
        },
      ],
    }),
  ],
  timeline: [
    { at: '2026-09-26T09:30:00.000Z', kind: 'triggered', alertId: 'a1' },
  ],
  expressionSeries: [
    {
      labels: { service: 'api' },
      points: [
        { t: '2026-09-26T09:00:00.000Z', v: 0.01 },
        { t: '2026-09-26T09:30:00.000Z', v: 0.07 },
      ],
    },
  ],
};

export const catalogFixture: MetricCatalogResponse = {
  generatedAt: NOW,
  source: 'ok',
  metrics: [
    { id: 'api.errorRate5xx', domain: 'api', unit: 'percent', available: true },
    { id: 'jobs.waiting', domain: 'jobs', unit: 'count', available: true },
    {
      id: 'learning.integrityEvents',
      domain: 'learning',
      unit: 'count',
      available: false,
    },
  ],
};

export function seriesFixture(
  metric: MetricCatalogResponse['metrics'][number]
): MetricSeriesResponse {
  const multi = metric.id === 'jobs.waiting';
  return {
    generatedAt: NOW,
    source: 'ok',
    metric,
    from: '2026-09-25T10:00:00.000Z',
    to: NOW,
    stepSeconds: 300,
    series: multi
      ? [
          {
            labels: { queue: 'email' },
            points: [
              { t: '2026-09-26T09:55:00.000Z', v: 3 },
              { t: NOW, v: 5 },
            ],
          },
          {
            labels: { queue: 'video' },
            points: [
              { t: '2026-09-26T09:55:00.000Z', v: 1 },
              { t: NOW, v: null },
            ],
          },
        ]
      : [
          {
            labels: {},
            points: [
              { t: '2026-09-26T09:55:00.000Z', v: 0.02 },
              { t: NOW, v: 0.034 },
            ],
          },
        ],
  };
}

export const configurationFixture: MonitoringConfigurationResponse = {
  generatedAt: NOW,
  sources: { alertmanager: 'ok', prometheus: 'ok' },
  scrapeAuthentication: 'token',
  rules: [
    ruleInfo,
    {
      ...ruleInfo,
      name: 'QueueBacklog',
      group: 'atlas-jobs',
      severity: 'warning',
      state: 'inactive',
      threshold: null,
    },
  ],
  channels: [
    {
      kind: 'slack',
      configured: true,
      source: 'ok',
      sent24h: 12,
      failed24h: 1,
    },
  ],
  syntheticAlert: {
    armed: false,
    armedAt: null,
    expiresAt: null,
    armedBy: null,
  },
};
