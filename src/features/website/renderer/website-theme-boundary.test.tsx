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

const theme = getWebsiteTheme('modern-education');

function scopeStyle(brandPrimary: string): string {
  const { container } = render(
    <WebsiteThemeScope theme={theme} brand={{ primaryColor: brandPrimary }}>
      <div>content</div>
    </WebsiteThemeScope>,
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
});
