/**
 * Theme 1's brand mapping (plan §F.5, §B, §I.2) across the 12-brand
 * identity matrix: every text/fill pair the mapping emits is readable, the
 * canvas stays neutral whatever the logo, and the stored palette is used
 * when present.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBrandPalette,
  contrastRatio,
  tripletToOklch,
  type HslTriplet,
} from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import {
  MODERN_EDUCATION_NEUTRAL_CHROMA_CAP,
  mapModernEducationBrandPalette,
  resolveModernEducationTokens,
} from './modern-education.brand-mapping';

const theme = getWebsiteTheme('modern-education');

/** §I.2's identity matrix (as legacy seeds, the render-time path). */
const IDENTITY_MATRIX: Record<
  string,
  { primary: HslTriplet; secondary: HslTriplet; accent: HslTriplet }
> = {
  blue: {
    primary: '221 83% 53%',
    secondary: '221 83% 53%',
    accent: '221 83% 53%',
  },
  orange: {
    primary: '24 95% 53%',
    secondary: '199 89% 38%',
    accent: '43 96% 56%',
  },
  purple: {
    primary: '262 70% 50%',
    secondary: '330 75% 55%',
    accent: '45 95% 55%',
  },
  neonYellow: {
    primary: '66 100% 50%',
    secondary: '66 100% 50%',
    accent: '66 100% 50%',
  },
  pastelPink: {
    primary: '340 80% 85%',
    secondary: '340 80% 85%',
    accent: '340 80% 85%',
  },
  nearBlack: {
    primary: '220 15% 10%',
    secondary: '220 15% 10%',
    accent: '220 15% 10%',
  },
  monochrome: {
    primary: '0 0% 20%',
    secondary: '0 0% 60%',
    accent: '0 0% 40%',
  },
  redLikeError: {
    primary: '0 80% 50%',
    secondary: '0 80% 50%',
    accent: '0 80% 50%',
  },
  teal: {
    primary: '175 70% 35%',
    secondary: '175 70% 35%',
    accent: '175 70% 35%',
  },
  brown: {
    primary: '25 50% 30%',
    secondary: '35 60% 50%',
    accent: '25 50% 30%',
  },
  multiColour: {
    primary: '200 90% 45%',
    secondary: '330 80% 55%',
    accent: '45 95% 55%',
  },
  noLogo: {
    primary: theme.tokens.defaultPrimary,
    secondary: theme.tokens.defaultSecondary,
    accent: theme.tokens.defaultAccent,
  },
};

describe.each(Object.entries(IDENTITY_MATRIX))(
  'Theme 1 mapping — %s',
  (_name, seeds) => {
    const t = resolveModernEducationTokens({ theme, seeds });
    const r = t.roles;

    it('keeps every emitted text/fill pair readable', () => {
      const pairs: [HslTriplet, HslTriplet, number, string][] = [
        [r.foreground, r.background, 7, 'body on background'],
        [r.foreground, r.surface, 7, 'body on surface'],
        [r.foregroundMuted, r.background, 4.5, 'muted on background'],
        [r.foregroundMuted, r.surface, 4.5, 'muted on surface'],
        [r.ctaForeground, r.cta, 4.5, 'CTA label'],
        [r.ctaForeground, t.ctaHover, 4.5, 'CTA label (hover)'],
        [r.ctaForeground, t.ctaPressed, 4.5, 'CTA label (pressed)'],
        [r.link, r.background, 4.5, 'link / primary-solid as text'],
        [r.link, r.surface, 4.5, 'link on surface'],
        ['0 0% 100%', r.link, 4.5, 'white on primary-solid fill'],
        [t.chipForeground, t.chipBackground, 4.5, 'chip'],
        ['0 0% 100%', t.ink, 4.5, 'text on the ink band'],
        [t.inkCtaForeground, t.inkCta, 4.5, 'CTA label on the ink band'],
        [t.inkCta, t.ink, 3, 'CTA boundary on the ink band'],
        [r.focus, r.background, 3, 'focus ring'],
      ];
      for (const [fg, bg, min, label] of pairs) {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(min);
      }
    });

    it('keeps the canvas neutral: the brand never becomes a page or text colour', () => {
      const canvas = {
        background: r.background,
        surface: r.surface,
        surfaceMuted: r.surfaceMuted,
        border: t.border,
      };
      for (const [role, color] of Object.entries(canvas)) {
        // Integer HSL rounding can add a hair of chroma.
        expect(tripletToOklch(color).C, role).toBeLessThanOrEqual(
          MODERN_EDUCATION_NEUTRAL_CHROMA_CAP + 0.002
        );
      }
      expect(
        contrastRatio(t.border, r.background),
        'border boundary'
      ).toBeGreaterThanOrEqual(3);
      expect(tripletToOklch(t.divider).C, 'divider').toBeLessThanOrEqual(
        MODERN_EDUCATION_NEUTRAL_CHROMA_CAP + 0.002
      );
      expect(tripletToOklch(r.foreground).C).toBeLessThanOrEqual(0.022);
      expect(tripletToOklch(t.ink).L).toBeLessThan(0.25);
    });

    it('gives a CTA that fails 3:1 on the canvas a visible border', () => {
      const vars = mapModernEducationBrandPalette({ theme, seeds });
      const needsBorder = contrastRatio(r.cta, r.background) < 3;
      expect(vars['--website-cta-border'] === 'transparent').toBe(!needsBorder);
    });
  }
);

describe('Theme 1 mapping — source of truth (§F.4.6)', () => {
  const seeds = IDENTITY_MATRIX.orange;

  it('uses the stored palette when there is one', () => {
    const stored = buildBrandPalette({
      seeds: { primary: '262 70% 50%' },
      source: 'manual',
      status: 'confirmed',
      overrides: { link: '262 70% 35%' },
    });
    const vars = mapModernEducationBrandPalette({
      theme,
      seeds,
      palette: stored,
    });
    expect(vars['--website-link']).toBe('hsl(262 70% 35%)');
    expect(vars['--primary']).toBe(stored.roles.cta);
  });

  it('ignores a stored palette that is incomplete, deriving from the seeds instead', () => {
    const broken = { roles: { cta: '0 0% 0%' } } as never;
    expect(
      mapModernEducationBrandPalette({ theme, seeds, palette: broken })
    ).toEqual(mapModernEducationBrandPalette({ theme, seeds }));
  });

  it('never emits the raw brand colour as a text colour', () => {
    const neon = IDENTITY_MATRIX.neonYellow;
    const vars = mapModernEducationBrandPalette({ theme, seeds: neon });
    expect(vars['--website-primary-solid']).not.toBe(`hsl(${neon.primary})`);
    expect(vars['--website-link']).not.toBe(`hsl(${neon.primary})`);
    expect(vars['--website-foreground']).not.toBe(`hsl(${neon.primary})`);
  });
});
