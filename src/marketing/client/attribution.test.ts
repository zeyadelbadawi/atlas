// @vitest-environment jsdom
/**
 * G1 — the marketing page view's attribution (memory only) and the hand-off
 * into the app's sign-up: utm_* plus ref=<referrer host> and lt=<landing
 * template> are appended to sign-up links only, only when the visit was
 * tagged or came from an external site; the base domain and its subdomains
 * are never a referrer; nothing is stored.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as flags from '@/config/feature-flags.config';
import {
  initSignupHandoff,
  isAppSignUpHref,
  readPageAttribution,
  siteInternalDomains,
  withHandoffParams,
} from './attribution';

const APP = 'https://dashboard.atlass.dpdns.org';
const SITE = 'https://atlass.dpdns.org';
const loc = (path: string, hostname = 'atlass.dpdns.org') => {
  const url = new URL(path, `https://${hostname}`);
  return { search: url.search, pathname: url.pathname, hostname };
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('readPageAttribution', () => {
  it('reads utm_*, the external referrer host and the landing template (locale prefix skipped)', () => {
    expect(
      readPageAttribution(loc('/ar/pricing?utm_source=facebook&utm_medium=paid-social'), 'https://l.facebook.com/x?y=1', APP),
    ).toEqual({
      utmSource: 'facebook',
      utmMedium: 'paid-social',
      referrerDomain: 'l.facebook.com',
      landingTemplate: 'pricing',
    });
  });

  it('treats the site, the dashboard, the help center and academy subdomains as internal', () => {
    for (const referrer of [`${SITE}/`, `${APP}/dashboard`, 'https://docs.atlass.dpdns.org/', 'https://riwaq.atlass.dpdns.org/']) {
      expect(readPageAttribution(loc('/pricing'), referrer, APP), referrer).toBeNull();
    }
    expect(readPageAttribution(loc('/pricing', 'www.atlass.dpdns.org'), `${SITE}/`, '')).toBeNull();
  });

  it('is null for a direct, untagged visit and while the flag is off', () => {
    expect(readPageAttribution(loc('/'), '', APP)).toBeNull();
    vi.spyOn(flags, 'isFeatureEnabled').mockReturnValue(false);
    expect(readPageAttribution(loc('/?utm_source=x'), '', APP)).toBeNull();
  });

  it('derives the base domains from the page and app hosts', () => {
    expect(siteInternalDomains('www.atlass.dpdns.org', APP)).toEqual(['atlass.dpdns.org']);
    expect(siteInternalDomains('localhost', '')).toEqual(['localhost']);
  });
});

describe('sign-up links', () => {
  it('recognises only links to the app sign-up', () => {
    expect(isAppSignUpHref(`${APP}/auth/register?plan=growth`, APP, SITE)).toBe(true);
    expect(isAppSignUpHref(`${APP}/auth/sign-up`, APP, SITE)).toBe(true);
    expect(isAppSignUpHref(`${APP}/auth/sign-in`, APP, SITE)).toBe(false);
    expect(isAppSignUpHref('/auth/register', APP, SITE)).toBe(false);
    expect(isAppSignUpHref('/auth/register', '', SITE)).toBe(true);
    expect(isAppSignUpHref('https://evil.example/auth/register', APP, SITE)).toBe(false);
  });

  it('adds the hand-off parameters, keeping existing ones and relative links relative', () => {
    const attribution = { utmSource: 'youtube', referrerDomain: 'www.youtube.com', landingTemplate: 'home' };
    expect(withHandoffParams(`${APP}/auth/register?plan=growth&lang=ar`, attribution, SITE)).toBe(
      `${APP}/auth/register?plan=growth&lang=ar&utm_source=youtube&ref=www.youtube.com&lt=home`,
    );
    expect(withHandoffParams('/auth/register?utm_source=keep', attribution, SITE)).toBe(
      '/auth/register?utm_source=keep&ref=www.youtube.com&lt=home',
    );
  });

  it('rewrites only this page’s sign-up links, and only for an attributed view', () => {
    document.body.innerHTML = `
      <a id="trial" href="${APP}/auth/register?lang=ar">Start</a>
      <a id="signin" href="${APP}/auth/sign-in">Sign in</a>
      <a id="pricing" href="/ar/pricing">Pricing</a>`;
    expect(initSignupHandoff(document, APP, null, SITE)).toBe(0);
    expect(document.getElementById('trial')!.getAttribute('href')).toBe(`${APP}/auth/register?lang=ar`);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    expect(
      initSignupHandoff(document, APP, { utmSource: 'tiktok', utmCampaign: 'season', landingTemplate: 'pricing' }, SITE),
    ).toBe(1);
    expect(document.getElementById('trial')!.getAttribute('href')).toBe(
      `${APP}/auth/register?lang=ar&utm_source=tiktok&utm_campaign=season&lt=pricing`,
    );
    expect(document.getElementById('signin')!.getAttribute('href')).toBe(`${APP}/auth/sign-in`);
    expect(document.getElementById('pricing')!.getAttribute('href')).toBe('/ar/pricing');
    expect(setItem).not.toHaveBeenCalled();
  });
});
