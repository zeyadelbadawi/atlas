/**
 * The Platform Owner does not get a customer's sidebar (P59).
 *
 * WHAT THIS IS ACTUALLY ABOUT. A Platform Owner has no organization — they
 * operate the platform, they are not a tenant of it. Before `tenantSurface`
 * the sidebar handed them the whole customer product anyway: Courses,
 * Members, Website, Billing, Academy Settings. Every one of those pages
 * then asked the API for "my organization's ..." and got nothing back, so
 * the operator saw a dozen entries that all led to empty or broken views,
 * plus a "no subscription" banner on an account that will never have one.
 *
 * This is navigation only — `RouteGuard` and the backend guards decide
 * access, and they are unchanged. What is asserted here is that the two
 * audiences see the two different menus, in BOTH directions: hiding tenant
 * surfaces from the operator is only correct if it does not also hide them
 * from the customers whose product they are.
 */
import { describe, expect, it } from 'vitest';
import { filterNavigationItems } from './navigation.utils';
import type { CurrentUser, NavigationItem } from '@types';

function user(roles: string[]): CurrentUser {
  return {
    id: 'u1',
    name: 'Test',
    email: 'test@atlas.dev',
    roles,
  } as unknown as CurrentUser;
}

const context = (roles: string[]) => ({
  isAuthenticated: true,
  user: user(roles),
  isFeatureEnabled: () => true,
});

const ITEMS: readonly NavigationItem[] = [
  { id: 'tenant-courses', labelKey: 'x', path: '/dashboard/courses', tenantSurface: true },
  { id: 'tenant-billing', labelKey: 'x', path: '/dashboard/billing', tenantSurface: true },
  { id: 'platform-courses', labelKey: 'x', path: '/dashboard/platform/courses' },
  { id: 'profile', labelKey: 'x', path: '/dashboard/profile' },
];

function idsFor(roles: string[]): string[] {
  return filterNavigationItems(ITEMS, context(roles)).map((item) => item.id);
}

describe('tenantSurface navigation filtering', () => {
  it('hides every tenant surface from a platform owner', () => {
    const ids = idsFor(['platform_owner']);
    expect(ids).not.toContain('tenant-courses');
    expect(ids).not.toContain('tenant-billing');
  });

  it('still shows the platform owner their own surfaces', () => {
    // The point is separation, not subtraction: removing the customer
    // product must leave the operator console and shared pages intact.
    const ids = idsFor(['platform_owner']);
    expect(ids).toContain('platform-courses');
    expect(ids).toContain('profile');
  });

  it('leaves a CUSTOMER\'s sidebar completely untouched', () => {
    // The regression that would matter most: hiding tenant surfaces from
    // the people they exist for.
    expect(idsFor(['organization_owner'])).toEqual([
      'tenant-courses',
      'tenant-billing',
      'platform-courses',
      'profile',
    ]);
  });

  it('filters nested children by the same rule', () => {
    const nested: readonly NavigationItem[] = [
      {
        id: 'group',
        labelKey: 'x',
        path: '/dashboard/group',
        children: [
          { id: 'child-tenant', labelKey: 'x', path: '/a', tenantSurface: true },
          { id: 'child-shared', labelKey: 'x', path: '/b' },
        ],
      },
    ];
    const [group] = filterNavigationItems(nested, context(['platform_owner']));
    expect(group.children?.map((c) => c.id)).toEqual(['child-shared']);
  });

  it('treats an item with no tenantSurface flag as visible to everyone', () => {
    expect(idsFor(['platform_owner'])).toContain('profile');
    expect(idsFor(['instructor'])).toContain('profile');
  });
});
