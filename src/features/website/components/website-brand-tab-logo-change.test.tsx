/**
 * Theme 1 plan §F.4.6 / §J.20 — "Your logo changed — preview a matching
 * palette?". A saved palette records the fingerprint of the logo it came
 * from. When the Academy logo was replaced elsewhere, the Brand tab offers
 * a review; the stored palette is never overwritten until the Owner saves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { buildBrandPalette } from '../brand-engine';
import { WebsiteBrandTab } from './WebsiteBrandTab';
import type { WebsiteConfiguration } from '@types';

const mutate = vi.fn();

vi.mock('../hooks', () => ({
  useUpdateWebsiteConfiguration: () => ({ mutate, isPending: false }),
}));
vi.mock('@features/academy', () => ({
  useUpdateAcademyBranding: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../brand-studio/BrandPreviewFrame', () => ({
  BrandPreviewFrame: () => <div data-testid="preview" />,
}));
vi.mock('../brand-studio/logo-analysis', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  analyzeLogo: vi.fn(async () => ({
    ok: true,
    analysis: {
      seeds: { primary: '24 95% 53%', secondary: '199 89% 38%' },
      candidates: [{ color: '24 95% 53%', share: 0.7, class: 'chromatic' }],
      flags: [],
    },
  })),
}));

const i18n = createI18nInstance('en');
const LOGO_URL = '/api/v1/public/media/academies/a1/new-logo.png';

function pngBytes(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 64);
  view.setUint32(20, 64);
  return bytes;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function configuration(logoFingerprint: string): WebsiteConfiguration {
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
    brand: { palette },
  } as unknown as WebsiteConfiguration;
}

function renderTab(config: WebsiteConfiguration) {
  return render(
    <I18nextProvider i18n={i18n}>
      <WebsiteBrandTab
        academyId="a1"
        academyName="Acme"
        academyLogo={LOGO_URL}
        configuration={config}
      />
    </I18nextProvider>
  );
}

const TITLE = 'Your logo changed — preview a matching palette?';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(pngBytes() as BodyInit))
  );
});

afterEach(() => {
  cleanup();
  mutate.mockReset();
  vi.unstubAllGlobals();
});

describe('WebsiteBrandTab — logo changed elsewhere (§F.4.6)', () => {
  it('offers a review when the logo differs from the palette’s source logo', async () => {
    renderTab(configuration('0'.repeat(64)));
    expect(await screen.findByText(TITLE)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(LOGO_URL, expect.anything());
    // The confirmed palette is untouched until the Owner acts.
    expect(
      screen.getByRole('button', { name: 'Palette accepted' })
    ).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('previews the new logo’s palette as "proposed" without saving it', async () => {
    renderTab(configuration('0'.repeat(64)));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Preview matching palette' })
    );
    await waitFor(() => expect(screen.queryByText(TITLE)).toBeNull());
    expect(
      screen.getByText(
        'We suggested a palette from your logo. Review it, then accept.'
      )
    ).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('can be dismissed, keeping the current colours', async () => {
    renderTab(configuration('0'.repeat(64)));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Keep current colours' })
    );
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('stays quiet when the logo is the one the palette came from', async () => {
    renderTab(configuration(await sha256Hex(pngBytes())));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(fetch).toHaveBeenCalled();
    expect(screen.queryByText(TITLE)).toBeNull();
  });

  it('stays quiet when the logo cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    renderTab(configuration('0'.repeat(64)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(screen.queryByText(TITLE)).toBeNull();
  });
});
