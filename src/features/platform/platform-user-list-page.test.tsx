/**
 * Platform Owner → Users, on the Arabic dashboard (J47).
 *
 * B8 (V24) cut a long email with an ellipsis and forced it LTR so it keeps
 * its own character order — but without the codebase's LTR-value marker
 * (`data-ltr-content`), so `index.css` never lined it up with its column:
 * in Arabic it sat flush left under a right-aligned header, and J47 counted
 * it as a left-to-right leak. The email is an LTR value; the name follows
 * its own text (`dir="auto"`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { PlatformUserSummary } from '@types';

const USERS: PlatformUserSummary[] = [
  {
    id: 'u1',
    name: 'سارة أحمد',
    email: 'sara.ahmed@example.com',
    status: 'active',
    organizationCount: 1,
    createdAt: '2026-10-01T10:00:00.000Z',
  } as PlatformUserSummary,
];

vi.mock('./hooks', () => ({
  usePlatformUsers: () => ({
    data: {
      items: USERS,
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const { default: PlatformUserListPage } =
  await import('./pages/PlatformUserListPage');

afterEach(cleanup);

describe('Platform users list in Arabic', () => {
  it('marks each email as an LTR value and leaves the name to its own text', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('ar')}>
        <MemoryRouter>
          <PlatformUserListPage />
        </MemoryRouter>
      </I18nextProvider>
    );
    const email = screen.getByText('sara.ahmed@example.com');
    expect(email.getAttribute('dir')).toBe('ltr');
    expect(email.hasAttribute('data-ltr-content')).toBe(true);
    expect(screen.getByTestId('platform-user-name').getAttribute('dir')).toBe(
      'auto'
    );
    // Nothing in the list is forced LTR without saying it is a value.
    expect(
      document.querySelectorAll('[dir="ltr"]:not([data-ltr-content])')
    ).toHaveLength(0);
  });
});
