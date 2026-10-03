/**
 * W2 — `ProvisioningStatusPage`: honest progress.
 *
 * Pinned here: only the four real stages are shown, each driven by the
 * server's step states; one polite atomic live region announces the
 * situation; a stalled request and a failed one offer Retry; a branding
 * failure on a ready Academy is a warning with its own Retry (never a
 * blocked Academy); the logo attach is inline; a failed refetch reads
 * "Reconnecting…"; Arabic renders the same states; and polling is
 * adaptive (about 1 s, then 4 s) and stops at a terminal state.
 *
 * HTTP is mocked at the service layer; the real hooks, query cache, router
 * and i18n run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { PlatformContext } from '@app/providers/platform/platform.context';
import type { PlatformContextValue } from '@app/providers/platform/platform.context';
import { DialogContext } from '@app/providers/dialog/dialog.context';
import type { DialogContextValue } from '@app/providers/dialog/dialog.context';
import { ApiError } from '@api';
import { mediaService } from '@features/media';
import type {
  ProvisioningRequest,
  ProvisioningStep,
  ProvisioningStepKey,
  ProvisioningStepStatus,
} from '@types';
import { provisioningService } from './services/ProvisioningService';
import ProvisioningStatusPage from './pages/ProvisioningStatusPage';
import {
  PROVISIONING_FAST_POLL_INTERVAL_MS,
  PROVISIONING_STATUS_POLL_INTERVAL_MS,
  provisioningPollInterval,
} from './constants/provisioning.constants';
import { pendingLogoStore } from './logo/pending-logo';
import { deriveProvisioningStages } from './utils/provisioning-stages';

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const ORDER: readonly ProvisioningStepKey[] = [
  'tenant',
  'academy',
  'theme',
  'branding',
  'subdomain',
  'domain',
  'finalization',
];

function steps(
  statuses: Partial<Record<ProvisioningStepKey, ProvisioningStepStatus>>,
  errors: Partial<Record<ProvisioningStepKey, string>> = {}
): ProvisioningStep[] {
  return ORDER.map((key) => ({
    key,
    status: statuses[key] ?? 'pending',
    attemptNumber: statuses[key] && statuses[key] !== 'pending' ? 1 : 0,
    ...(errors[key] ? { error: { code: 'x', messageKey: errors[key]! } } : {}),
  }));
}

const ALL_DONE = {
  tenant: 'completed',
  academy: 'completed',
  theme: 'completed',
  branding: 'completed',
  subdomain: 'completed',
  domain: 'skipped',
  finalization: 'completed',
} as const;

function request(over: Partial<ProvisioningRequest> = {}): ProvisioningRequest {
  return {
    id: 'req-1',
    organizationId: 'org-1',
    status: 'tenant_created',
    currentStepKey: 'academy',
    steps: steps({ tenant: 'completed', academy: 'running' }),
    idempotencyKey: 'k',
    attemptCount: 1,
    requestedAcademyName: 'Nile Academy',
    requestedSubdomain: 'nile',
    selectedThemeKey: 'modern-education',
    websiteSetupMode: 'complete',
    stage: 'academy',
    stalled: false,
    stallThresholdSeconds: 120,
    lastProgressAt: '2026-10-03T10:00:00Z',
    createdAt: '2026-10-03T10:00:00Z',
    startedAt: '2026-10-03T10:00:00Z',
    ...over,
  };
}

let getRequest: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getRequest = vi.fn();
  vi.spyOn(provisioningService, 'getProvisioningRequest').mockImplementation(
    () => getRequest() as Promise<ProvisioningRequest>
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  pendingLogoStore.clear('req-1');
});

function renderPage(language: 'en' | 'ar' = 'en') {
  const identity = {
    user: { id: 'u1' },
    organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
  } as unknown as IdentityContextValue;
  const platform = {
    setActiveAcademy: vi.fn(),
  } as unknown as PlatformContextValue;
  const dialog = {
    confirm: vi.fn(async () => true),
  } as unknown as DialogContextValue;
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <PlatformContext.Provider value={platform}>
              <DialogContext.Provider value={dialog}>
                <MemoryRouter
                  initialEntries={['/dashboard/provisioning/req-1']}
                >
                  <Routes>
                    <Route
                      path="/dashboard/provisioning/:requestId"
                      element={<ProvisioningStatusPage />}
                    />
                  </Routes>
                </MemoryRouter>
              </DialogContext.Provider>
            </PlatformContext.Provider>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const stage = (key: string) => screen.getByTestId(`provisioning-stage-${key}`);
const liveRegion = () =>
  screen
    .getAllByRole('status')
    .find((node) => node.getAttribute('aria-atomic') === 'true')!;

describe('ProvisioningStatusPage — honest progress (W2)', () => {
  it('shows only the four real stages, driven by the server step states, and announces the current one', async () => {
    getRequest.mockResolvedValue(request());
    renderPage();
    await screen.findByTestId('provisioning-progress');

    const items = within(
      screen.getByRole('list', { name: 'Setup progress' })
    ).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-testid'))).toEqual([
      'provisioning-stage-academy',
      'provisioning-stage-website',
      'provisioning-stage-brand',
      'provisioning-stage-ready',
    ]);
    expect(stage('academy').getAttribute('data-state')).toBe('current');
    expect(stage('academy').getAttribute('aria-current')).toBe('step');
    expect(stage('website').getAttribute('data-state')).toBe('pending');
    expect(stage('website').textContent).toContain(
      'Build your website with starter pages'
    );
    // Nothing chosen in the form → theme default colours, not "skipped" noise.
    expect(stage('brand').textContent).toContain(
      "Use the theme's default colours"
    );
    // No raw step rows (tenant, domain…) and no percentages anywhere.
    expect(screen.queryByText('Connecting your custom domain')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\d+\s?%/);

    const region = liveRegion();
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent).toBe(
      'Creating Nile Academy and reserving its address.'
    );
    expect(screen.queryByTestId('provisioning-stalled')).toBeNull();
  });

  it('a stalled request says so and offers Retry, which resumes it on the server', async () => {
    getRequest.mockResolvedValue(request({ stalled: true }));
    const retry = vi
      .spyOn(provisioningService, 'retryProvisioning')
      .mockResolvedValue(request());
    const user = userEvent.setup();
    renderPage();
    const notice = await screen.findByTestId('provisioning-stalled');
    expect(notice.textContent).toContain(
      "Setup hasn't made progress for a while"
    );
    expect(liveRegion().textContent).toContain('has stopped making progress');
    await user.click(within(notice).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith('org-1', 'req-1'));
  });

  it('a failed request shows the failed stage with its reason and Retry', async () => {
    getRequest.mockResolvedValue(
      request({
        status: 'failed',
        currentStepKey: 'academy',
        steps: steps(
          { tenant: 'completed', academy: 'failed' },
          { academy: 'errors.provisioning.subdomainUnavailable' }
        ),
        lastError: {
          code: 'subdomain_taken',
          messageKey: 'errors.provisioning.subdomainUnavailable',
        },
      })
    );
    const retry = vi
      .spyOn(provisioningService, 'retryProvisioning')
      .mockResolvedValue(request());
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Provisioning could not be completed');
    expect(stage('academy').getAttribute('data-state')).toBe('failed');
    expect(stage('academy').textContent).toContain(
      'This address is already taken'
    );
    expect(liveRegion().textContent).toBe(
      'Setup of Nile Academy could not be completed.'
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith('org-1', 'req-1'));
  });

  it('a branding failure does not block ready: the Academy is ready with a "Retry branding" warning', async () => {
    getRequest.mockResolvedValue(
      request({
        status: 'ready',
        stage: 'ready',
        currentStepKey: 'finalization',
        academyId: 'acad-1',
        requestedBrand: { palette: true, logo: 'none' },
        steps: steps(
          { ...ALL_DONE, branding: 'failed' },
          { branding: 'errors.provisioning.stepFailed' }
        ),
      })
    );
    const retry = vi
      .spyOn(provisioningService, 'retryProvisioning')
      .mockResolvedValue(request({ status: 'ready', steps: steps(ALL_DONE) }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Your Academy is ready');
    expect(stage('ready').getAttribute('data-state')).toBe('done');
    expect(stage('brand').getAttribute('data-state')).toBe('failed');
    const warning = screen.getByTestId('provisioning-branding-failed');
    expect(warning.textContent).toContain('your branding could not be applied');
    expect(liveRegion().textContent).toContain(
      'is ready, but its branding could not be applied'
    );
    await user.click(
      within(warning).getByRole('button', { name: 'Retry branding' })
    );
    await waitFor(() => expect(retry).toHaveBeenCalledWith('org-1', 'req-1'));
  });

  it('a ready Academy with nothing chosen offers "View your website" (it is always built)', async () => {
    getRequest.mockResolvedValue(
      request({
        status: 'ready',
        currentStepKey: 'finalization',
        academyId: 'acad-1',
        steps: steps({ ...ALL_DONE, branding: 'skipped' }),
      })
    );
    renderPage();
    await screen.findByText('Your Academy is ready');
    expect(stage('brand').getAttribute('data-state')).toBe('skipped');
    expect(
      screen.getByRole('button', { name: 'View your website' })
    ).toBeTruthy();
    expect(screen.queryByTestId('provisioning-branding-failed')).toBeNull();
    expect(liveRegion().textContent).toBe('Nile Academy is ready.');
  });

  it('attaches the logo from the form once the Academy exists, inline on the brand stage', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', {
      type: 'image/png',
    });
    pendingLogoStore.set('req-1', file);
    getRequest.mockResolvedValue(
      request({
        status: 'ready',
        currentStepKey: 'finalization',
        academyId: 'acad-1',
        requestedBrand: { palette: true, logo: 'awaiting_upload' },
        steps: steps(ALL_DONE),
      })
    );
    const upload = vi.spyOn(mediaService, 'uploadAsset').mockResolvedValue({
      id: 'asset-1',
      url: '/api/v1/public/media/x.png',
    } as never);
    const attach = vi
      .spyOn(provisioningService, 'attachProvisioningLogo')
      .mockResolvedValue(
        request({
          status: 'ready',
          academyId: 'acad-1',
          requestedBrand: { palette: true, logo: 'attached' },
          steps: steps(ALL_DONE),
        })
      );
    renderPage();
    await waitFor(() =>
      expect(attach).toHaveBeenCalledWith('org-1', 'req-1', 'asset-1')
    );
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toBe('acad-1');
    await waitFor(() =>
      expect(stage('brand').getAttribute('data-state')).toBe('done')
    );
  });

  it('after a reload, a logo that never uploaded is reported honestly with a link to add it', async () => {
    getRequest.mockResolvedValue(
      request({
        status: 'ready',
        currentStepKey: 'finalization',
        academyId: 'acad-1',
        requestedBrand: { palette: false, logo: 'awaiting_upload' },
        steps: steps({ ...ALL_DONE, branding: 'skipped' }),
      })
    );
    renderPage();
    await screen.findByText('Your Academy is ready');
    expect(stage('brand').getAttribute('data-state')).toBe('attention');
    expect(stage('brand').textContent).toContain("Your logo wasn't added");
    const link = within(stage('brand')).getByRole('link', {
      name: 'Add your logo in Branding',
    });
    expect(link.getAttribute('href')).toBe(
      '/dashboard/academy/acad-1/branding'
    );
  });

  it('a failed refetch while running reads "Reconnecting…", never a failure', async () => {
    getRequest.mockResolvedValueOnce(request()).mockRejectedValue(
      new ApiError({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      })
    );
    renderPage();
    await screen.findByTestId('provisioning-progress');
    expect(
      await screen.findByText(/Reconnecting/, undefined, { timeout: 3000 })
    ).toBeTruthy();
    expect(
      screen.queryByText('Provisioning could not be completed')
    ).toBeNull();
    expect(stage('academy').getAttribute('data-state')).toBe('current');
  });

  it('renders the same states in Arabic', async () => {
    getRequest.mockResolvedValue(request({ stalled: true }));
    renderPage('ar');
    await screen.findByTestId('provisioning-stalled');
    expect(stage('academy').textContent).toContain(
      'إنشاء أكاديميتك وحجز عنوانها'
    );
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy();
    expect(liveRegion().textContent).toContain('توقف إعداد');
  });
});

describe('provisioning progress — polling and derivation (W2)', () => {
  it('polls about every second for the first 30 s, then every 4 s', () => {
    expect(provisioningPollInterval(0)).toBe(
      PROVISIONING_FAST_POLL_INTERVAL_MS
    );
    expect(provisioningPollInterval(29_999)).toBe(1000);
    expect(provisioningPollInterval(30_000)).toBe(
      PROVISIONING_STATUS_POLL_INTERVAL_MS
    );
    expect(provisioningPollInterval(10 * 60_000)).toBe(4000);
  });

  it('stops polling at a terminal state (one request, no more)', async () => {
    getRequest.mockResolvedValue(
      request({ status: 'ready', academyId: 'acad-1', steps: steps(ALL_DONE) })
    );
    renderPage();
    await screen.findByText('Your Academy is ready');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(getRequest).toHaveBeenCalledTimes(1);
  });

  it('polls again within about a second while running', async () => {
    getRequest.mockResolvedValue(request());
    renderPage();
    await screen.findByTestId('provisioning-progress');
    await waitFor(
      () => expect(getRequest.mock.calls.length).toBeGreaterThanOrEqual(2),
      {
        timeout: 2500,
      }
    );
  });

  it('a stage is current only once a worker picked the request up', () => {
    const queued = deriveProvisioningStages(
      request({
        startedAt: undefined,
        currentStepKey: 'tenant',
        steps: steps({}),
      })
    );
    expect(queued.map((s) => s.state)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    const building = deriveProvisioningStages(
      request({
        status: 'academy_created',
        currentStepKey: 'theme',
        steps: steps({
          tenant: 'completed',
          academy: 'completed',
          theme: 'running',
        }),
      })
    );
    expect(building.map((s) => s.state)).toEqual([
      'done',
      'current',
      'pending',
      'pending',
    ]);
  });
});
