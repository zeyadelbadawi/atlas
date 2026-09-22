import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
      // The API answers `valid: false` for a revoked certificate (it is no
      // longer in force) while still naming it — the sheet must show the
      // revocation, not "does not match".
      answer({
        valid: false,
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

/**
 * Production validation, 22 Sep 2026: on an academy site opened under
 * `/ar`, the sheet body was Arabic while the page heading the site's
 * frame received stayed English. The heading must follow the language
 * the same way the sheet does, including when the language changes
 * AFTER the page first rendered (the academy site sets the app language
 * from the URL prefix in an effect, i.e. after the first paint).
 */
describe('CertificateVerifyPage heading language', () => {
  it(
    'renders the framed heading in Arabic once the language is Arabic',
    async () => {
      const arabicFirst = createI18nInstance('ar');
      answer({ valid: false });
      render(
        <I18nextProvider i18n={arabicFirst}>
          <MemoryRouter initialEntries={['/verify/ABCDEFGHJK23']}>
            <Routes>
              <Route
                path="/verify/:code"
                element={
                  <CertificateVerifyPage
                    renderFrame={({ title, subtitle, content }) => (
                      <div>
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                        {content}
                      </div>
                    )}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'التحقق من شهادة'
      );
    },
    RENDER_TIMEOUT
  );

  it(
    'updates the framed heading when the language changes after the first render',
    async () => {
      const switching = createI18nInstance('en');
      answer({ valid: false });
      render(
        <I18nextProvider i18n={switching}>
          <MemoryRouter initialEntries={['/verify/ABCDEFGHJK23']}>
            <Routes>
              <Route
                path="/verify/:code"
                element={
                  <CertificateVerifyPage
                    renderFrame={({ title, content }) => (
                      <div>
                        <h1>{title}</h1>
                        {content}
                      </div>
                    )}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </I18nextProvider>
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'Verify a certificate'
      );
      await act(async () => {
        await switching.changeLanguage('ar');
      });
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'التحقق من شهادة'
      );
      // The sheet body followed as well.
      expect(screen.getByTestId('certificate-verify-invalid').textContent).toContain(
        'هذا الرمز لا يطابق أي شهادة'
      );
    },
    RENDER_TIMEOUT
  );

  it(
    'keeps the heading in the language a frame switches to from ITS OWN effect (the academy site shell does exactly this)',
    async () => {
      // The academy site's auth shell calls `i18n.changeLanguage(locale)` in
      // a `useEffect`. Child effects run before parent effects, so that
      // switch fires BEFORE this page has subscribed to language changes —
      // a heading computed by the page itself would miss the event and stay
      // English while the sheet (rendered inside the shell) turned Arabic.
      const switching = createI18nInstance('en');
      answer({ valid: false });
      function ShellLikeFrame({ title, children }: { title: ReactNode; children: ReactNode }) {
        const { i18n } = useTranslation();
        useEffect(() => {
          void i18n.changeLanguage('ar');
        }, [i18n]);
        return (
          <div>
            <h1>{title}</h1>
            {children}
          </div>
        );
      }
      await act(async () => {
        render(
          <I18nextProvider i18n={switching}>
            <MemoryRouter initialEntries={['/verify/ABCDEFGHJK23']}>
              <Routes>
                <Route
                  path="/verify/:code"
                  element={
                    <CertificateVerifyPage
                      renderFrame={({ title, content }) => (
                        <ShellLikeFrame title={title}>{content}</ShellLikeFrame>
                      )}
                    />
                  }
                />
              </Routes>
            </MemoryRouter>
          </I18nextProvider>
        );
      });
      expect(screen.getByTestId('certificate-verify-invalid').textContent).toContain(
        'هذا الرمز لا يطابق أي شهادة'
      );
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'التحقق من شهادة'
      );
    },
    RENDER_TIMEOUT
  );
});
