/**
 * New Customer Onboarding — the setup shell's Plan step hands the owner
 * to the EXISTING checkout with `?returnTo=/onboarding`. The checkout
 * offers "Back to setup" for that — and only for a path under
 * `/onboarding`, never an arbitrary URL (no open redirect).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { tenantService } from '@features/tenant';
import { paymentService } from './services/PaymentService';
import CheckoutPage from './pages/CheckoutPage';

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(tenantService, 'getSubscription').mockRejectedValue(new Error('none'));
  vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCheckout(search: string) {
  const identity = {
    user: { id: 'u1', roles: [], organizations: [] },
    organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
  } as unknown as IdentityContextValue;
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter
              initialEntries={[
                `/dashboard/tenant/billing/checkout/plan_subscription/growth${search}`,
              ]}
            >
              <Routes>
                <Route
                  path="/dashboard/tenant/billing/checkout/:targetType/:targetKey"
                  element={<CheckoutPage />}
                />
              </Routes>
            </MemoryRouter>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('CheckoutPage — Back to setup', () => {
  it('links back to setup when returnTo is under /onboarding', () => {
    renderCheckout('?returnTo=%2Fonboarding');
    const link = screen.getByTestId('checkout-back-to-setup');
    expect(link.getAttribute('href')).toBe('/onboarding');
    expect(link.textContent).toBe('Back to setup');
  });

  it('offers nothing for any other returnTo', () => {
    renderCheckout('?returnTo=https%3A%2F%2Fevil.example%2Fonboarding');
    expect(screen.queryByTestId('checkout-back-to-setup')).toBeNull();
  });

  it('is unchanged without returnTo', () => {
    renderCheckout('');
    expect(screen.queryByTestId('checkout-back-to-setup')).toBeNull();
  });
});
