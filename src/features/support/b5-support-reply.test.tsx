/**
 * B5 (UX audit) — support reply and new ticket.
 *
 *  V19  the reply has the server's 5,000 limit with a counter, is never cut
 *       silently, says what is wrong when empty, and a failed send is ONE
 *       inline message with the real reason (typed text kept).
 *  V27  a server length refusal without its number gets the known limit;
 *       a 500 never blames "the details".
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
import { withKnownLimits } from './components/CreateSupportCaseDialog';
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
});

const CASE = {
  id: 'case-1',
  subject: 'Videos do not play',
  status: 'open',
  messages: [
    {
      id: 'm1',
      authorRole: 'customer',
      authorName: 'Sarah',
      body: 'The lesson video spins forever.',
      createdAt: '2026-11-05T10:00:00Z',
      attachments: [],
    },
  ],
} as unknown as SupportCaseDetail;

function renderPage(language: LanguageCode = 'en') {
  vi.spyOn(mySupportService, 'getMyCase').mockResolvedValue(CASE);
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

describe('V19 — replying to a ticket', () => {
  it('counts against the real limit and never cuts the text', async () => {
    renderPage();
    const box = await screen.findByTestId('support-reply');
    expect(box.hasAttribute('maxlength')).toBe(false);
    expect(screen.getByTestId('support-reply-count').textContent).toBe(
      '0 / 5000 characters'
    );
    fireEvent.change(box, { target: { value: 'r'.repeat(5001) } });
    expect((box as HTMLTextAreaElement).value).toHaveLength(5001);
    fireEvent.click(screen.getByTestId('send-reply'));
    expect(screen.getByTestId('support-reply-error').textContent).toBe(
      'Your reply must be 5000 characters or fewer'
    );
  });

  it('is never greyed: an empty reply says what to do', async () => {
    renderPage();
    const send = await screen.findByTestId('send-reply');
    expect(send.hasAttribute('disabled')).toBe(false);
    fireEvent.click(send);
    expect(screen.getByTestId('support-reply-error').textContent).toBe(
      'Write your reply first.'
    );
  });

  it('shows a failed send once, inline, with the reason — and keeps the text', async () => {
    vi.spyOn(mySupportService, 'replyToMyCase').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.support.caseClosed',
      })
    );
    renderPage();
    const box = await screen.findByTestId('support-reply');
    fireEvent.change(box, { target: { value: 'Still broken today.' } });
    fireEvent.click(screen.getByTestId('send-reply'));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("Your reply wasn't sent");
    expect(alert.textContent).toContain('This ticket is closed.');
    expect((box as HTMLTextAreaElement).value).toBe('Still broken today.');
    await waitFor(() => expect(toastValue.notifyError).not.toHaveBeenCalled());
  });

  it('editing the reply clears the last failure', async () => {
    vi.spyOn(mySupportService, 'replyToMyCase').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.support.caseClosed',
      })
    );
    renderPage();
    const box = await screen.findByTestId('support-reply');
    fireEvent.change(box, { target: { value: 'Still broken today.' } });
    fireEvent.click(screen.getByTestId('send-reply'));
    await screen.findByTestId('save-failed');
    fireEvent.change(box, { target: { value: 'Still broken today!' } });
    await waitFor(() => expect(screen.queryByTestId('save-failed')).toBeNull());
  });

  it('says it in Arabic', async () => {
    renderPage('ar');
    fireEvent.click(await screen.findByTestId('send-reply'));
    expect(screen.getByTestId('support-reply-error').textContent).toBe(
      'اكتب ردّك أولًا.'
    );
  });
});

describe('V27 — a new ticket', () => {
  it('fills the known limit into a server length refusal without one', () => {
    const error = createApiError('validation', {
      violations: [
        { field: 'subject', messageKey: 'validation:maxLength' },
        { field: 'other', messageKey: 'validation:maxLength' },
      ],
    });
    const filled = withKnownLimits(error);
    expect(filled?.violations?.[0].values).toEqual({ count: 200 });
    expect(filled?.violations?.[1].values).toBeUndefined();
  });

  it('no longer blames "the details" for a server failure', () => {
    const i18n = createI18nInstance('en');
    expect(i18n.t('support:create.notSubmitted')).toBe(
      "Your ticket wasn't submitted"
    );
  });
});
