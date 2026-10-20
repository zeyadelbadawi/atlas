/**
 * The academy logo limit is 2 MB everywhere.
 *
 * Settings → Branding used to allow (and say) 5 MB while the Brand Studio
 * allowed 2 MB. 2 MB is the server's real ceiling for a logo: the backend
 * embeds an academy logo in certificates only up to
 * `MAX_CERTIFICATE_IMAGE_BYTES` (2 MB), so a bigger one uploaded but was
 * silently left off certificates. These tests pin the shared limit, the
 * copy in both languages, and that an over-limit file is refused before
 * anything is uploaded.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { Academy } from '@types';
import { MAX_LOGO_BYTES } from '@/features/website/brand-studio/logo-file';
import { MAX_LOGO_FILE_SIZE } from './constants/academy.constants';

const uploadMutateAsync = vi.fn();
let pickedLogo: File[] | null = null;

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUnsavedChanges: () => undefined,
  // The form opens two pickers; the logo one accepts PNG/JPG.
  useFilePicker: ({ accept }: { accept: string }) => ({
    openFilePicker: vi.fn(),
    files:
      accept.includes('image/png') && !accept.includes('icon')
        ? pickedLogo
        : null,
    clearFiles: vi.fn(),
    getPreviewUrl: () => 'blob:preview',
    revokePreviewUrl: vi.fn(),
  }),
}));

vi.mock('@features/media', () => ({
  useUploadMediaAsset: () => ({
    mutateAsync: uploadMutateAsync,
    isPending: false,
  }),
}));

vi.mock('./hooks', () => ({
  useUpdateAcademyBranding: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

const { AcademyBrandingForm } =
  await import('./components/AcademyBrandingForm');

const academy = {
  id: 'academy-1',
  organizationId: 'org-1',
  name: 'Example Academy',
  slug: 'example',
  status: 'active',
  timezone: 'Africa/Cairo',
  language: 'en',
  currency: 'EGP',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as Academy;

function pngOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'logo.png', { type: 'image/png' });
}

beforeEach(() => {
  pickedLogo = null;
  uploadMutateAsync.mockReset().mockResolvedValue({ url: '/logo.png' });
});
afterEach(cleanup);

describe('academy logo size limit', () => {
  it('is the Brand Studio limit, 2 MB', () => {
    expect(MAX_LOGO_FILE_SIZE).toBe(2 * 1024 * 1024);
    expect(MAX_LOGO_FILE_SIZE).toBe(MAX_LOGO_BYTES);
  });

  it('says 2 MB in English and Arabic', () => {
    const en = createI18nInstance('en');
    const ar = createI18nInstance('ar');
    for (const key of [
      'academy:branding.logoHelp',
      'academy:branding.errors.logoTooLarge',
    ]) {
      expect(en.t(key)).toContain('2 MB');
      expect(en.t(key)).not.toContain('5');
      expect(ar.t(key)).toContain('2 ميجابايت');
      expect(ar.t(key)).not.toContain('5');
    }
  });

  it('refuses a logo over 2 MB without uploading it', async () => {
    pickedLogo = [pngOfSize(MAX_LOGO_FILE_SIZE + 1)];
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <AcademyBrandingForm academy={academy} />
      </I18nextProvider>
    );
    expect(
      await screen.findByText('Logo must be 2 MB or smaller.')
    ).toBeTruthy();
    expect(uploadMutateAsync).not.toHaveBeenCalled();
  });

  it('uploads a logo of exactly 2 MB', async () => {
    pickedLogo = [pngOfSize(MAX_LOGO_FILE_SIZE)];
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <AcademyBrandingForm academy={academy} />
      </I18nextProvider>
    );
    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledTimes(1));
  });
});
