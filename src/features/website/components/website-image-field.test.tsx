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

/**
 * Starter photographs are stored as `theme-asset:<theme>/<key>` references,
 * not URLs. The field previews them as the public site draws them — through
 * the theme's manifest, mapped to the site's theme for the same slot — and
 * never hands the reference to an `<img>` (which the browser shows as a
 * broken image). The theme packs are registered by the test setup.
 */
describe('WebsiteImageField — starter photographs preview like the public site', () => {
  function renderPreview(
    value: string | undefined,
    themeKey?: string,
    locale: 'en' | 'ar' = 'en'
  ) {
    return render(
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <WebsiteImageField
          id="benefit-image"
          labelKey="website:fields.image"
          value={value}
          onChange={vi.fn()}
          academyId="a1"
          themeKey={themeKey}
        />
      </I18nextProvider>
    );
  }

  it('resolves a theme-asset reference to its released file', () => {
    renderPreview('theme-asset:modern-education/home-hero');
    const img = screen.getByTestId('benefit-image-preview');
    expect(img.getAttribute('src')).toMatch(
      /^\/theme-assets\/modern-education\/v\d+\/home-hero-\d+\.(webp|avif)$/
    );
    expect(document.querySelector('img[src^="theme-asset:"]')).toBeNull();
  });

  it("draws another theme's starter photograph as the site's theme does", () => {
    // ASG GROUP: generated on Theme 1, now on Manara.
    renderPreview('theme-asset:modern-education/home-benefit', 'manara');
    expect(
      screen.getByTestId('benefit-image-preview').getAttribute('src')
    ).toMatch(/^\/theme-assets\/manara\/v1\/home-benefit-\d+\.(webp|avif)$/);
  });

  it("maps Atelier's slot key to the site's theme (home-philosophy → home-benefit)", () => {
    renderPreview('theme-asset:atelier/home-philosophy', 'manara');
    expect(
      screen.getByTestId('benefit-image-preview').getAttribute('src')
    ).toMatch(/^\/theme-assets\/manara\/v1\/home-benefit-/);
  });

  it('says the preview is unavailable for a reference nothing can draw', () => {
    renderPreview('theme-asset:modern-education/no-such-key', 'manara');
    expect(
      screen.getByTestId('benefit-image-preview-unavailable').textContent
    ).toContain('Preview unavailable');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('says so in Arabic too', () => {
    renderPreview('theme-asset:unknown-theme/home-hero', undefined, 'ar');
    expect(
      screen.getByTestId('benefit-image-preview-unavailable').textContent
    ).toContain('المعاينة غير متاحة');
  });

  it('keeps an uploaded image as stored', () => {
    renderPreview(MEDIA_URL, 'manara');
    expect(
      screen.getByTestId('benefit-image-preview').getAttribute('src')
    ).toBe(MEDIA_URL);
  });

  it('replaces a file that fails to load with the unavailable state', async () => {
    renderPreview('/api/v1/public/media/academies/a1/deleted.png');
    act(() => {
      screen
        .getByTestId('benefit-image-preview')
        .dispatchEvent(new Event('error'));
    });
    expect(
      await screen.findByTestId('benefit-image-preview-unavailable')
    ).toBeTruthy();
  });
});
