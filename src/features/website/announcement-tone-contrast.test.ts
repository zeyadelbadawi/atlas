/**
 * CMS phase 3d (batch C) — the notice strip keeps its text and its button at
 * 4.5:1 on every tone in all four themes, for any brand.
 *
 * Each theme draws the three named tones from colour pairs its brand
 * mapping emits (see the `*-enrol` renderers and stylesheets): the brand
 * tone is the CTA fill with its foreground (the button inverted, or as a
 * line, in the same pair), the soft and dark tones are the theme's own
 * grounds with their text, button and link colours. This checks every pair
 * the strip paints — text, filled button, outlined button, text link — as
 * the browser paints it (8-bit channels), across an identity matrix of
 * brands from neon yellow to near black.
 */
import { describe, expect, it } from 'vitest';
import {
  parseHslTriplet,
  relativeLuminance,
  type HslTriplet,
} from './brand-engine';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { mapModernEducationBrandPalette } from './modern-education/modern-education.brand-mapping';
import { mapAtelierBrandPalette } from './atelier/atelier.brand-mapping';
import { mapManaraBrandPalette } from './manara/manara.brand-mapping';
import { mapRiwaqBrandPalette } from './riwaq/riwaq.brand-mapping';
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from './theme-packs/theme-pack.types';
import type { AnnouncementTone, WebsiteThemeKey } from '@types';

type Seeds = BrandMappingInput['seeds'];
const same = (colour: HslTriplet): Seeds => ({
  primary: colour,
  secondary: colour,
  accent: colour,
});

const BRANDS: Record<string, Seeds> = {
  blue: same('221 83% 53%'),
  orange: {
    primary: '24 95% 53%',
    secondary: '199 89% 38%',
    accent: '43 96% 56%',
  },
  neonYellow: same('66 100% 50%'),
  pastelPink: same('340 80% 85%'),
  lightCyan: same('185 90% 70%'),
  nearBlack: same('220 15% 10%'),
  greyMonochrome: same('0 0% 60%'),
  red: same('0 80% 50%'),
  teal: same('175 70% 35%'),
  purple: same('262 70% 50%'),
};

/** [background, foreground] variable names. */
type Pair = readonly [string, string];

/**
 * The pairs the strip paints, per theme and tone: its text, then each
 * button look (filled, outlined, text link). An outlined button and a link
 * are drawn in a text colour on the strip's own ground.
 */
const TONE_PAIRS: Record<
  'modern-education' | 'atelier' | 'manara' | 'riwaq',
  Record<AnnouncementTone, Record<string, Pair>>
> = {
  'modern-education': {
    brand: {
      text: ['--website-cta', '--website-cta-foreground'],
      filled: ['--website-cta-foreground', '--website-cta'],
    },
    soft: {
      text: ['--website-surface', '--website-foreground'],
      filled: ['--website-cta', '--website-cta-foreground'],
      outlined: ['--website-background', '--website-foreground'],
      link: ['--website-surface', '--website-link'],
    },
    dark: {
      text: ['--website-ink', '--website-ink-foreground'],
      filled: ['--website-ink-cta', '--website-ink-cta-foreground'],
    },
  },
  atelier: {
    brand: {
      text: ['--atelier-brand', '--atelier-paper'],
      filled: ['--atelier-paper', '--atelier-brand'],
    },
    soft: {
      text: ['--atelier-paper-deep', '--atelier-text'],
      filled: ['--atelier-brand', '--atelier-paper'],
      link: ['--atelier-paper-deep', '--atelier-brand'],
    },
    dark: {
      text: ['--atelier-ink', '--atelier-ink-text'],
      filled: ['--atelier-ink-cta', '--atelier-ink-cta-foreground'],
      link: ['--atelier-ink', '--atelier-ink-brand'],
    },
  },
  manara: {
    brand: {
      text: ['--mn-block', '--mn-block-text'],
      filled: ['--mn-accent', '--mn-accent-text'],
    },
    soft: {
      text: ['--mn-day-soft', '--mn-text'],
      filled: ['--mn-accent', '--mn-accent-text'],
      link: ['--mn-day-soft', '--mn-brand-text'],
    },
    dark: {
      text: ['--mn-night', '--mn-night-text'],
      filled: ['--mn-accent', '--mn-accent-text'],
      link: ['--mn-night', '--mn-night-brand'],
    },
  },
  riwaq: {
    brand: {
      text: ['--rw-action', '--rw-action-text'],
      filled: ['--rw-action-text', '--rw-action'],
    },
    soft: {
      text: ['--rw-stone', '--rw-ink'],
      filled: ['--rw-action', '--rw-action-text'],
      link: ['--rw-stone', '--rw-brand-ink'],
    },
    dark: {
      text: ['--rw-deep', '--rw-deep-text'],
      filled: ['--rw-deep-action', '--rw-deep-action-text'],
    },
  },
};

const MAPPINGS: Record<
  keyof typeof TONE_PAIRS,
  (input: BrandMappingInput) => WebsiteBrandVariables
> = {
  'modern-education': mapModernEducationBrandPalette,
  atelier: mapAtelierBrandPalette,
  manara: mapManaraBrandPalette,
  riwaq: mapRiwaqBrandPalette,
};

const HSL = /^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/;

function triplet(variables: WebsiteBrandVariables, name: string): HslTriplet {
  const value = variables[name as `--${string}`];
  const match = value ? HSL.exec(value) : null;
  if (!match) throw new Error(`${name} is not a plain hsl() colour: ${value}`);
  return `${match[1]} ${match[2]}% ${match[3]}%` as HslTriplet;
}

/** Contrast as painted: each channel rounded to 8 bits. */
function paintedContrast(a: HslTriplet, b: HslTriplet): number {
  const luminance = (value: HslTriplet) => {
    const { r, g, b: blue } = parseHslTriplet(value);
    const q = (channel: number) => Math.round(channel * 255) / 255;
    return relativeLuminance({ r: q(r), g: q(g), b: q(blue) });
  };
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe.each(Object.keys(TONE_PAIRS) as (keyof typeof TONE_PAIRS)[])(
  '%s — the notice strip',
  (themeKey) => {
    const theme = getWebsiteTheme(themeKey as WebsiteThemeKey);
    it.each(Object.entries(BRANDS))(
      'every tone reads at 4.5:1 for a %s brand',
      (_brand, seeds) => {
        const variables = MAPPINGS[themeKey]({ theme, seeds });
        for (const [tone, pairs] of Object.entries(TONE_PAIRS[themeKey])) {
          for (const [part, [background, foreground]] of Object.entries(
            pairs
          )) {
            const ratio = paintedContrast(
              triplet(variables, background),
              triplet(variables, foreground)
            );
            expect(
              ratio,
              `${tone} ${part}: ${foreground} on ${background}`
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    );
  }
);
