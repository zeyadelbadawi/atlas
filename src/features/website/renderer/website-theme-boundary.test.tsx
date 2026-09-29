/**
 * The public-website token boundary is CLOSED (Academy branding leak fix).
 *
 * Dashboard-origin components on a public site read the generic accent
 * tokens (`--primary`/`--ring`). `WebsiteThemeScope` must map those to the
 * ACADEMY's own brand colour so they never fall through to Atlas's own
 * palette (or a dark-mode version of it). This pins that the scope emits the
 * brand-mapped tokens, and that two academies get two different palettes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { resolveModernEducationTokens } from '../modern-education/modern-education.brand-mapping';

function scopeStyle(
  brandPrimary: string,
  themeKey: 'corporate-learning' | 'modern-education' = 'corporate-learning'
): string {
  const { container } = render(
    <WebsiteThemeScope
      theme={getWebsiteTheme(themeKey)}
      brand={{
        primaryColor: brandPrimary,
        secondaryColor: brandPrimary,
        accentColor: brandPrimary,
      }}
    >
      <div>content</div>
    </WebsiteThemeScope>
  );
  const el = container.querySelector('.website-theme-scope') as HTMLElement;
  return el.getAttribute('style') ?? '';
}

afterEach(() => cleanup());

describe('WebsiteThemeScope — closed token boundary', () => {
  it('maps the academy brand colour onto the generic --primary and --ring tokens', () => {
    const style = scopeStyle('12 90% 50%');
    expect(style).toContain('--primary: 12 90% 50%');
    expect(style).toContain('--ring: 12 90% 50%');
    // A hover shade is derived, not left to the Atlas default.
    expect(style).toContain('--primary-hover:');
    // The website's own neutral page background is still owned by the scope.
    expect(style).toContain('--website-background: #ffffff');
  });

  it('gives two academies two different primary palettes (no contamination)', () => {
    const a = scopeStyle('200 80% 40%');
    cleanup();
    const b = scopeStyle('340 70% 45%');
    expect(a).toContain('--primary: 200 80% 40%');
    expect(b).toContain('--primary: 340 70% 45%');
    expect(a).not.toEqual(b);
  });

  /*
   * Theme 1 (plan §F.5) maps the same tokens to the palette's accessible
   * roles — still the Academy's own brand, never Atlas's, and still
   * different per Academy — rather than the raw colour.
   */
  it('Theme 1: maps them to the derived CTA and focus roles, per Academy', () => {
    const theme = getWebsiteTheme('modern-education');
    const tokensFor = (primary: string) =>
      resolveModernEducationTokens({
        theme,
        seeds: { primary, secondary: primary, accent: primary },
      }).roles;
    const a = scopeStyle('200 80% 40%', 'modern-education');
    const aRoles = tokensFor('200 80% 40%');
    expect(a).toContain(`--primary: ${aRoles.cta}`);
    expect(a).toContain(`--ring: ${aRoles.focus}`);
    expect(a).toContain(`--website-background: hsl(${aRoles.background})`);
    cleanup();
    const b = scopeStyle('340 70% 45%', 'modern-education');
    expect(b).toContain(`--primary: ${tokensFor('340 70% 45%').cta}`);
    expect(a).not.toEqual(b);
  });

  it('Theme 1: a stored colour that is not a valid triplet falls back instead of breaking the page', () => {
    expect(() => scopeStyle('#1f6feb', 'modern-education')).not.toThrow();
  });
});
