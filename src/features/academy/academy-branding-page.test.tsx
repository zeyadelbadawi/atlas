/**
 * `AcademyBrandingPage` after its form moved into `AcademyBrandingForm`
 * (shared with the onboarding shell's Branding step): same fields,
 * pre-filled from the academy, Save sends the same PATCH, Cancel goes
 * back to the academy dashboard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import type { Academy } from '@types';
import { academyService } from './services/AcademyService';
import AcademyBrandingPage from './pages/AcademyBrandingPage';

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const ACADEMY: Academy = {
  id: 'aca-1',
  organizationId: 'org-1',
  name: 'Nile Academy',
  slug: 'nile',
  status: 'active',
  timezone: 'Africa/Cairo',
  language: 'en',
  currency: 'USD',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T00:00:00Z',
};

let updateBranding: ReturnType<typeof vi.fn>;

beforeEach(() => {
  updateBranding = vi.fn(async () => ACADEMY);
  vi.spyOn(academyService, 'getAcademy').mockResolvedValue(ACADEMY);
  vi.spyOn(academyService, 'updateAcademyBranding').mockImplementation(
    (id, payload) => updateBranding(id, payload) as Promise<Academy>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <span data-testid="where">{`${location.pathname}${location.search}`}</span>
  );
}

function renderPage() {
  const identity = {
    organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
    switchOrganization: vi.fn(),
  } as unknown as IdentityContextValue;
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter initialEntries={['/dashboard/academy/aca-1/branding']}>
              <Routes>
                <Route
                  path="/dashboard/academy/:academyId/branding"
                  element={<AcademyBrandingPage />}
                />
                <Route path="*" element={<Where />} />
              </Routes>
            </MemoryRouter>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('AcademyBrandingPage (form extracted to AcademyBrandingForm)', () => {
  it('pre-fills the academy and saves through the same branding PATCH', async () => {
    const user = userEvent.setup();
    renderPage();
    const name = (await screen.findByLabelText('Academy Name')) as HTMLInputElement;
    await waitFor(() => expect(name.value).toBe('Nile Academy'));
    await user.clear(name);
    await user.type(name, 'Nile Learning');
    await user.click(screen.getByRole('button', { name: 'Save Branding' }));
    await waitFor(() => expect(updateBranding).toHaveBeenCalledTimes(1));
    expect(updateBranding.mock.calls[0][0]).toBe('aca-1');
    expect(updateBranding.mock.calls[0][1]).toMatchObject({ name: 'Nile Learning' });
  });

  it('cancels back to the academy dashboard', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/academy?academyId=aca-1'
    );
  });
});
