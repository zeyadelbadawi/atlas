/**
 * Routing, access and the pure helpers behind the Observability Center.
 *
 * The rule-detail path is a PUBLIC contract (Slack "View Alert" links), so
 * it is pinned literally. Every route is guarded for `platform_owner`; the
 * router source (`AtlasAppRoutes`, the dashboard's routes) is read as text
 * because rendering it would mount the whole application.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { getDashboardNavigation } from '@app/navigation/navigation.config';
import { createI18nInstance } from '@/localization/i18n';
import { isDataStale } from './utils/freshness';
import {
  formatDetailValue,
  formatUnitValue,
} from './utils/observability-format';
import { parseAlertFilters } from './hooks/useAlertFilters';

const ROUTE_KEYS = [
  'platformObservability',
  'platformObservabilityHealth',
  'platformObservabilityAlerts',
  'platformObservabilityAlertRule',
  'platformObservabilityMetrics',
  'platformObservabilityConfiguration',
] as const;

describe('Observability routes', () => {
  it('keeps the exact paths, including the Slack deep-link shape', () => {
    expect(DASHBOARD_ROUTES.platformObservability).toBe(
      '/dashboard/platform/observability'
    );
    expect(DASHBOARD_ROUTES.platformObservabilityHealth).toBe(
      '/dashboard/platform/observability/health'
    );
    expect(DASHBOARD_ROUTES.platformObservabilityAlerts).toBe(
      '/dashboard/platform/observability/alerts'
    );
    expect(
      buildPath(DASHBOARD_ROUTES.platformObservabilityAlertRule, {
        ruleName: 'HighErrorRate',
      })
    ).toBe('/dashboard/platform/observability/alerts/HighErrorRate');
    expect(DASHBOARD_ROUTES.platformObservabilityMetrics).toBe(
      '/dashboard/platform/observability/metrics'
    );
    expect(DASHBOARD_ROUTES.platformObservabilityConfiguration).toBe(
      '/dashboard/platform/observability/configuration'
    );
  });

  it('guards every Observability route for platform owners only', () => {
    const router = readFileSync(
      resolve(__dirname, '../../app/routes/AtlasAppRoutes.tsx'),
      'utf8'
    );
    for (const key of ROUTE_KEYS) {
      const start = router.indexOf(`path={DASHBOARD_ROUTES.${key}}`);
      expect(start, key).toBeGreaterThan(-1);
      const block = router.slice(
        start,
        router.indexOf('/>\n', router.indexOf('</RouteGuard>', start))
      );
      expect(block, key).toMatch(
        /<RouteGuard\s+requireAuthentication\s+requiredRoles=\{\['platform_owner'\]\}/
      );
    }
    // The index redirects to Health.
    const index = router.slice(
      router.indexOf('path={DASHBOARD_ROUTES.platformObservability}')
    );
    expect(index.slice(0, 400)).toMatch(
      /<Navigate\s+to=\{DASHBOARD_ROUTES\.platformObservabilityHealth\}/
    );
  });

  it('adds an Observability group with the four pages, platform-owner only', () => {
    const items = getDashboardNavigation().flatMap((section) => section.items);
    const group = items.find((item) => item.id === 'platform-observability');
    expect(group?.requiredRoles).toEqual(['platform_owner']);
    expect(group?.children?.map((child) => child.path)).toEqual([
      DASHBOARD_ROUTES.platformObservabilityHealth,
      DASHBOARD_ROUTES.platformObservabilityAlerts,
      DASHBOARD_ROUTES.platformObservabilityMetrics,
      DASHBOARD_ROUTES.platformObservabilityConfiguration,
    ]);
    for (const child of group?.children ?? []) {
      expect(child.requiredRoles).toEqual(['platform_owner']);
    }
  });
});

describe('isDataStale', () => {
  const now = 1_000_000;
  it('is fresh within two intervals and stale beyond them', () => {
    expect(
      isDataStale({ dataUpdatedAt: now - 60_000, intervalMs: 30_000, now })
    ).toBe(false);
    expect(
      isDataStale({ dataUpdatedAt: now - 60_001, intervalMs: 30_000, now })
    ).toBe(true);
  });
  it('is stale whenever the last refetch failed', () => {
    expect(
      isDataStale({
        dataUpdatedAt: now,
        intervalMs: 30_000,
        now,
        refetchFailed: true,
      })
    ).toBe(true);
  });
});

describe('value formatting', () => {
  const i18n = createI18nInstance('en');
  const t = i18n.t.bind(i18n) as TFunction;

  it('never turns a missing value into zero', () => {
    expect(formatUnitValue(null, 'ms', 'en', t)).toBeNull();
    expect(formatUnitValue(Number.NaN, 'count', 'en', t)).toBeNull();
    expect(formatDetailValue(null, 'bytes', 'en', t)).toBeNull();
  });

  it('formats each unit', () => {
    expect(formatUnitValue(0.125, 'percent', 'en', t)).toBe('12.5%');
    expect(formatUnitValue(0.0012, 'percent', 'en', t)).toBe('0.12%');
    expect(formatUnitValue(120, 'ms', 'en', t)).toBe('120 ms');
    expect(formatUnitValue(3_900, 'seconds', 'en', t)).toBe('1 h 5 min');
    expect(formatUnitValue(0.35, 'seconds', 'en', t)).toBe('0.35 s');
    expect(formatUnitValue(2_097_152, 'bytes', 'en', t)).toBe('2 MB');
    expect(formatUnitValue(4.5, 'perSecond', 'en', t)).toBe('4.5/s');
    expect(formatUnitValue(1234, 'count', 'en', t)).toBe('1,234');
    expect(formatDetailValue('true', 'text', 'en', t)).toBe('Yes');
    expect(formatDetailValue('cloudflare', 'text', 'en', t)).toBe('cloudflare');
  });

  it('uses Arabic plural forms for durations', () => {
    const ar = createI18nInstance('ar');
    const tAr = ar.t.bind(ar) as TFunction;
    expect(formatUnitValue(120, 'seconds', 'ar', tAr)).toBe('دقيقتان');
    expect(formatUnitValue(300, 'seconds', 'ar', tAr)).toBe('5 دقائق');
  });
});

describe('parseAlertFilters', () => {
  it('drops unknown values and keeps valid ones', () => {
    expect(
      parseAlertFilters(
        new URLSearchParams('status=active&severity=info&rule=%20X%20&range=6h')
      )
    ).toEqual({
      status: 'active',
      severity: 'info',
      rule: 'X',
      range: '6h',
    });
    expect(parseAlertFilters(new URLSearchParams('severity=unknown'))).toEqual({
      status: 'all',
      range: '24h',
    });
  });
});
