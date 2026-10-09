/**
 * Customer Requests — routes and sidebar entries.
 *
 *  - The paths the backend's notification emails link to are real routes
 *    (`/dashboard/academy/:academyId/requests/:requestId` and
 *    `/dashboard/platform/customer-requests/:requestId`).
 *  - The console routes are guarded for `platform_owner`, with the static
 *    `routing` child declared before `:requestId`.
 *  - The academy routes require no entitlement (the API allows requests
 *    while a subscription is inactive), and neither does the sidebar entry.
 *
 * The router source is read as text because rendering it would mount the
 * whole application (the Observability precedent).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { matchPath } from 'react-router-dom';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { getDashboardNavigation } from '@app/navigation/navigation.config';
import { switchTargetPath } from '@features/academy';

const ROUTER = readFileSync(
  resolve(__dirname, '../../app/routes/AtlasAppRoutes.tsx'),
  'utf8'
);

function guardBlock(key: string): string {
  const start = ROUTER.indexOf(`path={DASHBOARD_ROUTES.${key}}`);
  expect(start, key).toBeGreaterThan(-1);
  return ROUTER.slice(start, ROUTER.indexOf('</RouteGuard>', start));
}

describe('Customer Requests routes', () => {
  it('serves the paths the request notifications link to', () => {
    expect(
      matchPath(
        DASHBOARD_ROUTES.academyRequestDetail,
        '/dashboard/academy/a1/requests/r1'
      )?.params
    ).toEqual({ academyId: 'a1', requestId: 'r1' });
    expect(
      matchPath(
        DASHBOARD_ROUTES.platformCustomerRequestDetail,
        '/dashboard/platform/customer-requests/r1'
      )?.params
    ).toEqual({ requestId: 'r1' });
  });

  it('guards the console for platform owners, routing before :requestId', () => {
    for (const key of [
      'platformCustomerRequests',
      'platformCustomerRequestRouting',
      'platformCustomerRequestDetail',
    ]) {
      expect(guardBlock(key), key).toMatch(
        /<RouteGuard\s+requireAuthentication\s+requiredRoles=\{\['platform_owner'\]\}/
      );
    }
    expect(
      ROUTER.indexOf('path={DASHBOARD_ROUTES.platformCustomerRequestRouting}')
    ).toBeLessThan(
      ROUTER.indexOf('path={DASHBOARD_ROUTES.platformCustomerRequestDetail}')
    );
  });

  it('keeps the academy routes available without an entitlement', () => {
    for (const key of ['academyRequests', 'academyRequestDetail']) {
      const block = guardBlock(key);
      expect(block, key).toContain('requireAuthentication');
      expect(block, key).not.toContain('requiresEntitlement');
    }
  });

  it('stays on Requests when switching academy', () => {
    expect(switchTargetPath('/dashboard/academy/a1/requests/r1', 'a2')).toBe(
      '/dashboard/academy/a2/requests'
    );
  });
});

describe('Customer Requests navigation', () => {
  it('adds an academy entry without an entitlement gate', () => {
    const academy = getDashboardNavigation('a1').find(
      (section) => section.id === 'academy'
    );
    const entry = academy?.items.find((item) => item.id === 'academy-requests');
    expect(entry?.path).toBe('/dashboard/academy/a1/requests');
    expect(entry?.labelKey).toBe('navigation:items.academyRequests');
    expect(entry?.requiresEntitlement).toBeFalsy();
  });

  it('adds a platform-owner entry next to Contact enquiries', () => {
    const items = getDashboardNavigation().flatMap((section) => section.items);
    const ids = items.map((item) => item.id);
    const entry = items.find(
      (item) => item.id === 'platform-customer-requests'
    );
    expect(entry?.path).toBe(DASHBOARD_ROUTES.platformCustomerRequests);
    expect(entry?.requiredRoles).toEqual(['platform_owner']);
    expect(ids.indexOf('platform-customer-requests')).toBe(
      ids.indexOf('platform-contact-submissions') + 1
    );
  });
});
