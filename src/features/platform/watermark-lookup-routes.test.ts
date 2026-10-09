/**
 * Forensic watermark lookup — route and sidebar entry
 * (docs/FORENSIC_WATERMARK.md: "Frontend: `/dashboard/platform/watermarks`
 * (Platform Owner only)").
 *
 *  - The path is the one the backend documentation names.
 *  - The route is guarded for `platform_owner`, like every other operator
 *    console (the API's PlatformOwnerGuard + RLS are the real control).
 *  - The sidebar entry sits in the Platform Owner's administration section,
 *    right after the audit log, and is shown to a Platform Owner only.
 *
 * The router source is read as text because rendering it would mount the
 * whole application (the Observability / Customer Requests precedent).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { getDashboardNavigation } from '@app/navigation/navigation.config';
import { filterNavigationItems } from '@app/navigation/navigation.utils';
import type { CurrentUser, NavigationItem } from '@types';
import enNavigation from '@/localization/resources/en/navigation.json';
import arNavigation from '@/localization/resources/ar/navigation.json';

const ROUTER = readFileSync(
  resolve(__dirname, '../../app/routes/AtlasAppRoutes.tsx'),
  'utf8'
);

function guardBlock(key: string): string {
  const start = ROUTER.indexOf(`path={DASHBOARD_ROUTES.${key}}`);
  expect(start, key).toBeGreaterThan(-1);
  return ROUTER.slice(start, ROUTER.indexOf('</RouteGuard>', start));
}

function administrationItems(): readonly NavigationItem[] {
  const section = getDashboardNavigation().find(
    (candidate) => candidate.id === 'administration'
  );
  expect(section).toBeDefined();
  return section?.items ?? [];
}

function visibleIds(roles: string[]): string[] {
  const user = { id: 'u1', roles, permissions: [] } as unknown as CurrentUser;
  return filterNavigationItems(administrationItems(), {
    isAuthenticated: true,
    user,
    isFeatureEnabled: () => true,
  }).map((item) => item.id);
}

describe('watermark lookup route', () => {
  it('lives at the documented path', () => {
    expect(DASHBOARD_ROUTES.platformWatermarks).toBe(
      '/dashboard/platform/watermarks'
    );
  });

  it('is guarded for platform owners and lazy-loads the page', () => {
    const block = guardBlock('platformWatermarks');
    expect(block).toMatch(
      /<RouteGuard\s+requireAuthentication\s+requiredRoles=\{\['platform_owner'\]\}/
    );
    expect(block).toContain('<PlatformWatermarkLookupPage />');
    expect(ROUTER).toContain(
      "import('@features/platform/pages/PlatformWatermarkLookupPage')"
    );
  });
});

describe('watermark lookup sidebar entry', () => {
  it('sits right after the audit log, Platform Owner only', () => {
    const items = administrationItems();
    const ids = items.map((item) => item.id);
    expect(ids.indexOf('platform-watermarks')).toBe(
      ids.indexOf('platform-audit-log') + 1
    );
    const entry = items.find((item) => item.id === 'platform-watermarks');
    expect(entry).toMatchObject({
      labelKey: 'navigation:items.platformWatermarkLookup',
      path: DASHBOARD_ROUTES.platformWatermarks,
      requiresAuth: true,
      requiredRoles: ['platform_owner'],
    });
    expect(entry?.icon).toBeDefined();
    expect(enNavigation.items.platformWatermarkLookup).toBe('Watermark Lookup');
    expect(arNavigation.items.platformWatermarkLookup).toMatch(/[؀-ۿ]/);
  });

  it('is shown to a platform owner and hidden from everyone else', () => {
    expect(visibleIds(['platform_owner'])).toContain('platform-watermarks');
    expect(visibleIds(['organization_owner'])).not.toContain(
      'platform-watermarks'
    );
    expect(visibleIds(['instructor'])).not.toContain('platform-watermarks');
  });
});
