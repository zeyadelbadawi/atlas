import { describe, it, expect } from 'vitest';
import { buildCertificatePreviewKey } from './certificate-preview-key';

const base = {
  locale: 'en' as const,
  logoUrl: '/api/v1/public/media/logo.png',
  signatureUrl: null,
  signatoryName: 'Dr. Hayes',
  signatoryTitle: 'Director',
  wording: {
    en: { title: 'Certificate of Completion', body: 'has completed' },
    ar: { title: 'شهادة إتمام', body: 'قد أتمّ' },
  },
  primaryColor: '#1F4E5F',
  accentColor: '#B08A3E',
  textColor: '#14303A',
  backgroundColor: '#FCFBF7',
};

describe('buildCertificatePreviewKey (reactive live preview)', () => {
  it('changes when a single character is added to a NESTED wording field', () => {
    const before = buildCertificatePreviewKey(base);
    const after = buildCertificatePreviewKey({
      ...base,
      wording: {
        ...base.wording,
        en: { ...base.wording.en, title: base.wording.en.title + 'X' },
      },
    });
    expect(after).not.toBe(before);
  });

  it('changes for an Arabic wording edit', () => {
    const before = buildCertificatePreviewKey(base);
    const after = buildCertificatePreviewKey({
      ...base,
      wording: {
        ...base.wording,
        ar: { ...base.wording.ar, body: base.wording.ar.body + 'ة' },
      },
    });
    expect(after).not.toBe(before);
  });

  it('changes for the signatory, logo, colours and locale', () => {
    expect(buildCertificatePreviewKey({ ...base, signatoryName: 'Prof. Lee' })).not.toBe(
      buildCertificatePreviewKey(base)
    );
    expect(buildCertificatePreviewKey({ ...base, logoUrl: null })).not.toBe(
      buildCertificatePreviewKey(base)
    );
    expect(buildCertificatePreviewKey({ ...base, primaryColor: '#6E1E2B' })).not.toBe(
      buildCertificatePreviewKey(base)
    );
    expect(buildCertificatePreviewKey({ ...base, locale: 'ar' })).not.toBe(
      buildCertificatePreviewKey(base)
    );
  });

  it('is stable when nothing relevant changes (no needless preview requests)', () => {
    expect(buildCertificatePreviewKey({ ...base })).toBe(
      buildCertificatePreviewKey({ ...base })
    );
  });
});
