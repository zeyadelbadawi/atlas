/**
 * B4 (UX audit) — Messages, with the real EN/AR catalogues:
 *   V03 a failed PREVIEW says the preview failed (not "not sent"), next to
 *       its button, with the real reason — never a raw "internal"; a lost
 *       connection reads as one; a failed SEND keeps "not sent";
 *   V08 leaving with a typed message is protected (unsaved registry);
 *   V28 a greyed Preview says why (no course / role ticked).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??=
  ResizeObserverStub;

const state = vi.hoisted(() => ({
  unsaved: [] as boolean[],
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    notify: vi.fn(),
    dismissAll: vi.fn(),
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUnsavedChanges: ({ isDirty }: { isDirty: boolean }) => {
    state.unsaved.push(isDirty);
    return { markSaved: () => undefined };
  },
}));

const { MessageComposer } = await import('./components/MessageComposer');

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function renderComposer(
  overrides: Partial<Parameters<typeof MessageComposer>[0]> = {},
  language: 'en' | 'ar' = 'en'
) {
  const onPreview = vi.fn();
  const onSend = vi.fn();
  render(
    <I18nextProvider i18n={I18N[language]}>
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
    </I18nextProvider>
  );
  return { onPreview, onSend };
}

afterEach(() => {
  cleanup();
  state.unsaved = [];
});

describe('a failed preview (V03)', () => {
  it('a 500 says the PREVIEW failed, with the real reason — not "not sent", no raw code', async () => {
    const onPreview = vi.fn().mockRejectedValue(
      createApiError('server', {
        messageKey: 'errors.internal',
        requestId: 'audit-500',
      })
    );
    renderComposer({ onPreview });
    fireEvent.click(screen.getByTestId('message-preview-button'));
    const alert = await screen.findByTestId('message-preview-failed');
    expect(alert.textContent).toContain(
      "The recipient preview couldn't be loaded"
    );
    expect(alert.textContent).toContain('Something failed on our side');
    expect(alert.textContent).toContain('Reference: audit-500');
    expect(alert.textContent).not.toMatch(/\binternal\b/);
    expect(screen.queryByText('The message was not sent')).toBeNull();
    // It sits right above the buttons it is about.
    expect(
      alert.compareDocumentPosition(
        screen.getByTestId('message-preview-button')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('a lost connection reads as a connection problem (Arabic)', async () => {
    const onPreview = vi.fn().mockRejectedValue(createApiError('network'));
    renderComposer({ onPreview }, 'ar');
    fireEvent.click(screen.getByTestId('message-preview-button'));
    const alert = await screen.findByTestId('message-preview-failed');
    expect(alert.textContent).toContain('تعذّر تحميل معاينة المستلمين');
    expect(alert.textContent).toContain(
      I18N.ar.t('errors:network.description')
    );
  });
});

describe('a failed send (V03)', () => {
  it('keeps "not sent" with the real reason, next to the buttons', async () => {
    const onPreview = vi.fn().mockResolvedValue({
      recipientCount: 2,
      emailCount: 2,
      inAppCount: 2,
      excluded: { optedOut: 0, suppressed: 0, blocked: 0, pending: 0 },
      requiresConfirmation: false,
      quota: null,
      overBy: 0,
    });
    const onSend = vi.fn().mockRejectedValue(createApiError('timeout'));
    renderComposer({ onPreview, onSend });
    const user = userEvent.setup();
    await user.type(screen.getByTestId('message-subject'), 'Hello');
    const editor = screen.getByTestId('message-body-editor');
    editor.innerHTML = '<p>Class moved</p>';
    fireEvent.input(editor);
    await user.click(screen.getByTestId('message-preview-button'));
    await user.click(screen.getByTestId('message-send-button'));
    await user.click(screen.getByTestId('confirm-send'));
    const alert = await screen.findByTestId('message-send-failed');
    expect(alert.textContent).toContain('The message was not sent');
    expect(alert.textContent).toContain(
      I18N.en.t('errors:timeout.description')
    );
    expect(alert.textContent).toContain('will not be sent twice');
  });
});

describe('leaving with a typed message (V08)', () => {
  it('reports the draft as unsaved work', async () => {
    renderComposer();
    expect(state.unsaved.at(-1)).toBe(false);
    fireEvent.change(screen.getByTestId('message-subject'), {
      target: { value: 'Draft' },
    });
    await waitFor(() => expect(state.unsaved.at(-1)).toBe(true));
  });
});

describe('a greyed Preview says why (V28)', () => {
  it('names what to tick when the audience is incomplete', () => {
    renderComposer({
      audience: null,
      audienceIncompleteKey: 'messaging:composer.chooseCourseToPreview',
    });
    const preview = screen.getByTestId(
      'message-preview-button'
    ) as HTMLButtonElement;
    expect(preview.disabled).toBe(true);
    const help = screen.getByTestId('message-audience-help');
    expect(help.textContent).toBe(
      'Tick at least one course above to preview the recipients.'
    );
    expect(preview.getAttribute('aria-describedby')).toBe(help.id);
  });
});
