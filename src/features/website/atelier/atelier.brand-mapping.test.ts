/**
 * Theme 2 (Atelier) brand mapping across the identity matrix: every text and
 * fill pair it emits is readable as painted, the paper never takes the
 * brand's colour, and the stored palette is used when present.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBrandPalette,
  tripletToOklch,
  type HslTriplet,
} from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import {
  ATELIER_NEUTRAL_CHROMA_CAP,
  mapAtelierBrandPalette,
  renderedContrast,
  resolveAtelierTokens,
} from './atelier.brand-mapping';

const theme = getWebsiteTheme('atelier');

type Seeds = { primary: HslTriplet; secondary: HslTriplet; accent: HslTriplet };
const same = (c: HslTriplet): Seeds => ({
  primary: c,
  secondary: c,
  accent: c,
});

const IDENTITY_MATRIX: Record<string, Seeds> = {
  blue: same('221 83% 53%'),
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
  neonYellow: same('66 100% 50%'),
  pastelPink: same('340 80% 85%'),
  nearBlack: same('220 15% 10%'),
  monochrome: {
    primary: '0 0% 20%',
    secondary: '0 0% 60%',
    accent: '0 0% 40%',
  },
  redLikeError: same('0 80% 50%'),
  teal: same('175 70% 35%'),
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
  white: same('0 0% 100%'),
  invalid: {
    primary: 'not-a-colour',
    secondary: '',
    accent: '#ff0000',
  } as unknown as Seeds,
  noLogo: {
    primary: theme.tokens.defaultPrimary,
    secondary: theme.tokens.defaultSecondary,
    accent: theme.tokens.defaultAccent,
  },
};

describe.each(Object.entries(IDENTITY_MATRIX))(
  'Atelier mapping — %s',
  (_name, seeds) => {
    const t = resolveAtelierTokens({ theme, seeds });
    const papers = [t.paper, t.paperDeep];
    const inks = [t.ink, t.inkRaised];
    const on = (color: HslTriplet, grounds: HslTriplet[], ratio: number) => {
      for (const ground of grounds) {
        expect(renderedContrast(color, ground)).toBeGreaterThanOrEqual(ratio);
      }
    };

    it('keeps body text at 7:1 and muted text at 4.5:1 on both papers', () => {
      on(t.text, papers, 7);
      on(t.textMuted, papers, 4.5);
    });

    it('keeps the brand as text, the feedback colours and chips readable', () => {
      on(t.brandText, papers, 4.5);
      on(t.success, papers, 4.5);
      on(t.warning, papers, 4.5);
      on(t.error, papers, 4.5);
      on(t.chipForeground, [t.chipBackground], 4.5);
    });

    it('gives the CTA a 4.5:1 label and a fill that reads against paper', () => {
      on(t.ctaForeground, [t.cta], 4.5);
      on(t.cta, papers, 3);
    });

    it('keeps focus, the input edge and the accent rule at 3:1 on paper', () => {
      on(t.focus, papers, 3);
      on(t.inputBorder, papers, 3);
      on(t.accentRule, papers, 3);
    });

    it('keeps every ink-environment pair readable', () => {
      on(t.inkText, inks, 7);
      on(t.inkTextMuted, inks, 4.5);
      on(t.inkBrand, inks, 4.5);
      on(t.inkCtaForeground, [t.inkCta], 4.5);
    });

    it('never tints the paper with the brand', () => {
      for (const surface of [t.paper, t.paperDeep, t.hairline]) {
        expect(tripletToOklch(surface).C).toBeLessThanOrEqual(
          ATELIER_NEUTRAL_CHROMA_CAP + 0.006
        );
      }
    });

    it('emits only valid CSS colour values', () => {
      const vars = mapAtelierBrandPalette({ theme, seeds });
      for (const [name, value] of Object.entries(vars)) {
        expect(name.startsWith('--')).toBe(true);
        expect(value).not.toMatch(/undefined|NaN/);
      }
      expect(vars['--atelier-thread']).toBe(`hsl(${t.brandText})`);
    });
  }
);

describe('Atelier mapping — stored palette', () => {
  it('uses the stored, validated palette when it is usable', () => {
    const palette = buildBrandPalette({
      seeds: {
        primary: '24 95% 53%',
        secondary: '199 89% 38%',
        accent: '43 96% 56%',
      },
      source: 'manual',
      status: 'confirmed',
    });
    const t = resolveAtelierTokens({
      theme,
      seeds: same('221 83% 53%'),
      palette,
    });
    expect(t.roles).toEqual(palette.roles);
  });
});
