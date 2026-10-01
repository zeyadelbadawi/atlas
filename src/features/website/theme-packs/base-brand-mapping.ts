/**
 * The base brand mapping (Theme 1 plan §F.5): exactly the variables
 * `WebsiteThemeScope` has always emitted, moved here unchanged so Themes 2–5
 * (and Theme 1, until its own mapping lands in Phase 4) render pixel-for-
 * pixel as before. Pinned by `website-theme-scope-variables.test.tsx`.
 *
 * It maps the three legacy seeds straight onto UI colours — the behaviour
 * the Brand System exists to replace (§A.5). A persisted palette is ignored
 * here on purpose: base themes adopt semantic roles only when they get
 * their own mapping.
 */
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from './theme-pack.types';

/**
 * Shifts an `"H S% L%"` triplet's lightness for a hover shade — matches
 * `WebsiteBrandBridge`'s own approach so scope-level and bridge-level hover
 * shades agree.
 */
function shiftLightness(hslTriplet: string, deltaPercent: number): string {
  const match = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(hslTriplet.trim());
  if (!match) return hslTriplet;
  const [, h, sat, l] = match;
  const nextLightness = Math.min(100, Math.max(0, Number(l) + deltaPercent));
  return `${h} ${sat}% ${nextLightness}%`;
}

export function mapBaseBrandPalette({
  seeds,
}: BrandMappingInput): WebsiteBrandVariables {
  const { primary, secondary, accent } = seeds;
  return {
    /**
     * THE PUBLIC SITE OWNS ITS OWN PAGE COLOURS.
     *
     * These used to come from Atlas's `bg-background`/`text-foreground`
     * dashboard tokens, which caused two real problems. First, that
     * palette deliberately tints every neutral toward the ATLAS brand
     * hue ("Pure white and pure black are never used" — `index.css`),
     * so every academy website inherited a blue-green cast that had
     * nothing to do with that academy's own branding. Second, the
     * tokens flip with the dashboard's `.dark` class, so an admin who
     * preferred dark mode previewed — and, on shared surfaces, showed
     * visitors — a dark version of a site whose owner never chose one.
     *
     * A customer's public website is white because that is what its
     * design calls for, not because of anything the Atlas dashboard
     * happens to be set to.
     */
    '--website-background': '#ffffff',
    '--website-foreground': 'hsl(222 22% 12%)',
    /** A neutral separation surface — never a brand wash. */
    '--website-surface': 'hsl(210 20% 97%)',
    '--website-border': 'hsl(214 20% 91%)',

    '--website-primary': primary,
    '--website-primary-solid': `hsl(${primary})`,
    '--website-primary-muted': `hsl(${primary} / 0.3)`,
    /**
     * An 8% wash of the academy's brand colour. Correct for SMALL,
     * deliberately branded elements — image placeholders, avatar
     * fallbacks, icon tiles. It is NOT a page background: applied to a
     * full-width band it turns a whole screen the brand colour, which
     * is exactly how the hero ended up reading as a green page rather
     * than a white page with green accents.
     */
    '--website-primary-surface': `hsl(${primary} / 0.08)`,
    '--website-secondary': secondary,
    '--website-secondary-solid': `hsl(${secondary})`,
    '--website-accent': accent,
    '--website-accent-solid': `hsl(${accent})`,

    /**
     * BRAND COLOUR ONTO THE GENERIC ACCENT TOKENS. Dashboard-origin
     * components (Button/Badge/etc.) rendered on the public site read
     * these; mapping them to the academy's own brand here — for the whole
     * scope, not just where `WebsiteBrandBridge` wraps — is what stops
     * them from showing the Atlas brand colour (or a dark-mode version of
     * it). Per-academy by construction: `primary` is this academy's own
     * brand, so no two academies share a palette. Neutral accent tokens
     * (`--secondary`/`--accent`/`--destructive`) are set statically on
     * `.website-theme-scope` in `index.css`.
     */
    '--primary': primary,
    '--primary-hover': shiftLightness(primary, -6),
    '--ring': primary,
  };
}
