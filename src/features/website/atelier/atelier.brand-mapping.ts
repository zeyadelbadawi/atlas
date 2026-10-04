/**
 * Theme 2 (Atelier) brand mapping — Reports/THEME_2_ATELIER_PLAN.md §2.
 *
 * Input: the Academy's semantic palette — the stored one when it exists
 * (validated by the backend), otherwise derived here from the legacy seeds
 * with the same engine. Output: CSS variables.
 *
 * Atelier's canvas is "paper": a warm, near-neutral off-white that does not
 * take the brand's hue, so every Academy reads as ink on the same quality
 * stock. Its second environment is "ink": near-black, faintly tinted with
 * the brand hue. The brand appears only in defined slots — the thread,
 * chapter numerals, links, focus, the CTA fill and one accent rule.
 *
 * Because the paper is Atelier's own (not the engine's background), every
 * text colour is re-solved against the surfaces it is actually painted on:
 * paper, the deeper paper band, and ink. Every pair is checked as the
 * browser paints it (8-bit channels), so a pair can never measure above
 * the threshold here and below it in axe.
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

/** Atelier's canvas chroma cap: paper is warm, never brand-coloured. */
export const ATELIER_NEUTRAL_CHROMA_CAP = 0.012;

/** Paper: a warm off-white (hue ~ 80° in OKLCH, a hint of chroma). */
const PAPER = { L: 0.972, C: 0.011, h: 82 } as const;
/** The deeper paper band (alternate chapters, inputs on paper). */
const PAPER_DEEP = { L: 0.945, C: 0.013, h: 80 } as const;
/** A hairline: decorative only — never a control's sole boundary. */
const HAIRLINE = { L: 0.86, C: 0.012, h: 78 } as const;
/** Ink: near-black, faintly tinted with the brand hue. */
const INK_LIGHTNESS = 0.19;
const INK_CHROMA = 0.022;

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
    // A hue that cannot reach the ratio at any lightness (never with these
    // grounds, but kept total): fall back to near-black / near-white.
    (direction === 'darker' ? '0 0% 9%' : '0 0% 100%')
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
      { neutralChromaCap: ATELIER_NEUTRAL_CHROMA_CAP }
    ).roles;
    if (derivedCache.size > 64) derivedCache.clear();
    derivedCache.set(key, cached);
  }
  return cached;
}

/** Every resolved Atelier colour — exported so tests can check each pair. */
export interface AtelierBrandTokens {
  readonly roles: BrandRoles;
  readonly paper: HslTriplet;
  readonly paperDeep: HslTriplet;
  readonly hairline: HslTriplet;
  /** 3:1 against paper and paper-deep: an input's only edge. */
  readonly inputBorder: HslTriplet;
  readonly text: HslTriplet;
  readonly textMuted: HslTriplet;
  /** The brand as text (links, chapter numerals, eyebrows) on paper. */
  readonly brandText: HslTriplet;
  /** The CTA fill and its label. */
  readonly cta: HslTriplet;
  readonly ctaForeground: HslTriplet;
  readonly ctaHover: HslTriplet;
  readonly ctaPressed: HslTriplet;
  readonly focus: HslTriplet;
  /** The decorative accent rule (≥ 3:1 on paper as a graphic). */
  readonly accentRule: HslTriplet;
  readonly ink: HslTriplet;
  readonly inkRaised: HslTriplet;
  readonly inkText: HslTriplet;
  readonly inkTextMuted: HslTriplet;
  /** The brand as text and thread on ink. */
  readonly inkBrand: HslTriplet;
  readonly inkCta: HslTriplet;
  readonly inkCtaForeground: HslTriplet;
  readonly inkHairline: HslTriplet;
  readonly chipBackground: HslTriplet;
  readonly chipForeground: HslTriplet;
  /** Feedback colours, readable as text on both papers. */
  readonly success: HslTriplet;
  readonly warning: HslTriplet;
  readonly error: HslTriplet;
}

export function resolveAtelierTokens(
  input: BrandMappingInput
): AtelierBrandTokens {
  const roles = rolesFor(input);
  const paper = oklchToTriplet(PAPER);
  const paperDeep = oklchToTriplet(PAPER_DEEP);
  const hairline = oklchToTriplet(HAIRLINE);
  const papers = [paper, paperDeep] as const;

  // Body text: the palette's foreground, kept at AAA on both papers.
  const text = ensureContrast(roles.foreground, papers, 7, 'darker');
  const textMuted = ensureContrast(roles.foregroundMuted, papers, 4.5, 'darker');
  // The brand as text: the palette's link colour (already the brand at a
  // readable lightness), re-solved for Atelier's papers.
  const brandText = ensureContrast(roles.link, papers, 4.5, 'darker');
  const inputBorder = ensureContrast(roles.border, papers, 3, 'darker');

  // CTA: the palette's fill and label (already a 4.5:1 pair). The fill also
  // needs 3:1 against paper so the button reads without a border.
  const ctaFill = ensureContrast(roles.cta, papers, 3, 'darker');
  const ctaForeground =
    renderedContrast(roles.ctaForeground, ctaFill) >= 4.5
      ? roles.ctaForeground
      : renderedContrast('0 0% 100%', ctaFill) >= 4.5
        ? '0 0% 100%'
        : text;
  const { ctaHover, ctaPressed } = deriveInteractionStates(
    ctaFill,
    ctaForeground
  );

  const focus = ensureContrast(roles.focus, papers, 3, 'darker');
  const accentRule = ensureContrast(roles.accent, papers, 3, 'darker');

  // Ink environment.
  const brandHue = tripletToOklch(roles.primary).h;
  const ink = oklchToTriplet({ L: INK_LIGHTNESS, C: INK_CHROMA, h: brandHue });
  const inkRaised = oklchToTriplet({
    L: INK_LIGHTNESS + 0.06,
    C: INK_CHROMA,
    h: brandHue,
  });
  const inks = [ink, inkRaised] as const;
  const inkText = ensureContrast(paper, inks, 7, 'lighter');
  const inkTextMuted = ensureContrast(
    composite(paper, ink, 0.74),
    inks,
    4.5,
    'lighter'
  );
  const inkBrand = ensureContrast(roles.primary, inks, 4.5, 'lighter');
  // On ink the CTA inverts to a paper button with ink lettering.
  const inkCta = paper;
  const inkCtaForeground = ensureContrast(ink, [paper], 4.5, 'darker');
  const inkHairline = composite(paper, ink, 0.16);

  // Chips: brand at 9 % over paper, lettered in the brand text colour (or
  // body text if the tint pulls it under 4.5:1).
  const chipBackground = composite(roles.primary, paper, 0.09);
  const chipForeground =
    renderedContrast(brandText, chipBackground) >= 4.5 ? brandText : text;

  const success = ensureContrast(roles.success, papers, 4.5, 'darker');
  const warning = ensureContrast(roles.warning, papers, 4.5, 'darker');
  const error = ensureContrast(roles.error, papers, 4.5, 'darker');

  return {
    roles,
    paper,
    paperDeep,
    hairline,
    inputBorder,
    text,
    textMuted,
    brandText,
    cta: ctaFill,
    ctaForeground,
    ctaHover,
    ctaPressed,
    focus,
    accentRule,
    ink,
    inkRaised,
    inkText,
    inkTextMuted,
    inkBrand,
    inkCta,
    inkCtaForeground,
    inkHairline,
    chipBackground,
    chipForeground,
    success,
    warning,
    error,
  };
}

export function mapAtelierBrandPalette(
  input: BrandMappingInput
): WebsiteBrandVariables {
  const t = resolveAtelierTokens(input);
  const { roles } = t;
  return {
    // Paper canvas.
    '--website-background': hsl(t.paper),
    '--website-foreground': hsl(t.text),
    '--website-foreground-muted': hsl(t.textMuted),
    '--website-surface': hsl(t.paperDeep),
    '--website-surface-muted': hsl(t.paperDeep),
    '--website-border': hsl(t.hairline),
    '--website-input-border': hsl(t.inputBorder),

    // Brand slots.
    '--website-cta': hsl(t.cta),
    '--website-cta-foreground': hsl(t.ctaForeground),
    '--website-cta-hover': hsl(t.ctaHover),
    '--website-cta-pressed': hsl(t.ctaPressed),
    '--website-cta-border': 'transparent',
    '--website-link': hsl(t.brandText),
    '--website-focus': hsl(t.focus),
    '--website-highlight': hsl(t.accentRule),
    '--website-chip-bg': hsl(t.chipBackground),
    '--website-chip-fg': hsl(t.chipForeground),
    '--website-icon-tile': hsl(roles.primary, 0.1),
    '--website-icon-fg': hsl(t.brandText),

    // Atelier's own names.
    '--atelier-paper': hsl(t.paper),
    '--atelier-paper-deep': hsl(t.paperDeep),
    '--atelier-hairline': hsl(t.hairline),
    '--atelier-text': hsl(t.text),
    '--atelier-text-muted': hsl(t.textMuted),
    '--atelier-brand': hsl(t.brandText),
    '--atelier-brand-soft': hsl(roles.primary, 0.12),
    '--atelier-thread': hsl(t.brandText),
    '--atelier-accent': hsl(t.accentRule),
    '--atelier-ink': hsl(t.ink),
    '--atelier-ink-raised': hsl(t.inkRaised),
    '--atelier-ink-text': hsl(t.inkText),
    '--atelier-ink-text-muted': hsl(t.inkTextMuted),
    '--atelier-ink-brand': hsl(t.inkBrand),
    '--atelier-ink-thread': hsl(t.inkBrand),
    '--atelier-ink-hairline': hsl(t.inkHairline),
    '--atelier-ink-cta': hsl(t.inkCta),
    '--atelier-ink-cta-foreground': hsl(t.inkCtaForeground),

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
    '--website-accent-solid': hsl(roles.accent),

    // Dashboard-origin components inside the scope, and the learner portal.
    '--primary': t.cta,
    '--primary-foreground': t.ctaForeground,
    '--primary-hover': t.ctaHover,
    '--ring': t.focus,
    '--background': t.paper,
    '--foreground': t.text,
    '--card': t.paper,
    '--card-foreground': t.text,
    '--popover': t.paper,
    '--popover-foreground': t.text,
    '--muted': t.paperDeep,
    '--muted-foreground': t.textMuted,
    '--secondary': t.paperDeep,
    '--secondary-foreground': t.text,
    '--accent': t.paperDeep,
    '--accent-foreground': t.text,
    '--border': t.hairline,
    '--input': t.inputBorder,
    '--border-strong': t.inputBorder,
    '--success': t.success,
    '--warning': t.warning,
    '--destructive': t.error,
    '--destructive-foreground': '0 0% 100%',
  };
}
