/**
 * W3 — the Email & Notifications sidebar section holds exactly three
 * Platform-Owner pages, and every one of their routes is guarded for
 * `platform_owner`. The router source is read as text because rendering it
 * would mount the whole application (the Observability precedent).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { getDashboardNavigation } from '@app/navigation/navigation.config';

const ROUTE_KEYS = [
  'platformEmailCompose',
  'platformEmailActivity',
  'platformSecurityMonitoring',
] as const;

describe('Email & Notifications navigation', () => {
  it('has exactly the three pages, platform-owner only', () => {
    const section = getDashboardNavigation().find(
      (s) => s.id === 'platform-email'
    );
    expect(section?.labelKey).toBe('navigation:sections.platformEmail');
    expect(section?.items.map((item) => item.path)).toEqual(
      ROUTE_KEYS.map((key) => DASHBOARD_ROUTES[key])
    );
    for (const item of section?.items ?? []) {
      expect(item.requiredRoles).toEqual(['platform_owner']);
      expect(item.children ?? []).toEqual([]);
    }
  });

  it('keeps stable paths under /dashboard/platform/email', () => {
    expect(DASHBOARD_ROUTES.platformEmailCompose).toBe(
      '/dashboard/platform/email/compose'
    );
    expect(DASHBOARD_ROUTES.platformEmailActivity).toBe(
      '/dashboard/platform/email/activity'
    );
    expect(DASHBOARD_ROUTES.platformSecurityMonitoring).toBe(
      '/dashboard/platform/email/security'
    );
  });

  it('guards every route for platform owners', () => {
    const router = readFileSync(
      resolve(__dirname, '../../../app/routes/AtlasAppRoutes.tsx'),
      'utf8'
    );
    for (const key of ROUTE_KEYS) {
      const start = router.indexOf(`path={DASHBOARD_ROUTES.${key}}`);
      expect(start, key).toBeGreaterThan(-1);
      const block = router.slice(start, router.indexOf('</RouteGuard>', start));
      expect(block, key).toMatch(
        /<RouteGuard\s+requireAuthentication\s+requiredRoles=\{\['platform_owner'\]\}/
      );
    }
  });
});
