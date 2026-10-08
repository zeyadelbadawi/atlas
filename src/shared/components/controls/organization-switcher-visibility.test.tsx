/**
 * The organization dropdown appears only for someone who belongs to two or
 * more organizations — with one (or none) there is nothing to switch to.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

let organizations: { organizationId: string; organizationName: string }[] = [];

vi.mock('@hooks', () => ({
  useAuth: () => ({
    user: { id: 'u1', organizations },
    organization: organizations[0]
      ? {
          id: organizations[0].organizationId,
          name: organizations[0].organizationName,
        }
      : undefined,
    switchOrganization: vi.fn(),
  }),
}));

import { OrganizationSwitcher } from './OrganizationSwitcher';

function renderSwitcher() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <OrganizationSwitcher />
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('OrganizationSwitcher visibility', () => {
  it('renders nothing with no organization', () => {
    organizations = [];
    const { container } = renderSwitcher();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with exactly one organization', () => {
    organizations = [
      { organizationId: 'o1', organizationName: 'Acme Learning' },
    ];
    const { container } = renderSwitcher();
    expect(container.innerHTML).toBe('');
    expect(screen.queryByText('Acme Learning')).toBeNull();
  });

  it('renders the dropdown with two or more organizations', () => {
    organizations = [
      { organizationId: 'o1', organizationName: 'Acme Learning' },
      { organizationId: 'o2', organizationName: 'Nile Group' },
    ];
    renderSwitcher();
    expect(screen.getByText('Acme Learning')).toBeTruthy();
  });
});
