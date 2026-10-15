/**
 * B0-IAM-08 / B0-ANL-04 — the organization detail shows the owner's number
 * only when the server sent it (the owner opted in), with the consent date
 * and wording version; otherwise "not shared". The sign-up source lists the
 * recorded fields, or "not recorded".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OrganizationOwnerContactDetails } from './OrganizationOwnerContactDetails';

vi.mock('@hooks', () => ({
  useDateFormatter: () => ({ date: (value: string) => value.slice(0, 10) }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
  }),
}));

afterEach(() => cleanup());

describe('OrganizationOwnerContactDetails', () => {
  it('shows an opted-in owner phone with the consent date and version', () => {
    render(
      <OrganizationOwnerContactDetails
        ownerPhone={{
          e164: '+201000000000',
          country: 'EG',
          whatsappConsentAt: '2026-10-15T09:00:00.000Z',
          whatsappConsentVersion: 'signup-whatsapp-consent-2026-10-draft1',
        }}
        signupAttribution={{ utmSource: 'facebook', referrerDomain: 'news.example.org' }}
      />
    );
    const phone = screen.getByTestId('platform-org-owner-phone');
    expect(phone.textContent).toContain('+201000000000');
    expect(phone.textContent).toContain(
      'platform:organizations.ownerWhatsapp.optedIn:2026-10-15,signup-whatsapp-consent-2026-10-draft1'
    );
    const source = screen.getByTestId('platform-org-signup-source');
    expect(source.textContent).toContain('facebook');
    expect(source.textContent).toContain('news.example.org');
  });

  it('never shows a number the server did not send, and says when no source was recorded', () => {
    render(<OrganizationOwnerContactDetails signupAttribution={null} />);
    const phone = screen.getByTestId('platform-org-owner-phone');
    expect(phone.textContent).toContain('platform:organizations.ownerWhatsapp.notShared');
    expect(phone.textContent).not.toMatch(/\+\d/);
    expect(screen.getByText('platform:organizations.signupSource.none')).toBeTruthy();
  });
});
