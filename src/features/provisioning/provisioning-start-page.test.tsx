/**
 * `ProvisioningStartPage` after its form moved into `AcademySetupForm`
 * (shared with the onboarding shell's Academy step): the page still gates
 * on the plan, the Atlas address still follows the academy name and is
 * checked for availability, and a created request still opens its status
 * screen.
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
import { ApiError } from '@api';
import { planService, tenantService } from '@features/tenant';
import type { ProvisioningRequest, TenantSubscription } from '@types';
import { provisioningService } from './services/ProvisioningService';
import ProvisioningStartPage from './pages/ProvisioningStartPage';

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

let createRequest: ReturnType<typeof vi.fn>;

beforeEach(() => {
  createRequest = vi.fn(
    async () =>
      ({ id: 'req-7', requestedAcademyName: 'Nile' }) as ProvisioningRequest
  );
  vi.spyOn(tenantService, 'getSubscription').mockResolvedValue({
    status: 'trialing',
    plan: { key: 'starter' },
  } as unknown as TenantSubscription);
  // A fresh subscription has no usage row yet — a 404 the page tolerates.
  vi.spyOn(tenantService, 'getUsage').mockRejectedValue(
    new ApiError({
      kind: 'notFound',
      messageKey: 'errors.notFound',
      status: 404,
      retryable: false,
    })
  );
  vi.spyOn(planService, 'getAddOns').mockResolvedValue([]);
  vi.spyOn(provisioningService, 'checkSubdomainAvailability').mockResolvedValue(
    {
      status: 'available',
    } as Awaited<
      ReturnType<typeof provisioningService.checkSubdomainAvailability>
    >
  );
  vi.spyOn(provisioningService, 'createProvisioningRequest').mockImplementation(
    (organizationId, payload) =>
      createRequest(organizationId, payload) as Promise<ProvisioningRequest>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Where(): JSX.Element {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}</span>;
}

function renderPage() {
  const identity = {
    organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
  } as unknown as IdentityContextValue;
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter initialEntries={['/dashboard/provisioning/new']}>
              <Routes>
                <Route
                  path="/dashboard/provisioning/new"
                  element={<ProvisioningStartPage />}
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

describe('ProvisioningStartPage (form extracted to AcademySetupForm)', () => {
  it('creates the request from the shared form and opens its status screen', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      await screen.findByLabelText('Academy name'),
      'Nile Academy'
    );
    // The address follows the name (the suggestion survived extraction).
    // (Its label points at a wrapper div, as before — hence by value.)
    expect(await screen.findByDisplayValue('nile-academy')).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Start provisioning' });
    await waitFor(
      () => expect((submit as HTMLButtonElement).disabled).toBe(false),
      {
        timeout: 2000,
      }
    );
    await user.click(submit);

    await waitFor(() => expect(createRequest).toHaveBeenCalledTimes(1));
    expect(createRequest.mock.calls[0][0]).toBe('org-1');
    expect(createRequest.mock.calls[0][1]).toMatchObject({
      academyName: 'Nile Academy',
      requestedSubdomain: 'nile-academy',
      websiteSetupMode: 'complete',
      // W2 — the platform default theme is pre-selected and always sent, so
      // the website (and its starter pages) is always built.
      selectedThemeKey: 'modern-education',
    });
    // Nothing chosen in "Logo & colours" → no brand on the request.
    expect(createRequest.mock.calls[0][1].brand).toBeUndefined();
    expect((await screen.findByTestId('where')).textContent).toBe(
      '/dashboard/provisioning/req-7'
    );
  });

  it('the theme is a single-choice radio that cannot be cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    const group = await screen.findByRole('radiogroup', { name: 'Theme' });
    const [theme] = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(theme.getAttribute('aria-checked')).toBe('true');
    await user.click(theme as HTMLElement);
    expect(theme.getAttribute('aria-checked')).toBe('true');
  });

  it('when another tab already set up this address, offers to follow that request (409)', async () => {
    createRequest.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.provisioning.subdomainRequestInProgress',
        status: 409,
        retryable: false,
        details: { requestId: 'req-other' },
      })
    );
    const user = userEvent.setup();
    renderPage();
    await user.type(
      await screen.findByLabelText('Academy name'),
      'Nile Academy'
    );
    const submit = screen.getByRole('button', { name: 'Start provisioning' });
    await waitFor(
      () => expect((submit as HTMLButtonElement).disabled).toBe(false),
      {
        timeout: 2000,
      }
    );
    await user.click(submit);
    const follow = await screen.findByRole('link', {
      name: 'Follow that setup',
    });
    expect(follow.getAttribute('href')).toBe(
      '/dashboard/provisioning/req-other'
    );
    expect(screen.getByRole('alert').textContent).toContain(
      'This address is already being set up'
    );
  });
});
