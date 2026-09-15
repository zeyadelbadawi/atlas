/**
 * P53 — the support attachment field and the attachment viewer.
 *
 * WHAT THESE COVER that the backend e2e cannot: the browser-side half.
 * The server suite proves an image is stored, authorized and served; these
 * prove the picker refuses the wrong file BEFORE a pointless upload, that
 * remove/replace leave no stale state, and — the one with a real bug
 * behind it — that the viewer revokes its object URL, because a leaked
 * `blob:` URL pins its Blob for the life of the document and a long ticket
 * thread would hold every screenshot it ever rendered.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@localization';
import { SupportAttachmentField } from './components/SupportAttachmentField';
import { SupportAttachmentImage } from './components/SupportAttachmentImage';
import { mySupportService } from './services/SupportService';
import type { SupportAttachmentInput } from '@types';

const i18n = createI18nInstance('en');

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

/** A real File whose bytes do not matter here — the SERVER sniffs the bytes. */
function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

/**
 * `SupportAttachmentField` is CONTROLLED — it renders a preview only when
 * its parent feeds the chosen value back. Both real callers hold that in
 * state, so the tests do too; a static `value={undefined}` would be testing
 * a component nothing actually renders.
 */
function StatefulField({
  onValue,
  disabled,
}: {
  onValue?: (v: SupportAttachmentInput | undefined) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<SupportAttachmentInput>();
  return (
    <SupportAttachmentField
      value={value}
      disabled={disabled}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

describe('SupportAttachmentField', () => {
  let createdUrls: string[];
  let revokedUrls: string[];

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => {
        const url = `blob:mock-${createdUrls.length}`;
        createdUrls.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
    });
  });

  afterEach(() => {
    // No global setup file in this project's vitest config, so RTL's
    // automatic cleanup never runs — leaving a previous render mounted and
    // every `getByTestId` ambiguous. Same convention as the other suites.
    cleanup();
    document.querySelectorAll('input[type="file"]').forEach((el) => el.remove());
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * `useFilePicker` builds its own detached <input type="file"> and clicks
   * it, which jsdom cannot open. Clicking the visible button and then
   * driving that detached input is how the REAL component path runs here.
   */
  async function pickFile(_user: ReturnType<typeof userEvent.setup>, file: File) {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('file input was not created by the picker');
    // NOT `userEvent.upload`: it filters against the input's `accept` list,
    // so a PDF would be silently dropped and the component's own type check
    // — the thing under test — would never run. A real user can still
    // deliver one (the picker's "All files" option, or drag-and-drop).
    // jsdom implements no `DataTransfer`, so the FileList is shaped by hand.
    const fileList = {
      0: file,
      length: 1,
      item: (i: number) => (i === 0 ? file : null),
      [Symbol.iterator]: function* () {
        yield file;
      },
    } as unknown as FileList;
    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    await act(async () => {
      fireEvent.change(input);
      await Promise.resolve();
    });
  }

  it('offers no attachment until one is chosen, and stays optional', () => {
    const onChange = vi.fn();
    renderWithI18n(<SupportAttachmentField value={undefined} onChange={onChange} />);

    expect(screen.getByTestId('support-attachment-add')).toBeTruthy();
    expect(screen.queryByTestId('support-attachment-preview')).toBeNull();
    // Nothing is reported until the user actually picks something.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads a chosen image and reports it to the caller', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<StatefulField onValue={onChange} />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('shot.png', 'image/png', 2048));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const reported = onChange.mock.calls.at(-1)?.[0] as SupportAttachmentInput;
    expect(reported.fileName).toBe('shot.png');
    expect(reported.mimeType).toBe('image/png');
    expect(reported.sizeBytes).toBe(2048);
    // The base64 bridge, the ONE client→server file transport Atlas has.
    expect(reported.dataUrl.startsWith('data:')).toBe(true);
  });

  it('refuses a non-image before any upload is attempted', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<StatefulField onValue={onChange} />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('notes.pdf', 'application/pdf'));

    await waitFor(() =>
      expect(screen.getByTestId('support-attachment-error').textContent).toContain(
        'not a supported image'
      )
    );
    // Cleared rather than left holding the rejected file.
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('refuses an oversized image before spending a base64 round-trip on it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<StatefulField onValue={onChange} />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('huge.png', 'image/png', 11 * 1024 * 1024));

    await waitFor(() =>
      expect(screen.getByTestId('support-attachment-error').textContent).toContain(
        'larger than 10 MB'
      )
    );
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('shows a preview with remove and replace once an image is held', async () => {
    const user = userEvent.setup();
    renderWithI18n(<StatefulField />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('evidence.png', 'image/png', 2048));

    await waitFor(() =>
      expect(screen.getByTestId('support-attachment-preview')).toBeTruthy()
    );
    const preview = screen.getByTestId('support-attachment-preview');
    expect(preview.textContent).toContain('evidence.png');
    // `formatBytes` — the codebase's own locale-aware size formatter.
    expect(preview.textContent).toContain('KB');
    expect(screen.getByTestId('support-attachment-remove')).toBeTruthy();
    expect(screen.getByTestId('support-attachment-replace')).toBeTruthy();
    // The add button is gone: one image, not a growing list.
    expect(screen.queryByTestId('support-attachment-add')).toBeNull();
  });

  it('clears the held image when removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<StatefulField onValue={onChange} />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('a.png', 'image/png'));
    await waitFor(() => expect(screen.getByTestId('support-attachment-preview')).toBeTruthy());

    await user.click(screen.getByTestId('support-attachment-remove'));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.queryByTestId('support-attachment-preview')).toBeNull();
    expect(screen.getByTestId('support-attachment-add')).toBeTruthy();
  });

  it('REVOKES the previous preview URL when the image is replaced', async () => {
    const user = userEvent.setup();
    renderWithI18n(<StatefulField />);

    await user.click(screen.getByTestId('support-attachment-add'));
    await pickFile(user, makeFile('first.png', 'image/png'));
    await waitFor(() => expect(createdUrls.length).toBe(1));

    await pickFile(user, makeFile('second.png', 'image/png'));
    await waitFor(() => expect(createdUrls.length).toBe(2));

    // Replacing must not strand the first Blob for the rest of the session.
    expect(revokedUrls).toContain(createdUrls[0]);
  });
});

describe('SupportAttachmentImage', () => {
  const attachment = {
    id: 'att-1',
    fileName: 'screenshot.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    url: '/support-cases/attachments/att-1',
    createdAt: '2026-09-15T12:00:00.000Z',
  };

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches the bytes through the API CLIENT, not as a plain <img src>', async () => {
    // The route is authenticated: a browser-initiated image request would
    // carry no bearer token and be refused. Going through the service is
    // also what makes the 401-refresh-retry interceptor apply.
    const spy = vi
      .spyOn(mySupportService, 'getAttachmentBlob')
      .mockResolvedValue(new Blob(['bytes'], { type: 'image/png' }));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:served'),
      revokeObjectURL: vi.fn(),
    });

    renderWithI18n(<SupportAttachmentImage attachment={attachment} />);

    await waitFor(() => expect(screen.getByTestId('support-attachment-image')).toBeTruthy());
    expect(spy).toHaveBeenCalledWith('/support-cases/attachments/att-1');
    const img = screen.getByAltText('screenshot.png') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:served');
  });

  it('revokes its object URL on unmount', async () => {
    const revoke = vi.fn();
    vi.spyOn(mySupportService, 'getAttachmentBlob').mockResolvedValue(
      new Blob(['bytes'], { type: 'image/png' })
    );
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:leak-check'),
      revokeObjectURL: revoke,
    });

    const { unmount } = renderWithI18n(<SupportAttachmentImage attachment={attachment} />);
    await waitFor(() => expect(screen.getByTestId('support-attachment-image')).toBeTruthy());

    act(() => unmount());

    expect(revoke).toHaveBeenCalledWith('blob:leak-check');
  });

  it('shows an honest unavailable state instead of a broken image', async () => {
    // A 404 (not visible to this caller) and a network failure look the
    // same on purpose — distinguishing them would tell a caller whether an
    // id they cannot read nonetheless exists.
    vi.spyOn(mySupportService, 'getAttachmentBlob').mockRejectedValue(new Error('404'));

    renderWithI18n(<SupportAttachmentImage attachment={attachment} />);

    await waitFor(() =>
      expect(screen.getByTestId('support-attachment-failed')).toBeTruthy()
    );
    expect(screen.queryByTestId('support-attachment-image')).toBeNull();
  });
});
