/**
 * DL-57 — the SPA's copy of the reserved-label rule. The backend
 * (`isReservedSubdomain` in atlas-backend
 * `src/provisioning/dto/provisioning.constants.ts`) and the database guard
 * are the authority; these are the same samples its spec pins, so a drift
 * between the copies shows up here.
 */
import { describe, expect, it } from 'vitest';
import {
  PLATFORM_LOOKALIKE_WORDS,
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_FILLER_WORDS,
  SUBDOMAIN_REGEX,
  isReservedSubdomain,
} from './provisioning.constants';

describe('isReservedSubdomain (DL-57)', () => {
  it.each([
    'docs',
    'doc',
    'help',
    'www',
    'api',
    'video',
    'ssh',
    'learn',
    'academy',
    'demo',
    'DOCS',
    ' help ',
    'docs-2',
    'docs2',
    'www1',
    'd0cs',
    'he1p',
    'help-center',
    'helpcenter',
    'apidocs',
    'api-docs',
    'support-desk',
    'status-page',
    'my-docs',
    'sign-in',
    'mail-hub',
    'atlas-math',
    'my-atlas',
    'atlasacademy',
    '4tlas',
    'at1as',
    'admin-panel',
    'administrator',
    'adm1n',
  ])('refuses "%s"', (label) => {
    expect(isReservedSubdomain(label)).toBe(true);
  });

  it.each([
    'learn-english',
    'math-academy',
    'academy-online',
    'al-nour',
    'mo7amed-math',
    'english-with-sara',
    'ahmed-physics',
    'owner-123',
    'demo-school',
    'helpme',
    'statusquo',
    'webinar-hub',
    'home-page',
    'video-lessons',
    'ns3',
  ])('allows "%s"', (label) => {
    expect(isReservedSubdomain(label)).toBe(false);
  });

  it('every word is lowercase, unique and a valid label', () => {
    for (const list of [
      RESERVED_SUBDOMAINS,
      PLATFORM_LOOKALIKE_WORDS,
      SUBDOMAIN_FILLER_WORDS,
    ]) {
      expect(new Set(list).size).toBe(list.length);
      for (const word of list) expect(word).toMatch(SUBDOMAIN_REGEX);
    }
  });

  it('keeps the backend list size (71 exact labels at DL-57)', () => {
    expect(RESERVED_SUBDOMAINS).toContain('docs');
    expect(RESERVED_SUBDOMAINS).toContain('doc');
    expect(RESERVED_SUBDOMAINS).toContain('help');
    expect(RESERVED_SUBDOMAINS.length).toBe(71);
  });
});
