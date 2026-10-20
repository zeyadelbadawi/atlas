/**
 * DL-57 — host resolution never treats a reserved platform label as an
 * academy (the help center lives on `docs.<base>`), while ordinary academy
 * labels, older look-alike labels, custom domains and the platform host
 * resolve as before.
 */
import { describe, expect, it } from 'vitest';
import { resolvePublicWebsiteContext } from './public-website-context.utils';

const BASE = 'atlass.dpdns.org';
const resolve = (host: string) =>
  resolvePublicWebsiteContext(host, '', BASE, false);

describe('resolvePublicWebsiteContext', () => {
  it.each(['docs', 'doc', 'help', 'api', 'www', 'blog', 'video', 'status'])(
    '%s.<base> is the Atlas app, never an academy',
    (label) => {
      expect(resolve(`${label}.${BASE}`)).toEqual({ mode: 'atlas-app' });
    }
  );

  it('an academy subdomain resolves as an academy website', () => {
    expect(resolve(`al-nour.${BASE}`)).toEqual({
      mode: 'academy-website',
      lookupType: 'subdomain',
      value: 'al-nour',
    });
  });

  it('an older academy holding a look-alike label still resolves', () => {
    expect(resolve(`atlas-fin-63195.${BASE}`)).toMatchObject({
      mode: 'academy-website',
      value: 'atlas-fin-63195',
    });
  });

  it('the platform host and www are the Atlas app; a custom domain is a candidate', () => {
    expect(resolve(BASE)).toEqual({ mode: 'atlas-app' });
    expect(resolve(`www.${BASE}`)).toEqual({ mode: 'atlas-app' });
    expect(resolve('learn.example.com')).toEqual({
      mode: 'academy-website',
      lookupType: 'custom-domain',
      value: 'learn.example.com',
    });
  });
});
