/**
 * W3-compose — the shared composer and its helpers.
 *
 * Pinned (native DOM assertions, echoed `t` keys):
 *   - sending is impossible before a preview, and a preview is discarded
 *     when the channels change;
 *   - an over-quota preview disables sending (nothing is truncated);
 *   - the confirm button is disabled while the request is in flight;
 *   - a retry after an ambiguous failure REUSES the idempotency key, a
 *     changed draft gets a NEW one;
 *   - 409 (audience changed) re-previews and explains; 422 quota explains;
 *   - the client allowlist strips scripts, images, attributes and unsafe links;
 *   - the quota meter shows the server's numbers.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApiError } from '@api';

// Radix checkboxes measure themselves; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??=
  ResizeObserverStub;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
    i18n: { language: 'en', exists: () => true },
  }),
}));
const notifySuccess = vi.fn();
vi.mock('@app/providers', () => ({
  useToast: () => ({
    notifySuccess,
    notifyError: vi.fn(),
    notify: vi.fn(),
    dismissAll: vi.fn(),
  }),
}));
vi.mock('@hooks', () => ({
  useDateFormatter: () => ({
    date: () => '1 Nov 2026',
    dateTime: () => '3 Oct 2026 10:00',
  }),
}));

import { MessageComposer } from './components/MessageComposer';
import { QuotaMeter } from './components/QuotaMeter';
import { sanitizeMessageHtml, safeMessageHref } from './utils/message-html';
import type { CampaignPreview } from './messaging.types';

const PREVIEW: CampaignPreview = {
  recipientCount: 5,
  emailCount: 3,
  inAppCount: 5,
  excluded: { optedOut: 1, suppressed: 1, blocked: 0, pending: 0 },
  requiresConfirmation: false,
  quota: {
    limit: 50,
    used: 23,
    remaining: 27,
    periodStart: '2026-10-01T00:00:00.000Z',
    resetsAt: '2026-11-01T00:00:00.000Z',
  },
  overBy: 0,
};

function apiError(
  code: string,
  details: Record<string, number> = {}
): ApiError {
  return {
    kind: 'conflict',
    messageKey: `errors.${code}`,
    code,
    details,
    retryable: false,
  } as unknown as ApiError;
}

function renderComposer(
  overrides: Partial<Parameters<typeof MessageComposer>[0]> = {}
) {
  const onPreview = vi.fn().mockResolvedValue(PREVIEW);
  const onSend = vi.fn().mockResolvedValue({
    campaignId: 'c1',
    status: 'queued',
    recipientCount: 5,
    emailCount: 3,
    inAppCount: 5,
    replayed: false,
    quota: null,
  });
  const utils = render(
    <MessageComposer
      idPrefix="t"
      audience={{ type: 'learners' }}
      audienceSlot={<div />}
      onPreview={onPreview}
      isPreviewing={false}
      onSend={onSend}
      isSending={false}
      {...overrides}
    />
  );
  return { ...utils, onPreview, onSend };
}

async function fillDraft(
  subject = 'Class update',
  body = '<p>Hello class</p>'
) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId('message-subject'), subject);
  const editor = screen.getByTestId('message-body-editor');
  editor.innerHTML = body;
  fireEvent.input(editor);
  return user;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MessageComposer', () => {
  it('cannot send before a preview, and previews with the audience and channels', async () => {
    const { onPreview } = renderComposer();
    const user = await fillDraft();
    const send = screen.getByTestId('message-send-button') as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    await user.click(screen.getByTestId('message-preview-button'));
    expect(onPreview).toHaveBeenCalledWith({
      audience: { type: 'learners' },
      channels: { email: true, inApp: true },
    });
    expect(screen.getByTestId('preview-recipients').textContent).toBe('5');
    expect(screen.getByTestId('preview-emails').textContent).toBe('3');
    expect(send.disabled).toBe(false);
  });

  it('discards the preview when a channel changes', async () => {
    renderComposer();
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    expect(screen.queryByTestId('message-preview')).not.toBeNull();
    await user.click(screen.getByTestId('channel-email'));
    expect(screen.queryByTestId('message-preview')).toBeNull();
    expect(
      (screen.getByTestId('message-send-button') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('disables sending when the emails exceed the remaining quota', async () => {
    renderComposer({
      onPreview: vi.fn().mockResolvedValue({ ...PREVIEW, overBy: 2 }),
    });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    expect(screen.queryByTestId('preview-over-quota')).not.toBeNull();
    expect(
      (screen.getByTestId('message-send-button') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('sends with the previewed count and reuses the idempotency key on retry', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      })
      .mockResolvedValueOnce({ campaignId: 'c1', recipientCount: 5 });
    renderComposer({ onSend });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));

    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    const first = onSend.mock.calls[0][0];
    expect(first).toMatchObject({
      subject: 'Class update',
      bodyHtml: '<p>Hello class</p>',
      expectedRecipientCount: 5,
      audience: { type: 'learners' },
    });
    expect(first.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);

    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(2));
    expect(onSend.mock.calls[1][0].idempotencyKey).toBe(first.idempotencyKey);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
  });

  it('uses a new idempotency key when the draft changes after a failure', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce({
        kind: 'server',
        messageKey: 'errors.server',
        retryable: true,
      })
      .mockResolvedValueOnce({ campaignId: 'c1', recipientCount: 5 });
    renderComposer({ onSend });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));

    await user.type(screen.getByTestId('message-subject'), '!');
    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(2));
    expect(onSend.mock.calls[1][0].idempotencyKey).not.toBe(
      onSend.mock.calls[0][0].idempotencyKey
    );
  });

  it('shows the backend refusal in the errors namespace, not a generic error', async () => {
    const onPreview = vi
      .fn()
      .mockRejectedValue(apiError('messaging.academyInactive'));
    renderComposer({ onPreview });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    // The i18n mock renders `key:defaultValue`; the key must be the
    // namespaced backend key (a raw `errors.…` key never resolves).
    expect(
      await screen.findByText(/^errors:messaging\.academyInactive/)
    ).not.toBeNull();
  });

  it('disables the confirm button while sending (no double submit)', async () => {
    const { rerender, onPreview, onSend } = renderComposer();
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    rerender(
      <MessageComposer
        idPrefix="t"
        audience={{ type: 'learners' }}
        audienceSlot={<div />}
        onPreview={onPreview}
        isPreviewing={false}
        onSend={onSend}
        isSending
      />
    );
    expect(
      (screen.getByTestId('confirm-send') as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('re-previews and explains when the audience changed since the preview (409)', async () => {
    const onPreview = vi
      .fn()
      .mockResolvedValueOnce(PREVIEW)
      .mockResolvedValueOnce({ ...PREVIEW, recipientCount: 6 });
    const onSend = vi
      .fn()
      .mockRejectedValue(apiError('CAMPAIGN_AUDIENCE_CHANGED'));
    renderComposer({ onPreview, onSend });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    await waitFor(() => expect(onPreview).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText('messaging:notice.audienceChangedTitle')
    ).toBeTruthy();
    expect(screen.getByTestId('preview-recipients').textContent).toBe('6');
  });

  it('explains a quota refusal (422) with the remaining count', async () => {
    const onSend = vi
      .fn()
      .mockRejectedValue(
        apiError('ACADEMY_EMAIL_QUOTA_EXCEEDED', { remaining: 2, requested: 3 })
      );
    renderComposer({ onSend });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    const alert = await screen.findByTestId('quota-exceeded-alert');
    expect(alert.textContent).toContain('messaging:notice.quota:2,3');
  });

  it('requires an explicit tick for an audience of 1,000 or more', async () => {
    const onSend = vi
      .fn()
      .mockResolvedValue({ campaignId: 'c', recipientCount: 1200 });
    renderComposer({
      onPreview: vi.fn().mockResolvedValue({
        ...PREVIEW,
        recipientCount: 1200,
        emailCount: 1200,
        quota: null,
        requiresConfirmation: true,
      }),
      onSend,
    });
    const user = await fillDraft();
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    const confirm = screen.getByTestId('confirm-send') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    await user.click(screen.getByTestId('confirm-large-audience'));
    expect(confirm.disabled).toBe(false);
    await act(async () => {
      await user.click(confirm);
    });
    expect(onSend.mock.calls[0][0].confirmLargeAudience).toBe(true);
  });
});

describe('client allowlist', () => {
  it('keeps allowlisted structure and drops everything else', () => {
    const html = sanitizeMessageHtml(
      '<div onclick="x()"><b>Bold</b> <span style="color:red">text</span></div>' +
        '<script>alert(1)</script><img src="https://t.example/p.gif">' +
        '<a href="javascript:alert(1)">bad</a> <a href="https://atlas.example/x">good</a>'
    );
    expect(html).toContain('<p><strong>Bold</strong> text</p>');
    expect(html).not.toMatch(/script|img|onclick|style|javascript/);
    expect(html).toContain('bad');
    expect(html).toContain('href="https://atlas.example/x"');
  });

  it('accepts only https and mailto links', () => {
    expect(safeMessageHref('https://a.example')).toBe('https://a.example/');
    expect(safeMessageHref('mailto:hi@example.com')).toBe(
      'mailto:hi@example.com'
    );
    expect(safeMessageHref('http://a.example')).toBeNull();
    expect(safeMessageHref('java\tscript:alert(1)')).toBeNull();
  });

  it('returns empty for content with no visible text', () => {
    expect(sanitizeMessageHtml('<p> </p><img src="x">')).toBe('');
  });
});

describe('QuotaMeter', () => {
  it('shows used, limit and reset date from the server', () => {
    render(<QuotaMeter quota={PREVIEW.quota!} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('23');
    expect(bar.getAttribute('aria-valuemax')).toBe('50');
    expect(screen.getByTestId('quota-meter').textContent).toContain(
      'messaging:quota.usage:23,50,1 Nov 2026'
    );
  });

  it('says unlimited when the plan has no cap', () => {
    render(
      <QuotaMeter quota={{ ...PREVIEW.quota!, limit: null, remaining: null }} />
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByTestId('quota-meter').textContent).toContain(
      'messaging:quota.unlimited'
    );
  });
});
