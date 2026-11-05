/**
 * B1 (UX audit, V30) — Profile › Account.
 *
 * An organization owner read "Role: No role assigned"; role words stayed in
 * English on the Arabic page; and every membership flagged primary was
 * marked "Current". The Role row now shows only a real platform role, role
 * words are translated, and only the organization this session works in is
 * "Current".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CurrentUser } from '@types';

const session = vi.hoisted(() => ({
  organization: { id: 'org-2' } as { id: string } | undefined,
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSession: () => ({ organization: session.organization }),
}));

const { ProfileAccountSection } =
  await import('./components/ProfileAccountSection');

const membership = (
  organizationId: string,
  organizationName: string,
  role: string,
  isPrimary: boolean
) => ({
  organizationId,
  organizationName,
  role,
  isPrimary,
  permissions: [],
  joinedAt: '2026-01-01T00:00:00.000Z',
});

function user(roles: string[]): CurrentUser {
  const memberships = [
    membership('org-1', 'Acme Academy Group', 'owner', true),
    membership('org-2', 'NextGen Learning', 'member', false),
    membership('org-3', 'Delta', 'owner', true),
  ];
  return {
    id: 'u-1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    roles,
    permissions: [],
    organizations: memberships,
    organizationMemberships: memberships,
    principalKind: 'staff',
    academies: [],
    createdAt: '2026-11-05T00:00:00.000Z',
  } as unknown as CurrentUser;
}

function renderSection(current: CurrentUser, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <ProfileAccountSection user={current} />
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  session.organization = { id: 'org-2' };
});

describe('ProfileAccountSection', () => {
  it('leaves out the Role row when there is no platform role', () => {
    renderSection(user([]));
    expect(screen.queryByText('Role')).toBeNull();
    expect(screen.queryByText(/No role assigned/i)).toBeNull();
  });

  it('names a platform role in words', () => {
    renderSection(user(['platform_owner']));
    expect(screen.getByTestId('platform-role').textContent).toBe(
      'Platform owner'
    );
  });

  it('marks only the active organization as Current', () => {
    renderSection(user([]));
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    const current = rows.filter((row) => within(row).queryByText('Current'));
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('NextGen Learning');
  });

  it('falls back to the first primary organization without an active one', () => {
    session.organization = undefined;
    renderSection(user([]));
    const current = screen
      .getAllByRole('listitem')
      .filter((row) => within(row).queryByText('Current'));
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Acme Academy Group');
  });

  it('translates role words on the Arabic page', () => {
    renderSection(user([]), 'ar');
    const rows = screen.getAllByRole('listitem');
    expect(rows[0].textContent).toContain('المالك');
    expect(rows[1].textContent).toContain('عضو');
    expect(rows[0].textContent).not.toMatch(/Owner|owner/);
    expect(rows[1].textContent).not.toMatch(/Member|member/);
  });
});
