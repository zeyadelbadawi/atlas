import { describe, expect, it } from 'vitest';
import {
  hasSignedInHint,
  isDashboardHost,
  marketingHref,
  signedInHintClearCookie,
} from './platform-hosts.utils';

const APP = 'https://dashboard.atlass.dpdns.org';
const SITE = 'https://atlass.dpdns.org';

describe('platform hosts (DL-63)', () => {
  it('recognises only the configured dashboard host', () => {
    expect(isDashboardHost('dashboard.atlass.dpdns.org', APP)).toBe(true);
    expect(isDashboardHost('Dashboard.Atlass.dpdns.org', APP)).toBe(true);
    expect(isDashboardHost('atlass.dpdns.org', APP)).toBe(false);
    expect(isDashboardHost('nour.atlass.dpdns.org', APP)).toBe(false);
    expect(isDashboardHost('dashboard.atlass.dpdns.org', undefined)).toBe(false);
  });

  it('links marketing pages to the apex only from the dashboard host', () => {
    const on = { hostname: 'dashboard.atlass.dpdns.org', siteUrl: SITE, appUrl: APP };
    expect(marketingHref('/', on)).toBe('https://atlass.dpdns.org/');
    expect(marketingHref('/ar/pricing', on)).toBe('https://atlass.dpdns.org/ar/pricing');
    expect(marketingHref('/', { ...on, hostname: 'atlass.dpdns.org' })).toBe('/');
    expect(marketingHref('/', { ...on, hostname: 'localhost' })).toBe('/');
    expect(marketingHref('/', { ...on, siteUrl: undefined })).toBe('/');
  });

  it('reads the hint only with its exact name and value', () => {
    expect(hasSignedInHint('a=1; atlas_signed_in=1; b=2')).toBe(true);
    expect(hasSignedInHint('atlas_signed_in=1')).toBe(true);
    expect(hasSignedInHint('atlas_signed_in=0')).toBe(false);
    expect(hasSignedInHint('xatlas_signed_in=1')).toBe(false);
    expect(hasSignedInHint('atlas_signed_in=1x')).toBe(false);
    expect(hasSignedInHint('')).toBe(false);
  });

  it('clears the hint only from the platform hosts over HTTPS', () => {
    const base = {
      protocol: 'https:',
      platformBaseDomain: 'atlass.dpdns.org',
      appUrl: APP,
    };
    expect(signedInHintClearCookie({ ...base, hostname: 'dashboard.atlass.dpdns.org' })).toBe(
      'atlas_signed_in=; Domain=atlass.dpdns.org; Path=/; Max-Age=0; Secure; SameSite=Lax'
    );
    expect(signedInHintClearCookie({ ...base, hostname: 'atlass.dpdns.org' })).not.toBeNull();
    expect(signedInHintClearCookie({ ...base, hostname: 'nour.atlass.dpdns.org' })).toBeNull();
    expect(signedInHintClearCookie({ ...base, hostname: 'learn.example.com' })).toBeNull();
    expect(
      signedInHintClearCookie({ ...base, protocol: 'http:', hostname: 'dashboard.atlass.dpdns.org' })
    ).toBeNull();
    expect(
      signedInHintClearCookie({ ...base, platformBaseDomain: undefined, hostname: 'x' })
    ).toBeNull();
  });
});
