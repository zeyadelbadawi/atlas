/**
 * B0-ANL-04 — landing attribution is read once into MEMORY (never browser
 * storage), drops anything that looks like personal data, keeps only the
 * referrer's host, and captures nothing for an untagged, direct visit or
 * while the `signupAttribution` flag is off. G1: the flag ships ON; the
 * marketing hand-off's `ref` / `lt` are read; the platform base domain and
 * every subdomain are internal (never a referrer).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as flags from '@config/feature-flags.config';
import { FEATURE_FLAGS } from '@config/feature-flags.config';
import {
  attributionHandoffParams,
  isInternalHost,
  landingTemplateFor,
} from './landing-attribution.core';
import {
  captureLandingAttribution,
  getLandingAttribution,
  readLandingAttribution,
  resetLandingAttributionForTests,
} from './landing-attribution.utils';

const loc = (search: string, pathname = '/', hostname = 'atlas.example') => ({
  search,
  pathname,
  hostname,
});

afterEach(() => {
  resetLandingAttributionForTests();
  vi.restoreAllMocks();
});

describe('readLandingAttribution', () => {
  it('reads UTM values, the referrer host and the landing template', () => {
    expect(
      readLandingAttribution(
        loc(
          '?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch-20261015',
          '/pricing'
        ),
        'https://news.example.org/story?id=1'
      )
    ).toEqual({
      utmSource: 'facebook',
      utmMedium: 'paid_social',
      utmCampaign: 'launch-20261015',
      referrerDomain: 'news.example.org',
      landingTemplate: 'pricing',
    });
  });

  it('never keeps half of an emoji the length cap cut through', () => {
    const value = `${'x'.repeat(99)}${encodeURIComponent('😀')}`;
    const read = readLandingAttribution(loc(`?utm_source=${value}`, '/'), '');
    expect(read?.utmSource).toBe('x'.repeat(99));
    expect(JSON.stringify(read)).not.toMatch(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    );
  });

  it('captures nothing for an untagged visit or a same-site referrer', () => {
    expect(readLandingAttribution(loc(''), '')).toBeNull();
    expect(
      readLandingAttribution(loc(''), 'https://atlas.example/features')
    ).toBeNull();
  });

  it('drops email- and phone-like values', () => {
    expect(
      readLandingAttribution(
        loc(
          '?utm_source=newsletter&utm_term=someone%40mail.test&utm_content=%2B20%20100%20000%200000'
        ),
        ''
      )
    ).toEqual({ utmSource: 'newsletter', landingTemplate: 'home' });
  });
});

describe('G1 — the marketing hand-off and internal domains', () => {
  const internal = { internalDomains: ['atlas.example'] };

  it('reads ref= and lt= handed over by the marketing site', () => {
    expect(
      readLandingAttribution(
        loc(
          '?utm_source=facebook&ref=l.facebook.com&lt=pricing',
          '/auth/register',
          'dashboard.atlas.example'
        ),
        'https://atlas.example/pricing',
        internal
      )
    ).toEqual({
      utmSource: 'facebook',
      referrerDomain: 'l.facebook.com',
      landingTemplate: 'pricing',
    });
  });

  it('counts a handed-over referrer alone as attribution', () => {
    expect(
      readLandingAttribution(
        loc(
          '?ref=www.google.com&lt=home',
          '/auth/register',
          'dashboard.atlas.example'
        ),
        'https://atlas.example/',
        internal
      )
    ).toEqual({ referrerDomain: 'www.google.com', landingTemplate: 'home' });
  });

  it('never treats the base domain or any subdomain as a referrer', () => {
    const dash = loc('', '/auth/register', 'dashboard.atlas.example');
    expect(
      readLandingAttribution(dash, 'https://atlas.example/', internal)
    ).toBeNull();
    expect(
      readLandingAttribution(
        dash,
        'https://riwaq.atlas.example/courses',
        internal
      )
    ).toBeNull();
    expect(
      readLandingAttribution(dash, 'https://docs.atlas.example/start', internal)
    ).toBeNull();
    expect(
      readLandingAttribution(
        loc('?ref=docs.atlas.example', '/', 'dashboard.atlas.example'),
        '',
        internal
      )
    ).toBeNull();
    // A look-alike is not a subdomain.
    expect(
      readLandingAttribution(dash, 'https://evilatlas.example/', internal)
    ).toEqual({ referrerDomain: 'evilatlas.example', landingTemplate: 'auth' });
  });

  it('ignores a ref that is not a host name, or an lt that is not a slug', () => {
    expect(
      readLandingAttribution(
        loc('?utm_source=x&ref=someone%40mail.test&lt=..%2Fevil', '/pricing'),
        ''
      )
    ).toEqual({ utmSource: 'x', landingTemplate: 'pricing' });
    expect(readLandingAttribution(loc('?ref=localhost', '/'), '')).toBeNull();
  });

  it('skips a locale prefix when naming the landing template', () => {
    expect(landingTemplateFor('/ar/pricing')).toBe('pricing');
    expect(landingTemplateFor('/ar')).toBe('home');
    expect(landingTemplateFor('/')).toBe('home');
    expect(landingTemplateFor('/solutions/multi-academy')).toBe('solutions');
  });

  it('matches internal hosts exactly or as subdomains', () => {
    expect(isInternalHost('atlas.example', ['atlas.example'])).toBe(true);
    expect(isInternalHost('A.Atlas.Example.', ['atlas.example'])).toBe(true);
    expect(isInternalHost('notatlas.example', ['atlas.example'])).toBe(false);
    expect(isInternalHost('atlas.example', [undefined, ''])).toBe(false);
  });

  it('turns an attribution back into hand-off parameters', () => {
    expect(
      attributionHandoffParams({
        utmSource: 'facebook',
        utmCampaign: 'season',
        referrerDomain: 'm.facebook.com',
        landingTemplate: 'pricing',
      })
    ).toEqual([
      ['utm_source', 'facebook'],
      ['utm_campaign', 'season'],
      ['ref', 'm.facebook.com'],
      ['lt', 'pricing'],
    ]);
  });
});

describe('capture / get', () => {
  it('ships with the flag on (G1, DL-67)', () => {
    expect(FEATURE_FLAGS.signupAttribution).toBe(true);
  });

  it('captures and returns nothing while the flag is off', () => {
    vi.spyOn(flags, 'isFeatureEnabled').mockReturnValue(false);
    captureLandingAttribution();
    expect(getLandingAttribution()).toBeNull();
  });

  it('captures the landing URL in memory when the flag is on', () => {
    window.history.replaceState(null, '', '/pricing?utm_source=youtube');
    captureLandingAttribution();
    expect(getLandingAttribution()).toEqual({
      utmSource: 'youtube',
      landingTemplate: 'pricing',
    });
    window.history.replaceState(null, '', '/');
  });

  it('never writes to browser storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const cookie = vi.spyOn(document, 'cookie', 'set');
    captureLandingAttribution();
    getLandingAttribution();
    expect(setItem).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });
});
