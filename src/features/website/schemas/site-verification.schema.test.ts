/**
 * SEO/AEO/GEO pass — the owner may paste Search Console's / Bing's whole
 * verification tag; only its token is stored, and never markup.
 */
import { describe, expect, it } from 'vitest';
import {
  globalSeoSchema,
  normalizeSiteVerificationToken,
} from './website.schemas';

describe('site verification tokens', () => {
  it('keeps the content of a pasted meta tag, or the bare token', () => {
    expect(
      normalizeSiteVerificationToken(
        '<meta name="google-site-verification" content="AbC_12-3" />'
      )
    ).toBe('AbC_12-3');
    expect(
      normalizeSiteVerificationToken(
        " <meta name='msvalidate.01' content='0123ABCD'>"
      )
    ).toBe('0123ABCD');
    expect(normalizeSiteVerificationToken('  token-1 ')).toBe('token-1');
  });

  it('accepts tokens and blanks, refuses anything else', () => {
    expect(
      globalSeoSchema.safeParse({
        googleSiteVerification: '<meta content="ok_1">',
      }).success
    ).toBe(true);
    expect(
      globalSeoSchema.parse({ googleSiteVerification: '<meta content="ok_1">' })
        .googleSiteVerification
    ).toBe('ok_1');
    expect(
      globalSeoSchema.safeParse({ bingSiteVerification: '' }).success
    ).toBe(true);
    expect(
      globalSeoSchema.safeParse({ bingSiteVerification: 'bad"><script>' })
        .success
    ).toBe(false);
    expect(
      globalSeoSchema.safeParse({ googleSiteVerification: 'x'.repeat(129) })
        .success
    ).toBe(false);
  });
});
