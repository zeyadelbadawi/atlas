/**
 * Session readers behind onboarding routing, and the checkout's
 * "Back to setup" guard.
 */
import { describe, expect, it } from 'vitest';
import type { CurrentUser, OrganizationMembership } from '@types';
import {
  findActiveMembership,
  isActiveOrganizationOwner,
  isOnboardingPendingForActiveOrganization,
  isOnboardingReturnPath,
} from './onboarding.utils';

function membership(
  organizationId: string,
  role: string,
  onboardingPending?: boolean
): OrganizationMembership {
  return {
    organizationId,
    organizationName: organizationId,
    role,
    permissions: [],
    isPrimary: organizationId === 'org-1',
    joinedAt: '2026-09-26T00:00:00Z',
    ...(onboardingPending === undefined ? {} : { onboardingPending }),
  };
}

const user = (organizations: OrganizationMembership[]) =>
  ({ organizations }) as Pick<CurrentUser, 'organizations'>;

describe('onboarding session readers', () => {
  it('matches the ACTIVE organization, not the primary one', () => {
    const u = user([membership('org-1', 'owner', true), membership('org-2', 'manager')]);
    expect(findActiveMembership(u, { id: 'org-2' })?.role).toBe('manager');
    expect(isActiveOrganizationOwner(u, { id: 'org-2' })).toBe(false);
    expect(isOnboardingPendingForActiveOrganization(u, { id: 'org-2' })).toBe(false);
    expect(isOnboardingPendingForActiveOrganization(u, { id: 'org-1' })).toBe(true);
  });

  it('requires an explicit true from the server, and the owner role', () => {
    expect(
      isOnboardingPendingForActiveOrganization(user([membership('org-1', 'owner')]), { id: 'org-1' })
    ).toBe(false);
    expect(
      isOnboardingPendingForActiveOrganization(
        user([membership('org-1', 'manager', true)]),
        { id: 'org-1' }
      )
    ).toBe(false);
    expect(isOnboardingPendingForActiveOrganization(undefined, { id: 'org-1' })).toBe(false);
    expect(
      isOnboardingPendingForActiveOrganization(user([membership('org-1', 'owner', true)]), undefined)
    ).toBe(false);
  });
});

describe('isOnboardingReturnPath', () => {
  it.each(['/onboarding', '/onboarding/plan', '/onboarding?x=1'])('accepts %s', (value) => {
    expect(isOnboardingReturnPath(value)).toBe(true);
  });

  it.each([
    null,
    '',
    '/dashboard',
    '/onboardingevil',
    '//evil.example/onboarding',
    'https://evil.example/onboarding',
    '/onboarding\\..\\x',
  ])('refuses %s', (value) => {
    expect(isOnboardingReturnPath(value)).toBe(false);
  });
});
