/**
 * The shared social platform catalogue, icon mapping and legacy
 * normalisation (Task B).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_NAMES,
  SOCIAL_URL_EXAMPLES,
  isValidSocialUrl,
  platformFromLabel,
  platformFromUrl,
  resolveSocialPlatform,
} from './social-platforms';
import { SOCIAL_ICON_PATHS } from './social-icon-paths';
import { SocialIcon } from './SocialIcon';

const lt = (en: string, ar = '') => ({ en, ar });

describe('social platform catalogue', () => {
  it('offers at least the six core platforms', () => {
    for (const platform of [
      'facebook',
      'instagram',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
    ]) {
      expect(SOCIAL_PLATFORMS).toContain(platform);
    }
  });

  it('has a name, an example address and an icon for every platform', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(SOCIAL_PLATFORM_NAMES[platform]).toBeTruthy();
      expect(isValidSocialUrl(SOCIAL_URL_EXAMPLES[platform])).toBe(true);
      // The example's own host identifies the platform it is the example for.
      expect(platformFromUrl(SOCIAL_URL_EXAMPLES[platform])).toBe(platform);
      expect(SOCIAL_ICON_PATHS[platform]).toMatch(/^M[\d.\s-]/);
    }
  });
});

describe('legacy links: the platform is inferred, never invented', () => {
  it.each([
    ['Facebook', 'facebook'],
    ['FACEBOOK', 'facebook'],
    [' facebook ', 'facebook'],
    ['FB', 'facebook'],
    ['Instagram', 'instagram'],
    ['insta', 'instagram'],
    ['Twitter', 'x'],
    ['X (Twitter)', 'x'],
    ['X', 'x'],
    ['Tik Tok', 'tiktok'],
    ['TikTok', 'tiktok'],
    ['LinkedIn', 'linkedin'],
    ['Linked-In', 'linkedin'],
    ['YouTube', 'youtube'],
    ['You Tube', 'youtube'],
    ['WhatsApp', 'whatsapp'],
    ['Telegram', 'telegram'],
    ['فيسبوك', 'facebook'],
    ['إنستغرام', 'instagram'],
    ['يوتيوب', 'youtube'],
    ['تيك توك', 'tiktok'],
    ['واتساب', 'whatsapp'],
  ])('label %j → %s', (label, platform) => {
    expect(platformFromLabel(label)).toBe(platform);
  });

  it.each([
    ['https://www.facebook.com/acme', 'facebook'],
    ['https://m.facebook.com/acme', 'facebook'],
    ['https://instagram.com/acme', 'instagram'],
    ['https://twitter.com/acme', 'x'],
    ['https://x.com/acme', 'x'],
    ['https://www.tiktok.com/@acme', 'tiktok'],
    ['https://www.linkedin.com/company/acme', 'linkedin'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://wa.me/201000000000', 'whatsapp'],
    ['https://t.me/acme', 'telegram'],
    ['https://github.com/acme', 'github'],
  ])('url %s → %s', (url, platform) => {
    expect(platformFromUrl(url)).toBe(platform);
  });

  it('does not match look-alike hosts', () => {
    expect(platformFromUrl('https://notfacebook.com/x')).toBeUndefined();
    expect(
      platformFromUrl('https://facebook.com.evil.example/x')
    ).toBeUndefined();
    expect(platformFromUrl('not a url')).toBeUndefined();
  });

  it('prefers the saved platform, then the label, then the URL', () => {
    expect(
      resolveSocialPlatform({
        platform: 'youtube',
        label: lt('Facebook'),
        url: 'https://x.com/a',
      })
    ).toBe('youtube');
    expect(
      resolveSocialPlatform({ label: lt('Instagram'), url: 'https://x.com/a' })
    ).toBe('instagram');
    expect(
      resolveSocialPlatform({ label: lt('Our page'), url: 'https://x.com/a' })
    ).toBe('x');
    expect(resolveSocialPlatform({ label: lt('', 'فيسبوك'), url: '' })).toBe(
      'facebook'
    );
  });

  it('never resolves a label to an inherited object member', () => {
    for (const label of [
      'constructor',
      'toString',
      'valueOf',
      '__proto__',
      'hasOwnProperty',
    ]) {
      expect(platformFromLabel(label)).toBeUndefined();
      expect(
        resolveSocialPlatform({
          label: lt(label),
          url: 'https://news.example.com',
        })
      ).toBeUndefined();
    }
  });

  it('leaves an unidentifiable link without a platform (it still renders, generically)', () => {
    expect(
      resolveSocialPlatform({
        label: lt('Our newsletter'),
        url: 'https://news.example.com',
      })
    ).toBeUndefined();
    // An unknown stored value is ignored, not trusted.
    expect(
      resolveSocialPlatform({
        platform: 'myspace' as never,
        label: lt('Blog'),
        url: '',
      })
    ).toBeUndefined();
  });
});

describe('social URL validation', () => {
  it('accepts web addresses only', () => {
    expect(isValidSocialUrl('https://instagram.com/acme')).toBe(true);
    expect(isValidSocialUrl('http://example.com')).toBe(true);
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html,x',
      'mailto:a@b.c',
      'instagram.com/acme',
      '',
    ]) {
      expect(isValidSocialUrl(bad)).toBe(false);
    }
  });
});

describe('SocialIcon', () => {
  it('draws the platform mark in currentColor, hidden from assistive technology', () => {
    const { container } = render(
      <SocialIcon platform="instagram" className="size-4" />
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-social-icon')).toBe('instagram');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(
      SOCIAL_ICON_PATHS.instagram
    );
  });

  it('draws a generic link mark for an unidentified legacy link', () => {
    const { container } = render(<SocialIcon platform={undefined} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-social-icon')).toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
