/**
 * Theme 1 (Modern Education) brand mapping — plan §F.5, §B "brand
 * expression".
 *
 * Input: the Academy's semantic palette — the stored one when it exists
 * (validated by the backend on save), otherwise derived here, at render
 * time, from the legacy seeds with the same engine (§F.4.6: old Academies
 * become accessible with nothing written). Output: CSS variables.
 *
 * THE RULE THIS MAPPING EXISTS TO ENFORCE: the brand fills only defined
 * slots — CTA fill, links, focus, the highlight stroke, the brand shape,
 * chips, icon tiles, the ink band's glow. The canvas (background,
 * surfaces, text, borders) is the palette's near-neutral roles, capped at
 * Theme 1's chroma limit, so no logo can turn a page background or body
 * text a brand colour. Every text/fill pair emitted here is one the
 * engine's §F.4.4 matrix (or a check below) has already guaranteed.
 *
 * Base renderers still draw Theme 1's sections until Phases 5–6, so the
 * base variable names are emitted too — each pointed at the role that
 * keeps its existing uses accessible (see `--website-primary-solid`).
 */
import {
  contrastRatio,
  deriveBrandPalette,
  deriveInteractionStates,
  formatHslTriplet,
  oklchToTriplet,
  parseHslTriplet,
  relativeLuminance,
  solveLightness,
  tripletToOklch,
  BRAND_ROLE_NAMES,
  isHslTriplet,
  type BrandPalette,
  type BrandRoles,
  type HslTriplet,
} from '../brand-engine';
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from '../theme-packs/theme-pack.types';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';

export { isUsablePalette };

/** Theme 1's canvas chroma cap (§F.4.2 step 6). */
export const MODERN_EDUCATION_NEUTRAL_CHROMA_CAP = 0.012;

/**
 * Contrast as the browser renders the pair: each channel rounded to 8 bits,
 * the precision an `hsl()` colour is painted (and measured by axe) at. The
 * engine checks exact values; a pair at 4.51:1 can paint at 4.48:1.
 */
function renderedContrast(a: HslTriplet, b: HslTriplet): number {
  const luminance = (triplet: HslTriplet) => {
    const { r, g, b: blue } = parseHslTriplet(triplet);
    const q = (channel: number) => Math.round(channel * 255) / 255;
    return relativeLuminance({ r: q(r), g: q(g), b: q(blue) });
  };
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The ink band: fixed near-black, faintly tinted with the brand hue (§F.5). */
const INK_LIGHTNESS = 0.2;
const INK_CHROMA = 0.02;

const hsl = (triplet: HslTriplet, alpha?: number): string =>
  alpha === undefined ? `hsl(${triplet})` : `hsl(${triplet} / ${alpha})`;

/** `top` over `bottom` at `alpha`, as an opaque triplet (for exact contrast checks). */
function composite(
  top: HslTriplet,
  bottom: HslTriplet,
  alpha: number
): HslTriplet {
  const a = parseHslTriplet(top);
  const b = parseHslTriplet(bottom);
  return formatHslTriplet({
    r: a.r * alpha + b.r * (1 - alpha),
    g: a.g * alpha + b.g * (1 - alpha),
    b: a.b * alpha + b.b * (1 - alpha),
  });
}

const derivedCache = new Map<string, { roles: BrandRoles; border: boolean }>();

function rolesFor(input: BrandMappingInput): {
  roles: BrandRoles;
  ctaNeedsBorder: boolean;
} {
  if (isUsablePalette(input.palette)) {
    const { roles } = input.palette;
    return {
      roles,
      ctaNeedsBorder:
        input.palette.report?.ctaNeedsBorder ??
        contrastRatio(roles.cta, roles.background) < 3,
    };
  }
  // Legacy colours are whatever an Academy stored over the years; a value
  // that isn't an HSL triplet falls back to the theme's own default rather
  // than breaking a public page.
  const tokens = input.theme.tokens;
  const seed = (value: string, fallback: HslTriplet): HslTriplet =>
    isHslTriplet(value) ? value : fallback;
  const primary = seed(input.seeds.primary, tokens.defaultPrimary);
  const secondary = seed(input.seeds.secondary, tokens.defaultSecondary);
  const accent = seed(input.seeds.accent, tokens.defaultAccent);
  const key = `${primary}|${secondary}|${accent}`;
  let cached = derivedCache.get(key);
  if (!cached) {
    const derived = deriveBrandPalette(
      { primary, secondary, accent },
      { neutralChromaCap: MODERN_EDUCATION_NEUTRAL_CHROMA_CAP }
    );
    cached = { roles: derived.roles, border: derived.report.ctaNeedsBorder };
    if (derivedCache.size > 64) derivedCache.clear();
    derivedCache.set(key, cached);
  }
  return { roles: cached.roles, ctaNeedsBorder: cached.border };
}

export interface ModernEducationBrandTokens {
  readonly roles: BrandRoles;
  /**
   * The 3:1 boundary for inputs whose border is their only edge (§F.4.4),
   * held to Theme 1's canvas cap (the engine allows up to 0.02).
   */
  readonly border: HslTriplet;
  /** A hairline for dividers and card edges — decorative, never a sole boundary. */
  readonly divider: HslTriplet;
  readonly ink: HslTriplet;
  readonly inkCta: HslTriplet;
  readonly inkCtaForeground: HslTriplet;
  readonly chipBackground: HslTriplet;
  readonly chipForeground: HslTriplet;
  readonly ctaHover: HslTriplet;
  readonly ctaPressed: HslTriplet;
  readonly ctaNeedsBorder: boolean;
}

/** The resolved Theme 1 tokens — exported so tests can check every pair. */
export function resolveModernEducationTokens(
  input: BrandMappingInput
): ModernEducationBrandTokens {
  const derived = rolesFor(input);
  const { ctaNeedsBorder } = derived;
  // Theme 1 sets links and eyebrows on the soft surface band too (page
  // heroes), not only on the background the engine checks them against.
  // A hue that clears 4.5:1 by a hair (e.g. teal: exactly 4.52:1 on the
  // surface, 4.48:1 as painted) is darkened just enough to clear it there
  // as painted.
  const roles: BrandRoles =
    renderedContrast(derived.roles.link, derived.roles.surface) >= 4.5
      ? derived.roles
      : {
          ...derived.roles,
          link:
            solveLightness(
              tripletToOklch(derived.roles.link),
              (candidate) =>
                renderedContrast(candidate, derived.roles.surface) >= 4.5 &&
                contrastRatio(candidate, derived.roles.background) >= 4.5,
              'darker'
            ) ?? derived.roles.link,
        };
  const { ctaHover, ctaPressed } = deriveInteractionStates(
    roles.cta,
    roles.ctaForeground
  );

  const ink = oklchToTriplet({
    L: INK_LIGHTNESS,
    C: INK_CHROMA,
    h: tripletToOklch(roles.primary).h,
  });
  // On the ink band the CTA must still read as a button: a dark ("ink
  // brand") CTA would vanish into it, so it inverts to a light button.
  const ctaOnInk = contrastRatio(roles.cta, ink) >= 3;
  const inkCta = ctaOnInk ? roles.cta : roles.background;
  const inkCtaForeground = ctaOnInk ? roles.ctaForeground : roles.link;

  // Chips: brand at 10 % over the surface, text in the link colour — or
  // the body colour if that tint pulls the link below 4.5:1.
  const chipBackground = composite(roles.primary, roles.surface, 0.1);
  const chipForeground =
    contrastRatio(roles.link, chipBackground) >= 4.5
      ? roles.link
      : roles.foreground;

  // Theme 1 caps every canvas colour at its own chroma limit; the engine's
  // border may carry a little more tint, so it is re-solved here at the
  // cap, keeping its 3:1 boundary against the background.
  const rawBorder = tripletToOklch(roles.border);
  const border =
    rawBorder.C <= MODERN_EDUCATION_NEUTRAL_CHROMA_CAP
      ? roles.border
      : (solveLightness(
          { ...rawBorder, C: MODERN_EDUCATION_NEUTRAL_CHROMA_CAP },
          (candidate) => contrastRatio(candidate, roles.background) >= 3
        ) ?? roles.border);

  const divider = oklchToTriplet({
    L: 0.91,
    C: Math.min(MODERN_EDUCATION_NEUTRAL_CHROMA_CAP, rawBorder.C),
    h: rawBorder.h,
  });

  return {
    roles,
    border,
    divider,
    ink,
    inkCta,
    inkCtaForeground,
    chipBackground,
    chipForeground,
    ctaHover,
    ctaPressed,
    ctaNeedsBorder,
  };
}

export function mapModernEducationBrandPalette(
  input: BrandMappingInput
): WebsiteBrandVariables {
  const t = resolveModernEducationTokens(input);
  const { roles } = t;
  return {
    // Canvas — near-neutral roles only.
    '--website-background': hsl(roles.background),
    '--website-foreground': hsl(roles.foreground),
    '--website-foreground-muted': hsl(roles.foregroundMuted),
    '--website-surface': hsl(roles.surface),
    '--website-surface-muted': hsl(roles.surfaceMuted),
    // `--website-border` is the hairline the base renderers and chrome use
    // for dividers and card edges; the 3:1 input edge has its own name.
    '--website-border': hsl(t.divider),
    '--website-input-border': hsl(t.border),

    // Brand slots.
    '--website-cta': hsl(roles.cta),
    '--website-cta-foreground': hsl(roles.ctaForeground),
    '--website-cta-hover': hsl(t.ctaHover),
    '--website-cta-pressed': hsl(t.ctaPressed),
    '--website-cta-border': t.ctaNeedsBorder
      ? hsl(roles.foreground)
      : 'transparent',
    '--website-link': hsl(roles.link),
    '--website-focus': hsl(roles.focus),
    '--website-highlight': hsl(roles.accent),
    '--website-shape': hsl(roles.primary, 0.16),
    '--website-shape-detail': hsl(roles.accent),
    '--website-chip-bg': hsl(t.chipBackground),
    '--website-chip-fg': hsl(t.chipForeground),
    '--website-icon-tile': hsl(roles.primary, 0.1),
    '--website-icon-fg': hsl(roles.link),

    // The ink band.
    '--website-ink': hsl(t.ink),
    '--website-ink-foreground': hsl('0 0% 100%'),
    '--website-ink-muted': hsl('0 0% 100%', 0.78),
    '--website-ink-glow': hsl(roles.primary, 0.45),
    '--website-ink-glow-detail': hsl(roles.accent, 0.3),
    '--website-ink-cta': hsl(t.inkCta),
    '--website-ink-cta-foreground': hsl(t.inkCtaForeground),

    // Feedback.
    '--website-success': hsl(roles.success),
    '--website-warning': hsl(roles.warning),
    '--website-error': hsl(roles.error),

    // Base variable names, for the base renderers Theme 1 still uses.
    // `--website-primary-solid` is used both as TEXT (eyebrows, icons) and
    // as a FILL under white text (the CTA band): `link` is ≥ 4.5:1 on the
    // canvas, so it is safe both ways — the raw brand colour is not.
    '--website-primary': roles.link,
    '--website-primary-solid': hsl(roles.link),
    '--website-primary-muted': hsl(roles.primary, 0.3),
    '--website-primary-surface': hsl(roles.primary, 0.08),
    '--website-secondary': roles.secondary,
    '--website-secondary-solid': hsl(roles.secondary),
    '--website-accent': roles.accent,
    '--website-accent-solid': hsl(roles.accent),

    // Dashboard-origin components inside the scope (§F.5).
    '--primary': roles.cta,
    '--primary-foreground': roles.ctaForeground,
    '--primary-hover': t.ctaHover,
    '--ring': roles.focus,
  };
}
