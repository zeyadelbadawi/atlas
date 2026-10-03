/**
 * Visual Identity (Task G): one page, one "Save Visual Identity".
 *
 * Pins the consolidation (no separate "Accept palette" or "Save brand
 * colours"; name, logo, favicon and colours in ONE request), the defects of
 * the old Brand tab (an upload finishing out of order, a "logo changed"
 * offer naming the old logo or coming back after "Keep current colours"),
 * and the unsaved-changes contract (clean after a save, dirty only for
 * real edits).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configure } from '@testing-library/react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import { buildBrandPalette } from '../brand-engine';
import { VisualIdentityEditor } from './VisualIdentityPage';
import type { Academy, WebsiteConfiguration } from '@types';

const saveMutateAsync = vi.fn();
const uploadMutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useSaveVisualIdentity: () => ({
    mutateAsync: saveMutateAsync,
    isPending: false,
  }),
  useWebsiteConfiguration: vi.fn(),
  useWebsitePages: vi.fn(),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({
    mutateAsync: uploadMutateAsync,
    isPending: false,
  }),
}));
vi.mock('../brand-studio/BrandPreviewFrame', () => ({
  BrandPreviewFrame: ({ academyLogo }: { academyLogo?: string }) => (
    <div data-testid="preview" data-logo={academyLogo ?? ''} />
  ),
}));
/** When set, logo analysis waits for it (a slow analysis). */
let analysisGate: Promise<void> | null = null;

vi.mock('../brand-studio/logo-analysis', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  analyzeLogo: vi.fn(async () => {
    if (analysisGate) await analysisGate;
    return {
      ok: true,
      analysis: {
        seeds: { primary: '24 95% 53%', secondary: '199 89% 38%' },
        candidates: [{ color: '24 95% 53%', share: 0.7, class: 'chromatic' }],
        flags: [],
      },
    };
  }),
}));

const i18n = createI18nInstance('en');
// Uploads and logo analysis settle asynchronously; under a loaded full-suite
// run the default 1 s `waitFor`/`findBy` budget was occasionally too short.
configure({ asyncUtilTimeout: 5000 });
const LOGO_URL = '/api/v1/public/media/academies/a1/logo.png';
const LOGO_CHANGED = 'Your logo changed — preview a matching palette?';

function pngBytes(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 64);
  view.setUint32(20, 64);
  return bytes;
}

const academy = {
  id: 'a1',
  name: 'Acme',
  logo: LOGO_URL,
} as unknown as Academy;

function configuration(logoFingerprint = 'f'.repeat(64)): WebsiteConfiguration {
  const palette = buildBrandPalette({
    seeds: { primary: '262 83% 58%' },
    source: 'logo',
    status: 'confirmed',
    variant: 'balanced',
    overrides: {},
    extraction: { logoFingerprint, candidates: [], flags: [] },
  });
  return {
    themeKey: 'modern-education',
    updatedAt: '2026-10-03T00:00:00.000Z',
    brand: { palette },
    navigation: [],
    header: {},
    footer: {},
  } as unknown as WebsiteConfiguration;
}

function renderEditor(config = configuration()) {
  return render(
    <I18nextProvider i18n={i18n}>
      <UnsavedChangesProvider>
        <MemoryRouter>
          <VisualIdentityEditor
            academy={academy}
            configuration={config}
            pages={[]}
          />
        </MemoryRouter>
      </UnsavedChangesProvider>
    </I18nextProvider>
  );
}

const saveButton = () => screen.getByTestId('visual-identity-save');
const logoInput = () =>
  document.querySelector(
    'input[type="file"][accept*="image/svg+xml"]'
  ) as HTMLInputElement;
const pickLogo = (name: string) =>
  act(async () => {
    fireEvent.change(logoInput(), {
      target: {
        files: [
          new File([pngBytes() as BlobPart], name, { type: 'image/png' }),
        ],
      },
    });
  });

beforeEach(() => {
  // The saved logo is unreadable here unless a test says otherwise, so the
  // "logo changed" offer stays out of the way.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('offline');
    })
  );
  saveMutateAsync.mockReset();
  uploadMutateAsync.mockReset();
  analysisGate = null;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Visual Identity — one save', () => {
  it('has no separate Accept palette or Save brand colours, and nothing to save until an edit', () => {
    renderEditor();
    expect(
      screen.queryByRole('button', { name: /accept palette/i })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: /save brand colours/i })
    ).toBeNull();
    expect(saveButton()).toHaveProperty('disabled', true);
  });

  it('saves name, logo and colours in ONE request, confirmed, based on the copy loaded', async () => {
    uploadMutateAsync.mockResolvedValue({ url: '/media/new-logo.png' });
    saveMutateAsync.mockImplementation(async ({ payload }) => ({
      academy: { ...academy, name: payload.name, logo: payload.logo },
      configuration: { ...configuration(), brand: { palette: undefined } },
    }));
    renderEditor();
    fireEvent.change(screen.getByLabelText('Academy Name'), {
      target: { value: 'Acme Learning' },
    });
    await pickLogo('new.png');
    await waitFor(() =>
      expect(screen.getByTestId('preview').dataset.logo).toBe(
        '/media/new-logo.png'
      )
    );
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false));
    await act(async () => fireEvent.click(saveButton()));

    expect(saveMutateAsync).toHaveBeenCalledTimes(1);
    const { payload } = saveMutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Acme Learning',
      logo: '/media/new-logo.png',
      expectedUpdatedAt: '2026-10-03T00:00:00.000Z',
      brand: { palette: { status: 'confirmed', source: 'logo' } },
    });
    expect(payload).not.toHaveProperty('favicon');
    // Clean again: nothing left to save.
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', true));
    expect(screen.getByTestId('visual-identity-state').textContent).toBe(
      'Everything is saved and live.'
    );
  });

  it('cannot save while a new logo is still being analysed (its colours would be missing)', async () => {
    let finishAnalysis: () => void = () => undefined;
    analysisGate = new Promise<void>((resolve) => (finishAnalysis = resolve));
    uploadMutateAsync.mockResolvedValue({ url: '/media/new-logo.png' });
    renderEditor();
    await pickLogo('new.png');
    await waitFor(() =>
      expect(screen.getByTestId('preview').dataset.logo).toBe(
        '/media/new-logo.png'
      )
    );
    // Uploaded, but its palette is not ready: Save waits for it.
    expect(saveButton()).toHaveProperty('disabled', true);
    await act(async () => finishAnalysis());
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false));
  });

  it('an empty name is refused before anything is sent', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Academy Name'), {
      target: { value: '   ' },
    });
    await act(async () => fireEvent.click(saveButton()));
    expect(saveMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Enter your academy’s name.')).toBeTruthy();
  });

  it('removing the logo saves logo: null', async () => {
    saveMutateAsync.mockResolvedValue({
      academy: { ...academy, logo: undefined },
      configuration: configuration(),
    });
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Logo' }));
    await act(async () => fireEvent.click(saveButton()));
    expect(saveMutateAsync.mock.calls[0][0].payload).toMatchObject({
      logo: null,
    });
  });

  it('a failed save keeps the edits and says so', async () => {
    saveMutateAsync.mockRejectedValue({ kind: 'conflict' });
    renderEditor();
    fireEvent.change(screen.getByLabelText('Academy Name'), {
      target: { value: 'Acme 2' },
    });
    await act(async () => fireEvent.click(saveButton()));
    expect(
      (screen.getByLabelText('Academy Name') as HTMLInputElement).value
    ).toBe('Acme 2');
    expect(saveButton()).toHaveProperty('disabled', false);
  });
});

describe('Visual Identity — the old Brand tab defects', () => {
  it('two quick uploads: the later logo wins even when the earlier one finishes last', async () => {
    let finishFirst: (value: { url: string }) => void = () => undefined;
    uploadMutateAsync
      .mockImplementationOnce(
        () => new Promise((resolve) => (finishFirst = resolve))
      )
      .mockResolvedValueOnce({ url: '/media/second.png' });
    renderEditor();
    await pickLogo('first.png');
    await pickLogo('second.png');
    await waitFor(() =>
      expect(screen.getByTestId('preview').dataset.logo).toBe(
        '/media/second.png'
      )
    );
    await act(async () => finishFirst({ url: '/media/first.png' }));
    expect(screen.getByTestId('preview').dataset.logo).toBe(
      '/media/second.png'
    );
  });

  it('offers a matching palette for a saved logo the saved palette did not come from, and "keep" sticks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(pngBytes() as BodyInit))
    );
    renderEditor(configuration('0'.repeat(64)));
    expect(await screen.findByText(LOGO_CHANGED)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(LOGO_URL, expect.anything());
    fireEvent.click(
      screen.getByRole('button', { name: 'Keep current colours' })
    );
    expect(screen.queryByText(LOGO_CHANGED)).toBeNull();
    // A re-render (an edit elsewhere on the page) does not bring it back.
    fireEvent.change(screen.getByLabelText('Academy Name'), {
      target: { value: 'Acme 3' },
    });
    expect(screen.queryByText(LOGO_CHANGED)).toBeNull();
  });

  it('never offers it for a newly picked, unsaved logo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(pngBytes() as BodyInit))
    );
    uploadMutateAsync.mockResolvedValue({ url: '/media/new-logo.png' });
    renderEditor(configuration('0'.repeat(64)));
    await screen.findByText(LOGO_CHANGED);
    await pickLogo('new.png');
    await waitFor(() => expect(screen.queryByText(LOGO_CHANGED)).toBeNull());
  });
});
