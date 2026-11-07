/**
 * B5 (UX audit) V35 — a customer closes their own support ticket.
 *
 * "Close ticket" asks first (and says a closed ticket takes no replies and
 * can't be reopened), closes it through `POST /support-cases/mine/:id/close`,
 * then the ticket reads as closed and the reply box is gone. Cancelling
 * changes nothing; a failure is one inline message, never a toast.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { createApiError } from '@api';
import { mySupportService } from './services/SupportService';
import SupportCaseDetailPage from './pages/SupportCaseDetailPage';
import type { LanguageCode, SupportCaseDetail } from '@types';

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(toastValue.notifySuccess).mockClear();
  vi.mocked(toastValue.notifyError).mockClear();
});

const OPEN = {
  id: 'case-1',
  subject: 'Videos do not play',
  status: 'open',
  messages: [
    {
      id: 'm1',
      authorRole: 'requester',
      authorName: 'Sarah',
      body: 'The lesson video spins forever.',
      createdAt: '2026-11-05T10:00:00Z',
      attachments: [],
    },
  ],
} as unknown as SupportCaseDetail;
const CLOSED = { ...OPEN, status: 'closed' } as SupportCaseDetail;

function renderPage(language: LanguageCode = 'en') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(language)}>
        <AtlasDialogProvider>
          <ToastContext.Provider value={toastValue}>
            <MemoryRouter initialEntries={['/dashboard/support/case-1']}>
              <Routes>
                <Route
                  path="/dashboard/support/:caseId"
                  element={<SupportCaseDetailPage />}
                />
              </Routes>
            </MemoryRouter>
          </ToastContext.Provider>
        </AtlasDialogProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('B5 V35 — closing my ticket', () => {
  it('asks first, closes it, and the ticket then reads as closed with no reply box', async () => {
    const getMyCase = vi
      .spyOn(mySupportService, 'getMyCase')
      .mockResolvedValueOnce(OPEN)
      .mockResolvedValue(CLOSED);
    const close = vi
      .spyOn(mySupportService, 'closeMyCase')
      .mockResolvedValue(CLOSED);
    renderPage();

    fireEvent.click(await screen.findByTestId('close-ticket'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Close this ticket?');
    expect(dialog.textContent).toContain("You can't reply to a closed ticket");
    expect(close).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close ticket' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith('case-1'));
    await waitFor(() =>
      expect(toastValue.notifySuccess).toHaveBeenCalledWith(
        'support:detail.closeTicket.closed'
      )
    );
    await waitFor(() =>
      expect(screen.queryByTestId('support-reply')).toBeNull()
    );
    expect(screen.getByText(/This ticket is closed/)).toBeTruthy();
    expect(screen.queryByTestId('close-ticket')).toBeNull();
    expect(getMyCase.mock.calls.length).toBeGreaterThan(1);
  });

  it('changes nothing when the customer keeps it open', async () => {
    vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(OPEN);
    const close = vi.spyOn(mySupportService, 'closeMyCase');
    renderPage();
    fireEvent.click(await screen.findByTestId('close-ticket'));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Keep it open' })
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByTestId('support-reply')).toBeTruthy();
  });

  it('warns that an unsent reply is discarded', async () => {
    vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(OPEN);
    renderPage();
    fireEvent.change(await screen.findByTestId('support-reply'), {
      target: { value: 'Half-typed reply' },
    });
    fireEvent.click(screen.getByTestId('close-ticket'));
    expect((await screen.findByRole('alertdialog')).textContent).toContain(
      'Your unsent reply will be discarded.'
    );
  });

  it('shows a failure once, inline, with the reason', async () => {
    vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(OPEN);
    vi.spyOn(mySupportService, 'closeMyCase').mockRejectedValue(
      createApiError('server', { status: 500 })
    );
    renderPage();
    fireEvent.click(await screen.findByTestId('close-ticket'));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Close ticket' })
    );
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("The ticket wasn't closed");
    expect(toastValue.notifyError).not.toHaveBeenCalled();
    expect(toastValue.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByTestId('support-reply')).toBeTruthy();
  });

  it('is offered in Arabic, and not at all on a closed ticket', async () => {
    vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(OPEN);
    renderPage('ar');
    expect((await screen.findByTestId('close-ticket')).textContent).toBe(
      'إغلاق التذكرة'
    );
    cleanup();
    vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(CLOSED);
    renderPage();
    await screen.findByText(/This ticket is closed/);
    expect(screen.queryByTestId('close-ticket')).toBeNull();
  });
});
