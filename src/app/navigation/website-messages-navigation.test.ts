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

  // The academy entries are split across several `academy*` sections.
  const academyItems = getDashboardNavigation(ACADEMY)
    .filter((section) => section.id.startsWith('academy'))
    .flatMap((section) => section.items);
  return filterNavigationItems(academyItems, {
    isAuthenticated: true,
    user,
    organization,
    isFeatureEnabled: () => true,
    hasEntitlement: true,
  }).map((item) => item.id);
}

describe('website Messages navigation entry', () => {
  // Owner decision (B2): website messages live inside the Website area
  // (its overview links to them), not in the sidebar.
  it('is not a sidebar entry, even for a role that manages the website', () => {
    const ids = visibleIds([
      'academy.view',
      'academy.website.view',
      'academy.website.manage',
    ]);
    expect(ids).toContain('academy-website');
    expect(ids).not.toContain('academy-website-messages');
  });

  it('B0-WEB-04: a plain or staff member (academy.view only) sees no Website entry at all', () => {
    // The exact set the backend's ORGANIZATION_MEMBER_PERMISSIONS now holds.
    const ids = visibleIds(['academy.view']);
    expect(ids).not.toContain('academy-website');
  });

  it('shows Website to a member who can only view the website', () => {
    const ids = visibleIds(['academy.view', 'academy.website.view']);
    expect(ids).toContain('academy-website');
  });
});
