/**
 * Theme 1 plan Phase 2 — the base64 fix. A direct upload goes through the
 * Academy's MediaAsset store and the field receives the returned URL, never
 * the file's bytes; a failed upload leaves the field as it was and says so.
 *
 * `useUploadMediaAsset` is replaced by a recorder (it is the media feature's
 * own tested mutation; what matters here is what the field sends and keeps).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteImageField } from './WebsiteImageField';

const mutateAsync = vi.fn();

vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync, isPending: false }),
}));

const i18n = createI18nInstance('en');
const MEDIA_URL = '/api/v1/public/media/academies/a1/asset.png';

function renderField(onChange: (value: string | undefined) => void) {
  return render(
    <I18nextProvider i18n={i18n}>
      <WebsiteImageField
        id="hero-image"
        labelKey="website:fields.image"
        value="https://cdn.example/old.png"
        onChange={onChange}
        academyId="a1"
      />
    </I18nextProvider>
  );
}

/** Opens the picker and chooses `file` in the hidden input it creates. */
async function pickFile(file: File) {
  act(() => document.getElementById('hero-image')!.click());
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change'));
  });
}

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
  document.querySelectorAll('input[type=file]').forEach((el) => el.remove());
});

describe('WebsiteImageField — uploads go through MediaAsset', () => {
  it('uploads the file and stores only the returned URL', async () => {
    mutateAsync.mockResolvedValue({ url: MEDIA_URL });
    const onChange = vi.fn();
    renderField(onChange);

    await pickFile(new File(['png-bytes'], 'hero.png', { type: 'image/png' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(MEDIA_URL));
    expect(mutateAsync).toHaveBeenCalledWith({
      academyId: 'a1',
      payload: expect.objectContaining({
        fileName: 'hero.png',
        mimeType: 'image/png',
        dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      }),
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous value and explains a failed upload', async () => {
    mutateAsync.mockRejectedValue(new Error('500'));
    const onChange = vi.fn();
    renderField(onChange);

    await pickFile(new File(['png-bytes'], 'hero.png', { type: 'image/png' }));

    expect(
      await screen.findByText(
        "The image couldn't be uploaded. Please try again."
      )
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
