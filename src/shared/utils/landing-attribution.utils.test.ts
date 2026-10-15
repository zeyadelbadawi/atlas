/**
 * B0-ANL-04 — landing attribution is read once into MEMORY (never browser
 * storage), drops anything that looks like personal data, keeps only the
 * referrer's host, and captures nothing for an untagged, direct visit or
 * while the `signupAttribution` flag is off (its shipped default).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FEATURE_FLAGS } from '@config/feature-flags.config';
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
        loc('?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch-20261015', '/pricing'),
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

  it('captures nothing for an untagged visit or a same-site referrer', () => {
    expect(readLandingAttribution(loc(''), '')).toBeNull();
    expect(
      readLandingAttribution(loc(''), 'https://atlas.example/features')
    ).toBeNull();
  });

  it('drops email- and phone-like values', () => {
    expect(
      readLandingAttribution(
        loc('?utm_source=newsletter&utm_term=someone%40mail.test&utm_content=%2B20%20100%20000%200000'),
        ''
      )
    ).toEqual({ utmSource: 'newsletter', landingTemplate: 'home' });
  });
});

describe('capture / get', () => {
  it('ships with the flag off, so nothing is captured or returned', () => {
    expect(FEATURE_FLAGS.signupAttribution).toBe(false);
    captureLandingAttribution();
    expect(getLandingAttribution()).toBeNull();
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
