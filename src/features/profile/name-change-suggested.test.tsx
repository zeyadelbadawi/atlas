/**
 * W4 / security review finding 2 — the "please choose a different display
 * name" prompt.
 *
 * Registration no longer answers "this learner name is taken here" to an
 * unauthenticated caller; a clashing learner is admitted and the clash
 * surfaces only to the signed-in, verified account, as
 * `academies[].nameChangeSuggested` on `/users/me`. The profile's personal
 * section shows the prompt (naming only the user's own academies) and opens
 * the name fields; nothing is shown when no academy is flagged.
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CurrentUser } from '@types';
import { ProfilePersonalSection } from './components/ProfilePersonalSection';

vi.mock('./hooks', () => ({
  useUpdateProfile: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

function user(academies: CurrentUser['academies']): CurrentUser {
  return {
    id: 'u-1',
    name: 'Sara Ali',
    email: 'sara@example.com',
    roles: [],
    permissions: [],
    organizations: [],
    organizationMemberships: [],
    principalKind: 'learner',
    academies,
  } as unknown as CurrentUser;
}

const ACADEMY = {
  academyId: 'a-1',
  name: 'Nile Academy',
  slug: 'nile',
  membershipStatus: 'active',
  blocked: false,
};

function renderSection(current: CurrentUser, language: 'en' | 'ar' = 'en') {
  const wrap = (children: ReactNode) => (
    <I18nextProvider i18n={createI18nInstance(language)}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
    </I18nextProvider>
  );
  return render(wrap(<ProfilePersonalSection user={current} />));
}

afterEach(() => cleanup());

describe('ProfilePersonalSection — display-name prompt', () => {
  it('asks for a different name, naming only the flagged academy, and opens the fields', () => {
    renderSection(
      user([
        { ...ACADEMY, nameChangeSuggested: true },
        { ...ACADEMY, academyId: 'a-2', name: 'Delta Academy', slug: 'delta' },
      ])
    );
    const prompt = screen.getByTestId('name-change-suggested');
    expect(prompt.getAttribute('role')).toBe('status');
    expect(prompt.textContent).toContain(
      'Please choose a different display name'
    );
    expect(prompt.textContent).toContain('Nile Academy');
    expect(prompt.textContent).not.toContain('Delta Academy');

    const lastName = screen.getByLabelText('Last name') as HTMLInputElement;
    expect(lastName.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }));
    expect(lastName.disabled).toBe(false);
    expect(screen.queryByRole('button', { name: 'Change name' })).toBeNull();
  });

  it('shows nothing when no academy is flagged', () => {
    renderSection(user([ACADEMY]));
    expect(screen.queryByTestId('name-change-suggested')).toBeNull();
  });

  it('renders the Arabic copy', () => {
    renderSection(user([{ ...ACADEMY, nameChangeSuggested: true }]), 'ar');
    const prompt = screen.getByTestId('name-change-suggested');
    expect(prompt.textContent).toContain('يُرجى اختيار اسم عرض مختلف');
    expect(prompt.textContent).toContain('Nile Academy');
    expect(screen.getByRole('button', { name: 'تغيير الاسم' })).toBeTruthy();
  });
});
