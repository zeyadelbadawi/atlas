/**
 * Theme 3 (Manara) brand mapping — Reports/THEME_3_MANARA_PLAN.md §3.9.
 *
 * Input: the Academy's semantic palette — the stored one when it exists
 * (validated by the backend), otherwise derived here from the legacy seeds
 * with the same engine. Output: CSS variables.
 *
 * Manara has two grounds and two blocks:
 *   - **night**: near-black tinted with the brand hue (the stage: hero,
 *     testimonials, CTA, footer, auth panel, system pages);
 *   - **day**: a cool off-white reading ground (courses, method, steps, FAQ);
 *   - **block**: the primary, moved in lightness until its white-ish label
 *     reads at 4.5:1 — header bar, track tiles, scoreboard, banner blocks;
 *   - **accent**: the accent, lettered in day or night ink (whichever reads),
 *     lightened if neither does — the Join button, the beam, the highlight.
 *
 * Unlike Theme 1 (brand as signal) and Atelier (paper), the brand here fills
 * whole surfaces, so every text colour is re-solved against the ground it is
 * painted on, as the browser paints it (8-bit channels), and proven over the
 * identity matrix in `manara.brand-mapping.test.ts`. Body text on the day
 * ground stays near-neutral ink: a logo never recolours paragraphs.
 */
import {
  deriveBrandPalette,
  deriveInteractionStates,
  formatHslTriplet,
  isHslTriplet,
  oklchToTriplet,
  parseHslTriplet,
  relativeLuminance,
  solveLightness,
  tripletToOklch,
  type BrandRoles,
  type HslTriplet,
} from '../brand-engine';
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from '../theme-packs/theme-pack.types';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';

/** The day ground's chroma cap: a reading surface, never brand-coloured. */
export const MANARA_DAY_CHROMA_CAP = 0.008;

/** Night: near-black, tinted with the brand hue. */
const NIGHT_LIGHTNESS = 0.17;
const NIGHT_RAISED_LIGHTNESS = 0.23;
const NIGHT_CHROMA = 0.03;
/** Day: a cool off-white (hue follows the brand, a hint of chroma). */
const DAY = { L: 0.985, C: 0.005 } as const;
const DAY_SOFT = { L: 0.955, C: 0.007 } as const;

/** Contrast as the browser paints the pair (each channel rounded to 8 bits). */
export function renderedContrast(a: HslTriplet, b: HslTriplet): number {
  const luminance = (triplet: HslTriplet) => {
    const { r, g, b: blue } = parseHslTriplet(triplet);
    const q = (channel: number) => Math.round(channel * 255) / 255;
    return relativeLuminance({ r: q(r), g: q(g), b: q(blue) });
  };
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const hsl = (triplet: HslTriplet, alpha?: number): string =>
  alpha === undefined ? `hsl(${triplet})` : `hsl(${triplet} / ${alpha})`;

/** `top` over `bottom` at `alpha`, as an opaque triplet. */
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

/**
 * The colour, moved in lightness only (hue and chroma kept), until it
 * clears `ratio` against every one of `grounds` as painted. Returns the
 * colour unchanged when it already passes.
 */
function ensureContrast(
  color: HslTriplet,
  grounds: readonly HslTriplet[],
  ratio: number,
  direction: 'darker' | 'lighter'
): HslTriplet {
  const passes = (candidate: HslTriplet) =>
    grounds.every((ground) => renderedContrast(candidate, ground) >= ratio);
  if (passes(color)) return color;
  return (
    solveLightness(tripletToOklch(color), passes, direction) ??
    (direction === 'darker' ? '0 0% 9%' : '0 0% 100%')
  );
}

/**
 * A fill that must carry `label` at 4.5:1: moved in lightness away from
 * the label (darker under a light label, lighter under a dark one) until
 * it does. Hue and chroma are kept, so the block stays the brand.
 */
function ensureFillFor(
  fill: HslTriplet,
  label: HslTriplet,
  ratio = 4.5
): HslTriplet {
  const passes = (candidate: HslTriplet) =>
    renderedContrast(candidate, label) >= ratio;
  if (passes(fill)) return fill;
  const labelIsLight = relativeLuminance(parseHslTriplet(label)) > 0.4;
  return (
    solveLightness(
      tripletToOklch(fill),
      passes,
      labelIsLight ? 'darker' : 'lighter'
    ) ?? (labelIsLight ? '0 0% 9%' : '0 0% 100%')
  );
}

const derivedCache = new Map<string, BrandRoles>();

function rolesFor(input: BrandMappingInput): BrandRoles {
  if (isUsablePalette(input.palette)) return input.palette.roles;
  const tokens = input.theme.tokens;
  const seed = (value: string, fallback: HslTriplet): HslTriplet =>
    isHslTriplet(value) ? value : fallback;
  const primary = seed(input.seeds.primary, tokens.defaultPrimary);
  const secondary = seed(input.seeds.secondary, tokens.defaultSecondary);
  const accent = seed(input.seeds.accent, tokens.defaultAccent);
  const key = `${primary}|${secondary}|${accent}`;
  let cached = derivedCache.get(key);
  if (!cached) {
    cached = deriveBrandPalette(
      { primary, secondary, accent },
      { neutralChromaCap: MANARA_DAY_CHROMA_CAP }
    ).roles;
    if (derivedCache.size > 64) derivedCache.clear();
    derivedCache.set(key, cached);
  }
  return cached;
}

/** Every resolved Manara colour — exported so tests can check each pair. */
export interface ManaraBrandTokens {
  readonly roles: BrandRoles;
  /* Day ground. */
  readonly day: HslTriplet;
  readonly daySoft: HslTriplet;
  readonly text: HslTriplet;
  readonly textMuted: HslTriplet;
  /** The brand as text (links, eyebrows) on day. */
  readonly brandText: HslTriplet;
  /** A hairline on day: decorative, never a control's sole boundary. */
  readonly line: HslTriplet;
  /** 3:1 against day: an input's only edge. */
  readonly inputBorder: HslTriplet;
  readonly focus: HslTriplet;
  readonly pill: HslTriplet;
  readonly pillText: HslTriplet;
  /* Night ground. */
  readonly night: HslTriplet;
  readonly nightRaised: HslTriplet;
  readonly nightText: HslTriplet;
  readonly nightTextMuted: HslTriplet;
  /** The brand as text on night. */
  readonly nightBrand: HslTriplet;
  /** The accent as text on night (the hero's highlighted phrase). */
  readonly nightAccentText: HslTriplet;
  readonly nightLine: HslTriplet;
  readonly nightFocus: HslTriplet;
  readonly nightPill: HslTriplet;
  readonly nightPillText: HslTriplet;
  /* Blocks. */
  /** The primary as a surface, carrying `blockText`. */
  readonly block: HslTriplet;
  readonly blockText: HslTriplet;
  readonly blockTextMuted: HslTriplet;
  readonly blockHover: HslTriplet;
  /** The accent as a surface (Join, the beam), carrying `accentText`. */
  readonly accent: HslTriplet;
  readonly accentText: HslTriplet;
  readonly accentHover: HslTriplet;
  readonly accentPressed: HslTriplet;
  /** The accent as a graphic (the beam) on night and day: ≥ 3:1 on both. */
  readonly beam: HslTriplet;
  /** Feedback colours, readable as text on day. */
  readonly success: HslTriplet;
  readonly warning: HslTriplet;
  readonly error: HslTriplet;
}

export function resolveManaraTokens(
  input: BrandMappingInput
): ManaraBrandTokens {
  const roles = rolesFor(input);
  const brandHue = tripletToOklch(roles.primary).h;

  // Grounds.
  const day = oklchToTriplet({ ...DAY, h: brandHue });
  const daySoft = oklchToTriplet({ ...DAY_SOFT, h: brandHue });
  const days = [day, daySoft] as const;
  const night = oklchToTriplet({
    L: NIGHT_LIGHTNESS,
    C: NIGHT_CHROMA,
    h: brandHue,
  });
  const nightRaised = oklchToTriplet({
    L: NIGHT_RAISED_LIGHTNESS,
    C: NIGHT_CHROMA,
    h: brandHue,
  });
  const nights = [night, nightRaised] as const;

  // Day text: the palette's foreground, kept at AAA on both days.
  const text = ensureContrast(roles.foreground, days, 7, 'darker');
  const textMuted = ensureContrast(roles.foregroundMuted, days, 4.5, 'darker');
  const brandText = ensureContrast(roles.link, days, 4.5, 'darker');
  const line = composite(text, day, 0.12);
  const inputBorder = ensureContrast(roles.border, days, 3, 'darker');
  const focus = ensureContrast(roles.focus, days, 3, 'darker');
  const pill = composite(roles.primary, day, 0.1);
  const pillText = renderedContrast(brandText, pill) >= 4.5 ? brandText : text;

  // Night text.
  const nightText = ensureContrast(day, nights, 7, 'lighter');
  const nightTextMuted = ensureContrast(
    composite(day, night, 0.72),
    nights,
    4.5,
    'lighter'
  );
  const nightBrand = ensureContrast(roles.primary, nights, 4.5, 'lighter');
  const nightAccentText = ensureContrast(roles.accent, nights, 4.5, 'lighter');
  const nightLine = composite(day, night, 0.16);
  const nightFocus = ensureContrast(roles.accent, nights, 3, 'lighter');
  const nightPill = composite(day, night, 0.12);
  const nightPillText = nightText;

  // The primary block carries day-coloured text: darken the block until it
  // does (a pastel or white brand becomes a deep block, still in its hue).
  const block = ensureFillFor(roles.primary, day);
  const blockText = day;
  const blockTextMuted = ensureContrast(
    composite(day, block, 0.78),
    [block],
    4.5,
    'lighter'
  );
  const blockHover = oklchToTriplet({
    ...tripletToOklch(block),
    L: Math.max(0.1, tripletToOklch(block).L - 0.05),
  });

  // The accent block: lettered in night if that reads, else in day, else
  // the accent is lightened until night ink reads on it.
  let accent = roles.accent;
  let accentText: HslTriplet;
  if (renderedContrast(night, accent) >= 4.5) {
    accentText = night;
  } else if (renderedContrast(day, accent) >= 4.5) {
    accentText = day;
  } else {
    accent = ensureFillFor(accent, night);
    accentText = night;
  }
  const { ctaHover: accentHover, ctaPressed: accentPressed } =
    deriveInteractionStates(accent, accentText);
  // The beam is a graphic on both grounds; it keeps the accent's hue.
  const beam = ensureContrast(accent, [night], 3, 'lighter');

  const success = ensureContrast(roles.success, days, 4.5, 'darker');
  const warning = ensureContrast(roles.warning, days, 4.5, 'darker');
  const error = ensureContrast(roles.error, days, 4.5, 'darker');

  return {
    roles,
    day,
    daySoft,
    text,
    textMuted,
    brandText,
    line,
    inputBorder,
    focus,
    pill,
    pillText,
    night,
    nightRaised,
    nightText,
    nightTextMuted,
    nightBrand,
    nightAccentText,
    nightLine,
    nightFocus,
    nightPill,
    nightPillText,
    block,
    blockText,
    blockTextMuted,
    blockHover,
    accent,
    accentText,
    accentHover,
    accentPressed,
    beam,
    success,
    warning,
    error,
  };
}

export function mapManaraBrandPalette(
  input: BrandMappingInput
): WebsiteBrandVariables {
  const t = resolveManaraTokens(input);
  const { roles } = t;
  return {
    // Day canvas (the scope's default ground).
    '--website-background': hsl(t.day),
    '--website-foreground': hsl(t.text),
    '--website-foreground-muted': hsl(t.textMuted),
    '--website-surface': hsl(t.daySoft),
    '--website-surface-muted': hsl(t.daySoft),
    '--website-border': hsl(t.line),
    '--website-input-border': hsl(t.inputBorder),

    // Brand slots: the primary action is the accent block.
    '--website-cta': hsl(t.accent),
    '--website-cta-foreground': hsl(t.accentText),
    '--website-cta-hover': hsl(t.accentHover),
    '--website-cta-pressed': hsl(t.accentPressed),
    '--website-cta-border': 'transparent',
    '--website-link': hsl(t.brandText),
    '--website-focus': hsl(t.focus),
    '--website-highlight': hsl(t.beam),
    '--website-chip-bg': hsl(t.pill),
    '--website-chip-fg': hsl(t.pillText),
    '--website-icon-tile': hsl(t.block),
    '--website-icon-fg': hsl(t.blockText),

    // Manara's own names.
    '--mn-day': hsl(t.day),
    '--mn-day-soft': hsl(t.daySoft),
    '--mn-text': hsl(t.text),
    '--mn-text-muted': hsl(t.textMuted),
    '--mn-brand-text': hsl(t.brandText),
    '--mn-line': hsl(t.line),
    '--mn-input-border': hsl(t.inputBorder),
    '--mn-focus': hsl(t.focus),
    '--mn-pill': hsl(t.pill),
    '--mn-pill-text': hsl(t.pillText),
    '--mn-night': hsl(t.night),
    '--mn-night-raised': hsl(t.nightRaised),
    '--mn-night-text': hsl(t.nightText),
    '--mn-night-text-muted': hsl(t.nightTextMuted),
    '--mn-night-brand': hsl(t.nightBrand),
    '--mn-night-accent-text': hsl(t.nightAccentText),
    '--mn-night-line': hsl(t.nightLine),
    '--mn-night-focus': hsl(t.nightFocus),
    '--mn-night-pill': hsl(t.nightPill),
    '--mn-night-pill-text': hsl(t.nightPillText),
    '--mn-block': hsl(t.block),
    '--mn-block-text': hsl(t.blockText),
    '--mn-block-text-muted': hsl(t.blockTextMuted),
    '--mn-block-hover': hsl(t.blockHover),
    '--mn-accent': hsl(t.accent),
    '--mn-accent-text': hsl(t.accentText),
    '--mn-accent-hover': hsl(t.accentHover),
    '--mn-accent-pressed': hsl(t.accentPressed),
    '--mn-beam': hsl(t.beam),
    '--mn-beam-soft': hsl(t.beam, 0.22),

    // Feedback.
    '--website-success': hsl(t.success),
    '--website-warning': hsl(t.warning),
    '--website-error': hsl(t.error),

    // Base variable names (base renderers, shared templates inside the scope).
    '--website-primary': t.brandText,
    '--website-primary-solid': hsl(t.brandText),
    '--website-primary-muted': hsl(roles.primary, 0.3),
    '--website-primary-surface': hsl(roles.primary, 0.08),
    '--website-secondary': roles.secondary,
    '--website-secondary-solid': hsl(roles.secondary),
    '--website-accent': roles.accent,
    '--website-accent-solid': hsl(t.accent),

    // Dashboard-origin components inside the scope, and the learner portal.
    '--primary': t.block,
    '--primary-foreground': t.blockText,
    '--primary-hover': t.blockHover,
    '--ring': t.focus,
    '--background': t.day,
    '--foreground': t.text,
    '--card': t.day,
    '--card-foreground': t.text,
    '--popover': t.day,
    '--popover-foreground': t.text,
    '--muted': t.daySoft,
    '--muted-foreground': t.textMuted,
    '--secondary': t.daySoft,
    '--secondary-foreground': t.text,
    '--accent': t.daySoft,
    '--accent-foreground': t.text,
    '--border': t.line,
    '--input': t.inputBorder,
    '--border-strong': t.inputBorder,
    '--success': t.success,
    '--warning': t.warning,
    '--destructive': t.error,
    '--destructive-foreground': '0 0% 100%',
  };
}
