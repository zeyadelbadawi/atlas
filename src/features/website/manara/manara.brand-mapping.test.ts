/**
 * Theme 3 (Manara) brand mapping across the identity matrix: every text and
 * fill pair it emits is readable as painted on the ground it is painted on,
 * the day ground never takes the brand's colour, the blocks stay in the
 * brand's hue, and the stored palette is used when present.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBrandPalette,
  tripletToOklch,
  type HslTriplet,
} from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import {
  MANARA_DAY_CHROMA_CAP,
  mapManaraBrandPalette,
  renderedContrast,
  resolveManaraTokens,
} from './manara.brand-mapping';

const theme = getWebsiteTheme('manara');

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
  'Manara mapping — %s',
  (_name, seeds) => {
    const t = resolveManaraTokens({ theme, seeds });
    const days = [t.day, t.daySoft];
    const nights = [t.night, t.nightRaised];
    const on = (color: HslTriplet, grounds: HslTriplet[], ratio: number) => {
      for (const ground of grounds) {
        expect(renderedContrast(color, ground)).toBeGreaterThanOrEqual(ratio);
      }
    };

    it('keeps body text at 7:1 and muted text at 4.5:1 on the day grounds', () => {
      on(t.text, days, 7);
      on(t.textMuted, days, 4.5);
    });

    it('keeps the brand as text, the feedback colours and pills readable on day', () => {
      on(t.brandText, days, 4.5);
      on(t.success, days, 4.5);
      on(t.warning, days, 4.5);
      on(t.error, days, 4.5);
      on(t.pillText, [t.pill], 4.5);
    });

    it('keeps focus and the input edge at 3:1 on day, and focus at 3:1 on night', () => {
      on(t.focus, days, 3);
      on(t.inputBorder, days, 3);
      on(t.nightFocus, nights, 3);
    });

    it('keeps every night-ground pair readable', () => {
      on(t.nightText, nights, 7);
      on(t.nightTextMuted, nights, 4.5);
      on(t.nightBrand, nights, 4.5);
      on(t.nightAccentText, nights, 4.5);
      on(t.nightPillText, [t.nightPill], 4.5);
    });

    it('gives the primary block and the accent block a 4.5:1 label', () => {
      on(t.blockText, [t.block], 4.5);
      on(t.blockTextMuted, [t.block], 4.5);
      on(t.accentText, [t.accent], 4.5);
      on(t.accentText, [t.accentHover], 4.5);
    });

    it('keeps the beam visible as a graphic on night', () => {
      on(t.beam, [t.night], 3);
    });

    it('never tints the day ground with the brand', () => {
      for (const surface of [t.day, t.daySoft]) {
        expect(tripletToOklch(surface).C).toBeLessThanOrEqual(
          MANARA_DAY_CHROMA_CAP + 0.004
        );
      }
    });

    it('keeps the block in the brand hue', () => {
      const brand = tripletToOklch(t.roles.primary);
      const block = tripletToOklch(t.block);
      // An achromatic brand has no hue to keep.
      if (brand.C > 0.02 && block.C > 0.02) {
        const delta = Math.abs(((brand.h - block.h + 540) % 360) - 180);
        expect(delta).toBeLessThanOrEqual(4);
      }
    });

    it('emits only valid CSS colour values', () => {
      const vars = mapManaraBrandPalette({ theme, seeds });
      for (const [name, value] of Object.entries(vars)) {
        expect(name.startsWith('--')).toBe(true);
        expect(value).not.toMatch(/undefined|NaN/);
      }
      expect(vars['--mn-accent']).toBe(`hsl(${t.accent})`);
      expect(vars['--website-cta']).toBe(`hsl(${t.accent})`);
    });
  }
);

describe('Manara mapping — stored palette', () => {
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
    const t = resolveManaraTokens({
      theme,
      seeds: same('221 83% 53%'),
      palette,
    });
    expect(t.roles).toEqual(palette.roles);
  });
});
