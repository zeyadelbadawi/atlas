/**
 * The website Messages (Contact form inbox) sidebar entry is for the
 * people who manage the academy website — Owners and Managers, who hold
 * `academy.website.manage` — and no one else.
 *
 * A plain (or academy `staff`) member holds only `academy.view` and an
 * Instructor holds neither, so neither sees Website at all (B0-WEB-04:
 * every website API refuses them). Hiding is UX, not security: the route
 * is independently guarded and the backend refuses the read — what this
 * pins is that the sidebar never advertises a door that is locked.
 */
import { describe, expect, it } from 'vitest';
import { getDashboardNavigation } from './navigation.config';
import { filterNavigationItems } from './navigation.utils';
import type { CurrentUser, OrganizationContext } from '@types';

const ACADEMY = 'academy-1';

function visibleIds(permissions: readonly string[]): string[] {
  const user = {
    id: 'u1',
    name: 'Test',
    email: 'test@example.com',
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
  }).map((item) => item.id);
}

describe('website Messages navigation entry', () => {
  it('is shown, right after Website, to a role that manages the website', () => {
    const ids = visibleIds([
      'academy.view',
      'academy.website.view',
      'academy.website.manage',
    ]);
    expect(ids).toContain('academy-website-messages');
    expect(ids.indexOf('academy-website-messages')).toBe(
      ids.indexOf('academy-website') + 1
    );
  });

  it('links to the academy-scoped Messages route', () => {
    const academy = getDashboardNavigation(ACADEMY).find(
      (section) => section.id === 'academy'
    );
    const entry = academy?.items.find(
      (item) => item.id === 'academy-website-messages'
    );
    expect(entry?.path).toBe(`/dashboard/academy/${ACADEMY}/website/messages`);
    expect(entry?.requiredPermissions).toEqual(['academy.website.manage']);
  });

  it('B0-WEB-04: a plain or staff member (academy.view only) sees no Website entry at all', () => {
    // The exact set the backend's ORGANIZATION_MEMBER_PERMISSIONS now holds.
    const ids = visibleIds(['academy.view']);
    expect(ids).not.toContain('academy-website');
    expect(ids).not.toContain('academy-website-messages');
  });

  it('is hidden from a member who can only view the website', () => {
    const ids = visibleIds(['academy.view', 'academy.website.view']);
    expect(ids).toContain('academy-website');
    expect(ids).not.toContain('academy-website-messages');
  });

  it('is hidden from an instructor', () => {
    const ids = visibleIds(['instructor.dashboard.view', 'course.view']);
    expect(ids).not.toContain('academy-website-messages');
  });

  it('does not exist before an academy is active', () => {
    const academy = getDashboardNavigation(undefined).find(
      (section) => section.id === 'academy'
    );
    expect(
      academy?.items.some((item) => item.id === 'academy-website-messages')
    ).toBe(false);
  });
});
