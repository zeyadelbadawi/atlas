/**
 * Dashboard overview — request order (perf).
 *
 * Every request the page can start without the overview response must start
 * while that response is still in flight: the setup checklist and the phone
 * prompt render in the loading state too (and stay mounted), and the
 * "my tickets" read is prefetched from the page itself, because its list only
 * mounts with the overview data. Before, each waited for the overview — one
 * extra round trip to the server on every visit.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

const overview = vi.fn();
vi.mock('../hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => overview() as unknown,
}));
vi.mock('../hooks/useDashboardScope', () => ({
  useDashboardScope: () => ({ kind: 'organization', organizationId: 'org-1' }),
}));
const prefetchTickets = vi.fn();
vi.mock('../hooks/useTenantSupportCases', () => ({
  usePrefetchMySupportCases: () => prefetchTickets() as unknown,
  useMySupportCases: () => ({ data: undefined, isLoading: true }),
  useSubmitSupportCase: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@features/onboarding', () => ({
  SetupChecklistCard: () => <p data-testid="setup-checklist" />,
}));
vi.mock('@features/profile', () => ({
  PhoneNumberPrompt: () => <p data-testid="phone-prompt" />,
}));
vi.mock('@features/tenant', () => ({
  GettingStartedChecklist: () => null,
}));

const { default: DashboardOverviewPage } =
  await import('./DashboardOverviewPage');

let i18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  i18n = await createI18nInstance('en');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <DashboardOverviewPage />
    </I18nextProvider>
  );
}

describe('DashboardOverviewPage — nothing waits on the overview needlessly', () => {
  it('starts the checklist, phone and tickets reads while the overview loads', () => {
    overview.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByTestId('setup-checklist')).not.toBeNull();
    expect(screen.queryByTestId('phone-prompt')).not.toBeNull();
    expect(prefetchTickets).toHaveBeenCalled();
  });

  it('keeps them on an overview error', () => {
    overview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.queryByTestId('setup-checklist')).not.toBeNull();
    expect(screen.queryByTestId('phone-prompt')).not.toBeNull();
  });
});
