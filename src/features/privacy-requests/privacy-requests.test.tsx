/**
 * B0-SEC-13 — privacy requests in the UI.
 *
 *   - the learner card files a request only after an emailed code: step one
 *     asks for the code, step two sends the challenge id and the code;
 *   - an open request of a type disables that button and says why; a
 *     declined request shows its reason; a ready export downloads signed in;
 *   - a Platform Owner is not offered the card (the server refuses anyway);
 *   - the Platform Owner deletes only after typing DELETE, and declines only
 *     with a reason;
 *   - Arabic renders the card right-to-left.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import type { CurrentUser } from '@types';
import { PrivacyRequestsCard } from './components/PrivacyRequestsCard';
import PlatformPrivacyRequestDetailPage from './pages/PlatformPrivacyRequestDetailPage';
import { privacyRequestService } from './services/PrivacyRequestService';
import { platformPrivacyRequestService } from './services/PlatformPrivacyRequestService';
import type { MyPrivacyRequest, PlatformPrivacyRequest } from './types';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

const LEARNER = {
  id: 'u-1',
  name: 'Sara',
  email: 'sara@example.com',
  roles: ['student'],
  permissions: [],
  organizations: [],
  organizationMemberships: [],
} as unknown as CurrentUser;
const OWNER = {
  ...LEARNER,
  roles: ['platform_owner'],
} as unknown as CurrentUser;

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const CHALLENGE = {
  challengeId: '11111111-1111-4111-8111-111111111111',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  maskedEmail: 's•••@example.com',
};

function mine(overrides: Partial<MyPrivacyRequest> = {}): MyPrivacyRequest {
  return {
    id: 'r-1',
    type: 'export',
    status: 'submitted',
    createdAt: '2026-10-13T09:00:00.000Z',
    completedAt: null,
    resolutionNote: null,
    exportAvailableUntil: null,
    canDownload: false,
    ...overrides,
  };
}

function wrap(
  children: ReactNode,
  user: CurrentUser,
  language: 'en' | 'ar' = 'en',
  path = '/'
) {
  const identity = {
    session: { status: 'authenticated', user },
    user,
    signOut: vi.fn(),
  } as unknown as IdentityContextValue;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <I18nextProvider i18n={createI18nInstance(language)}>
      <QueryClientProvider client={client}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter initialEntries={[path]}>
              <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
            </MemoryRouter>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function typeCode(code: string): void {
  const input =
    screen.getByTestId('privacy-request-code').querySelector('input') ??
    (screen.getByTestId('privacy-request-code') as HTMLInputElement);
  fireEvent.change(input, { target: { value: code } });
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => cleanup());

describe('PrivacyRequestsCard (learner)', () => {
  it('files a request only with the emailed code', async () => {
    vi.spyOn(privacyRequestService, 'listMine').mockResolvedValue([]);
    const requestCode = vi
      .spyOn(privacyRequestService, 'requestCode')
      .mockResolvedValue(CHALLENGE);
    const file = vi
      .spyOn(privacyRequestService, 'file')
      .mockResolvedValue(mine({ type: 'deletion' }));

    render(wrap(<PrivacyRequestsCard />, LEARNER));
    const deletion = await screen.findByTestId('privacy-request-deletion');
    await waitFor(() =>
      expect((deletion as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(deletion);

    // Step one files nothing.
    fireEvent.click(await screen.findByTestId('privacy-request-send-code'));
    await screen.findByTestId('privacy-request-code-step');
    expect(requestCode).toHaveBeenCalledTimes(1);
    expect(file).not.toHaveBeenCalled();
    expect(screen.getByText(/s•••@example\.com/)).toBeTruthy();

    const submit = screen.getByTestId('privacy-request-submit');
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    typeCode('123456');
    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(submit);

    await waitFor(() =>
      expect(file).toHaveBeenCalledWith({
        type: 'deletion',
        challengeId: CHALLENGE.challengeId,
        code: '123456',
      })
    );
    await waitFor(() =>
      expect(toastValue.notifySuccess).toHaveBeenCalledWith(
        'profile:privacyRequests.submitted'
      )
    );
  });

  it('blocks a second open request, shows a decline reason, and downloads a ready export', async () => {
    vi.spyOn(privacyRequestService, 'listMine').mockResolvedValue([
      mine({ id: 'r-open', type: 'deletion', status: 'in_progress' }),
      mine({
        id: 'r-ready',
        type: 'export',
        status: 'completed',
        canDownload: true,
        exportAvailableUntil: new Date(Date.now() + 86_400_000).toISOString(),
      }),
      mine({
        id: 'r-declined',
        type: 'export',
        status: 'rejected',
        resolutionNote: 'Payment dispute open.',
      }),
    ]);
    const download = vi
      .spyOn(privacyRequestService, 'downloadExport')
      .mockResolvedValue({ format: 'atlas-personal-data-export' });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    // jsdom cannot navigate; the anchor click is the browser's part.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );

    render(wrap(<PrivacyRequestsCard />, LEARNER));
    await screen.findByTestId('privacy-request-history');

    expect(
      (screen.getByTestId('privacy-request-deletion') as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByTestId('privacy-request-export') as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      screen.getByText('You already have an open request of this kind.')
    ).toBeTruthy();
    expect(screen.getByText('Reason: Payment dispute open.')).toBeTruthy();

    fireEvent.click(screen.getByTestId('privacy-request-download'));
    await waitFor(() => expect(download).toHaveBeenCalledWith('r-ready'));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('is not offered to a Platform Owner', () => {
    vi.spyOn(privacyRequestService, 'listMine').mockResolvedValue([]);
    const { container } = render(wrap(<PrivacyRequestsCard />, OWNER));
    expect(container.textContent).toBe('');
  });

  it('renders right-to-left in Arabic', async () => {
    vi.spyOn(privacyRequestService, 'listMine').mockResolvedValue([]);
    render(wrap(<PrivacyRequestsCard />, LEARNER, 'ar'));
    expect(await screen.findByText('بياناتك')).toBeTruthy();
    expect(
      screen.getByText('بياناتك').closest('[dir]')?.getAttribute('dir')
    ).toBe('rtl');
  });
});

describe('PlatformPrivacyRequestDetailPage', () => {
  function request(
    overrides: Partial<PlatformPrivacyRequest> = {}
  ): PlatformPrivacyRequest {
    return {
      id: 'r-9',
      type: 'deletion',
      status: 'submitted',
      userId: 'u-9',
      requesterName: 'Omar',
      requesterEmail: 'omar@example.com',
      academyId: 'a-1',
      academyName: 'Falcon Academy',
      resolutionNote: null,
      handledByUserId: null,
      exportAvailableUntil: null,
      completedAt: null,
      createdAt: '2026-10-13T09:00:00.000Z',
      updatedAt: '2026-10-13T09:00:00.000Z',
      ...overrides,
    };
  }

  const renderPage = () =>
    render(
      wrap(
        <Routes>
          <Route
            path="/dashboard/platform/privacy-requests/:requestId"
            element={<PlatformPrivacyRequestDetailPage />}
          />
        </Routes>,
        OWNER,
        'en',
        '/dashboard/platform/privacy-requests/r-9'
      )
    );

  it('deletes only after DELETE is typed', async () => {
    vi.spyOn(platformPrivacyRequestService, 'get').mockResolvedValue(request());
    const fulfil = vi
      .spyOn(platformPrivacyRequestService, 'fulfil')
      .mockResolvedValue(request({ status: 'completed' }));

    renderPage();
    fireEvent.click(await screen.findByTestId('privacy-request-fulfil'));
    const confirm = await screen.findByTestId('privacy-request-delete-confirm');
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('privacy-request-delete-typed'), {
      target: { value: 'delete' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('privacy-request-delete-typed'), {
      target: { value: 'DELETE' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(fulfil).toHaveBeenCalledWith('r-9'));
  });

  it('declines only with a reason', async () => {
    vi.spyOn(platformPrivacyRequestService, 'get').mockResolvedValue(
      request({ type: 'export' })
    );
    const update = vi
      .spyOn(platformPrivacyRequestService, 'updateStatus')
      .mockResolvedValue(request({ status: 'rejected' }));

    renderPage();
    fireEvent.click(await screen.findByTestId('privacy-request-reject'));
    const confirm = await screen.findByTestId('privacy-request-reject-confirm');
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason (sent to the person)'), {
      target: { value: 'Open payment dispute.' },
    });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('r-9', {
        status: 'rejected',
        note: 'Open payment dispute.',
      })
    );
  });
});
