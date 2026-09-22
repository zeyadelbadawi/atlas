import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { CertificateVerification } from '@types';
import CertificateVerifyPage from './CertificateVerifyPage';

const i18n = createI18nInstance('en');
const RENDER_TIMEOUT = 20_000;

const useVerifyCertificate = vi.fn();

vi.mock('@features/learning', () => ({
  useVerifyCertificate: (code: string | undefined) =>
    useVerifyCertificate(code),
}));

function answer(data: CertificateVerification | undefined, extra = {}) {
  useVerifyCertificate.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...extra,
  });
}

function show(code = 'ABCDEFGHJK23'): void {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/verify/${code}`]}>
        <Routes>
          <Route path="/verify/:code" element={<CertificateVerifyPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(cleanup);

/**
 * The public fact sheet is read-only and identical on both hosts. These
 * three states are the whole contract: valid, revoked (still valid data,
 * warning tone) and invalid (a neutral notice showing the code, never an
 * error).
 */
describe('CertificateVerifyPage', () => {
  it(
    'renders a valid certificate as a fact sheet with the academy the server named',
    () => {
      answer({
        valid: true,
        status: 'issued',
        serial: 'WDA-2026-000123',
        issuedTo: 'Layla Hassan',
        courseTitle: 'Arabic for beginners',
        academyName: 'Wadi Academy',
        academySlug: 'wadi',
        issuedAt: '2026-09-01T10:00:00.000Z',
        completedAt: '2026-08-30T10:00:00.000Z',
        revokedAt: null,
        version: 1,
      });
      show();

      expect(useVerifyCertificate).toHaveBeenCalledWith('ABCDEFGHJK23');
      expect(screen.getByTestId('certificate-verify-valid')).toBeTruthy();
      expect(screen.getByText('Valid certificate')).toBeTruthy();
      expect(screen.getByText('Layla Hassan')).toBeTruthy();
      expect(screen.getByText('Arabic for beginners')).toBeTruthy();
      expect(screen.getByText('Wadi Academy')).toBeTruthy();
      expect(screen.getByText(/WDA-2026-000123/)).toBeTruthy();
      expect(screen.queryByTestId('certificate-verify-revoked')).toBeNull();
    },
    RENDER_TIMEOUT
  );

  it(
    'renders a revoked certificate with the revocation date and a warning, keeping the facts',
    () => {
      answer({
        valid: true,
        status: 'revoked',
        serial: 'WDA-2026-000124',
        issuedTo: 'Omar Said',
        courseTitle: 'Data literacy',
        academyName: 'Wadi Academy',
        academySlug: 'wadi',
        issuedAt: '2026-09-01T10:00:00.000Z',
        completedAt: null,
        revokedAt: '2026-09-15T10:00:00.000Z',
        version: 2,
      });
      show();

      const banner = screen.getByTestId('certificate-verify-revoked');
      expect(banner.textContent).toMatch(/revoked on/i);
      expect(banner.textContent).toMatch(/2026/);
      expect(screen.queryByText('Valid certificate')).toBeNull();
      expect(screen.getByText('Omar Said')).toBeTruthy();
      expect(screen.getByText('Revoked')).toBeTruthy();
    },
    RENDER_TIMEOUT
  );

  it(
    'renders an unknown code as a neutral notice that shows the code, not an error',
    () => {
      answer({ valid: false });
      show('NOTACODE1234');

      expect(screen.getByTestId('certificate-verify-invalid')).toBeTruthy();
      expect(
        screen.getByText('This code does not match any certificate')
      ).toBeTruthy();
      expect(screen.getByText(/NOTACODE1234/)).toBeTruthy();
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByTestId('certificate-verify-valid')).toBeNull();
    },
    RENDER_TIMEOUT
  );

  it(
    'shows a loading skeleton while the code is being checked',
    () => {
      answer(undefined, { isLoading: true });
      show();

      expect(screen.getByTestId('certificate-verify-loading')).toBeTruthy();
    },
    RENDER_TIMEOUT
  );
});
