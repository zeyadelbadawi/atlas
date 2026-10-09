/**
 * The academy "Requests" sidebar entry follows the same rule as the
 * Customer Requests API (`AcademyRoles('owner', 'administrator')`): inside
 * an academy the caller's VERIFIED academy role decides, so an academy
 * administrator — who holds the same organization permissions as a
 * manager — gets the entry and a manager does not. Outside an academy
 * screen (no verified role) the owner-tier permission applies as before.
 */
import { describe, expect, it } from 'vitest';
import { getDashboardNavigation } from './navigation.config';
import { filterNavigationItems } from './navigation.utils';
import { CUSTOMER_REQUEST_ACADEMY_ROLES } from '@features/customer-requests';
import type { CurrentUser, OrganizationContext } from '@types';

const ACADEMY = 'academy-1';
const MANAGER_PERMISSIONS = ['academy.view', 'course.view'];
const OWNER_PERMISSIONS = [...MANAGER_PERMISSIONS, 'tenant.dashboard.view'];

function showsRequests(
  permissions: readonly string[],
  academyRole: string | undefined
): boolean {
  const user = {
    id: 'u1',
    roles: [],
    permissions: [],
  } as unknown as CurrentUser;
  const organization = {
    id: 'org-1',
    role: 'manager',
    permissions,
  } as unknown as OrganizationContext;
  const academy = getDashboardNavigation(ACADEMY).find(
    (section) => section.id === 'academy'
  );
  return filterNavigationItems(academy?.items ?? [], {
    isAuthenticated: true,
    user,
    organization,
    isFeatureEnabled: () => true,
    hasEntitlement: true,
    academyRole,
  }).some((item) => item.id === 'academy-requests');
}

describe('academy Requests sidebar entry', () => {
  it('is shown to an academy administrator (manager-level organization permissions)', () => {
    expect(showsRequests(MANAGER_PERMISSIONS, 'administrator')).toBe(true);
  });

  it('is shown to the academy owner', () => {
    expect(showsRequests(OWNER_PERMISSIONS, 'owner')).toBe(true);
  });

  it.each(['manager', 'instructor', 'staff'])(
    'is hidden from an academy %s',
    (role) => {
      expect(showsRequests(MANAGER_PERMISSIONS, role)).toBe(false);
    }
  );

  it('the academy role decides even when organization permissions would allow it', () => {
    expect(showsRequests(OWNER_PERMISSIONS, 'manager')).toBe(false);
  });

  it('outside an academy screen falls back to the owner-tier permission', () => {
    expect(showsRequests(OWNER_PERMISSIONS, undefined)).toBe(true);
    expect(showsRequests(MANAGER_PERMISSIONS, undefined)).toBe(false);
  });

  it('uses the same roles as the Customer Requests pages and cards', () => {
    const entry = getDashboardNavigation(ACADEMY)
      .flatMap((section) => section.items)
      .find((item) => item.id === 'academy-requests');
    expect([...(entry?.academyRoles ?? [])].sort()).toEqual(
      [...CUSTOMER_REQUEST_ACADEMY_ROLES].sort()
    );
  });
});
