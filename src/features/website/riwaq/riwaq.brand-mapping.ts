/**
 * Theme 4 (Riwaq) brand mapping — Reports/THEME_4_RIWAQ_PLAN.md §3.
 *
 * Input: the Academy's semantic palette — the stored one when it exists
 * (validated by the backend), otherwise derived here from the legacy seeds
 * with the same engine. Output: CSS variables.
 *
 * Riwaq prints the Academy in its brand as INK on a cool porcelain page:
 *   - **porcelain / stone**: the reading grounds, near-neutral (a trace of
 *     the brand hue, never its colour);
 *   - **brandInk**: the primary, darkened until it reads at 7:1 on both
 *     grounds — display headings, figures, links and the primary action's
 *     fill (whose porcelain label therefore reads at 7:1 too);
 *   - **marker**: the accent, solved as a 3:1 graphic — the one underlined
 *     phrase, the active row, the registration ticks;
 *   - **deep**: the primary at low lightness with its chroma capped, the
 *     one dark ground (evidence, the closing invitation, the footer), with
 *     its own text, marker and action;
 *   - **tint**: the brand hue at low chroma, laid over every photograph
 *     (`mix-blend-mode: color`) so the pictures read as a monochrome in the
 *     Academy's colour until they "develop" on hover.
 *
 * Every pair is re-solved against the ground it is painted on, as painted
 * (`painted-contrast.ts`), and proven over the identity matrix in
 * `riwaq.brand-mapping.test.ts`. Body text stays neutral ink.
 */
import {
  deriveBrandPalette,
  isHslTriplet,
  oklchToTriplet,
  tripletToOklch,
  type BrandRoles,
  type HslTriplet,
} from '../brand-engine';
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from '../theme-packs/theme-pack.types';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';
import {
  composite,
  ensureContrast,
  ensureFillFor,
  hsl,
  renderedContrast,
} from '../theme-packs/painted-contrast';

export { renderedContrast };

/** The reading grounds' chroma cap: porcelain, never brand-coloured. */
export const RIWAQ_GROUND_CHROMA_CAP = 0.006;
/** The deep ground keeps the brand's hue, its chroma capped (no neon walls). */
export const RIWAQ_DEEP_CHROMA_CAP = 0.12;
/** The photograph tint: the brand hue, quiet enough to stay photographic. */
export const RIWAQ_TINT_CHROMA_CAP = 0.09;

const PORCELAIN = { L: 0.985, C: 0.004 } as const;
const STONE = { L: 0.955, C: 0.006 } as const;
const DEEP_LIGHTNESS = 0.27;
const DEEP_RAISED_LIGHTNESS = 0.32;
const TINT_LIGHTNESS = 0.5;

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
      { neutralChromaCap: RIWAQ_GROUND_CHROMA_CAP }
    ).roles;
    if (derivedCache.size > 64) derivedCache.clear();
    derivedCache.set(key, cached);
  }
  return cached;
}

/** A shade of `color` moved `delta` in OKLCH lightness (hue, chroma kept). */
function shade(color: HslTriplet, delta: number): HslTriplet {
  const o = tripletToOklch(color);
  return oklchToTriplet({ ...o, L: Math.min(1, Math.max(0, o.L + delta)) });
}

/** Every resolved Riwaq colour — exported so tests can check each pair. */
export interface RiwaqBrandTokens {
  readonly roles: BrandRoles;
  /* Reading grounds. */
  readonly porcelain: HslTriplet;
  readonly stone: HslTriplet;
  readonly ink: HslTriplet;
  readonly inkMuted: HslTriplet;
  /** The brand as ink: headings, figures, links (7:1 on both grounds). */
  readonly brandInk: HslTriplet;
  /** Column and cell lines: decorative, never a control's only edge. */
  readonly rule: HslTriplet;
  /** 3:1 on both grounds: an input's or a secondary button's edge. */
  readonly ruleStrong: HslTriplet;
  readonly focus: HslTriplet;
  /** The accent as a 3:1 graphic on both grounds. */
  readonly marker: HslTriplet;
  /** The accent as a surface, carrying `markerFillText` at 4.5:1. */
  readonly markerFill: HslTriplet;
  readonly markerFillText: HslTriplet;
  readonly chip: HslTriplet;
  readonly chipText: HslTriplet;
  /* The primary action on the reading grounds. */
  readonly action: HslTriplet;
  readonly actionText: HslTriplet;
  readonly actionHover: HslTriplet;
  readonly actionPressed: HslTriplet;
  /* Deep ground. */
  readonly deep: HslTriplet;
  readonly deepRaised: HslTriplet;
  readonly deepText: HslTriplet;
  readonly deepMuted: HslTriplet;
  readonly deepRule: HslTriplet;
  /** The accent as a 3:1 graphic on deep (also the focus ring there). */
  readonly deepMarker: HslTriplet;
  /** The accent as text on deep (an emphasised figure or phrase). */
  readonly deepMarkerText: HslTriplet;
  readonly deepAction: HslTriplet;
  readonly deepActionText: HslTriplet;
  readonly deepActionHover: HslTriplet;
  /* Photography. */
  readonly tint: HslTriplet;
  /* Feedback, readable as text on the reading grounds. */
  readonly success: HslTriplet;
  readonly warning: HslTriplet;
  readonly error: HslTriplet;
}

export function resolveRiwaqTokens(input: BrandMappingInput): RiwaqBrandTokens {
  const roles = rolesFor(input);
  const brand = tripletToOklch(roles.primary);

  const porcelain = oklchToTriplet({ ...PORCELAIN, h: brand.h });
  const stone = oklchToTriplet({ ...STONE, h: brand.h });
  const grounds = [porcelain, stone] as const;

  const ink = ensureContrast(roles.foreground, grounds, 12, 'darker');
  const inkMuted = ensureContrast(roles.foregroundMuted, grounds, 5, 'darker');
  const brandInk = ensureContrast(roles.primary, grounds, 7, 'darker');
  const rule = composite(ink, porcelain, 0.12);
  const ruleStrong = ensureContrast(roles.border, grounds, 3, 'darker');
  const focus = ensureContrast(roles.focus, grounds, 3, 'darker');
  const marker = ensureContrast(roles.accent, grounds, 3, 'darker');

  // The accent as a surface: lettered in ink if that reads, else in
  // porcelain, else the accent is lightened until ink reads on it.
  let markerFill = roles.accent;
  let markerFillText: HslTriplet;
  if (renderedContrast(ink, markerFill) >= 4.5) {
    markerFillText = ink;
  } else if (renderedContrast(porcelain, markerFill) >= 4.5) {
    markerFillText = porcelain;
  } else {
    markerFill = ensureFillFor(markerFill, ink);
    markerFillText = ink;
  }

  const chip = composite(roles.primary, porcelain, 0.08);
  const chipText = renderedContrast(brandInk, chip) >= 4.5 ? brandInk : ink;

  // The primary action is printed in brand ink, lettered in porcelain;
  // its states move further from the label, so they only gain contrast.
  const action = brandInk;
  const actionText = porcelain;
  const actionHover = shade(action, -0.05);
  const actionPressed = shade(action, -0.09);

  const deepChroma = Math.min(brand.C, RIWAQ_DEEP_CHROMA_CAP);
  const deep = oklchToTriplet({ L: DEEP_LIGHTNESS, C: deepChroma, h: brand.h });
  const deepRaised = oklchToTriplet({
    L: DEEP_RAISED_LIGHTNESS,
    C: deepChroma,
    h: brand.h,
  });
  const deeps = [deep, deepRaised] as const;
  const deepText = ensureContrast(porcelain, deeps, 7, 'lighter');
  const deepMuted = ensureContrast(
    composite(porcelain, deep, 0.74),
    deeps,
    4.5,
    'lighter'
  );
  const deepRule = composite(porcelain, deep, 0.16);
  const deepMarker = ensureContrast(roles.accent, deeps, 3, 'lighter');
  const deepMarkerText = ensureContrast(roles.accent, deeps, 4.5, 'lighter');
  const deepAction = porcelain;
  const deepActionText = ensureContrast(deep, [porcelain, stone], 4.5, 'darker');
  const deepActionHover = stone;

  const tint = oklchToTriplet({
    L: TINT_LIGHTNESS,
    C: Math.min(brand.C, RIWAQ_TINT_CHROMA_CAP),
    h: brand.h,
  });

  const success = ensureContrast(roles.success, grounds, 4.5, 'darker');
  const warning = ensureContrast(roles.warning, grounds, 4.5, 'darker');
  const error = ensureContrast(roles.error, grounds, 4.5, 'darker');

  return {
    roles,
    porcelain,
    stone,
    ink,
    inkMuted,
    brandInk,
    rule,
    ruleStrong,
    focus,
    marker,
    markerFill,
    markerFillText,
    chip,
    chipText,
    action,
    actionText,
    actionHover,
    actionPressed,
    deep,
    deepRaised,
    deepText,
    deepMuted,
    deepRule,
    deepMarker,
    deepMarkerText,
    deepAction,
    deepActionText,
    deepActionHover,
    tint,
    success,
    warning,
    error,
  };
}

export function mapRiwaqBrandPalette(
  input: BrandMappingInput
): WebsiteBrandVariables {
  const t = resolveRiwaqTokens(input);
  const { roles } = t;
  return {
    // Reading canvas (the scope's default ground).
    '--website-background': hsl(t.porcelain),
    '--website-foreground': hsl(t.ink),
    '--website-foreground-muted': hsl(t.inkMuted),
    '--website-surface': hsl(t.stone),
    '--website-surface-muted': hsl(t.stone),
    '--website-border': hsl(t.rule),
    '--website-input-border': hsl(t.ruleStrong),

    // Brand slots: the primary action is printed in brand ink.
    '--website-cta': hsl(t.action),
    '--website-cta-foreground': hsl(t.actionText),
    '--website-cta-hover': hsl(t.actionHover),
    '--website-cta-pressed': hsl(t.actionPressed),
    '--website-cta-border': 'transparent',
    '--website-link': hsl(t.brandInk),
    '--website-focus': hsl(t.focus),
    '--website-highlight': hsl(t.marker),
    '--website-chip-bg': hsl(t.chip),
    '--website-chip-fg': hsl(t.chipText),
    '--website-icon-tile': hsl(t.chip),
    '--website-icon-fg': hsl(t.chipText),

    // Riwaq's own names.
    '--rw-porcelain': hsl(t.porcelain),
    '--rw-stone': hsl(t.stone),
    '--rw-ink': hsl(t.ink),
    '--rw-ink-muted': hsl(t.inkMuted),
    '--rw-brand-ink': hsl(t.brandInk),
    '--rw-rule': hsl(t.rule),
    '--rw-rule-strong': hsl(t.ruleStrong),
    '--rw-focus': hsl(t.focus),
    '--rw-marker': hsl(t.marker),
    '--rw-marker-soft': hsl(t.marker, 0.18),
    '--rw-marker-fill': hsl(t.markerFill),
    '--rw-marker-fill-text': hsl(t.markerFillText),
    '--rw-chip': hsl(t.chip),
    '--rw-chip-text': hsl(t.chipText),
    '--rw-action': hsl(t.action),
    '--rw-action-text': hsl(t.actionText),
    '--rw-action-hover': hsl(t.actionHover),
    '--rw-action-pressed': hsl(t.actionPressed),
    '--rw-deep': hsl(t.deep),
    '--rw-deep-raised': hsl(t.deepRaised),
    '--rw-deep-text': hsl(t.deepText),
    '--rw-deep-muted': hsl(t.deepMuted),
    '--rw-deep-rule': hsl(t.deepRule),
    '--rw-deep-marker': hsl(t.deepMarker),
    '--rw-deep-marker-text': hsl(t.deepMarkerText),
    '--rw-deep-action': hsl(t.deepAction),
    '--rw-deep-action-text': hsl(t.deepActionText),
    '--rw-deep-action-hover': hsl(t.deepActionHover),
    '--rw-tint': hsl(t.tint),

    // Feedback.
    '--website-success': hsl(t.success),
    '--website-warning': hsl(t.warning),
    '--website-error': hsl(t.error),

    // Base variable names (base renderers, shared templates inside the scope).
    '--website-primary': t.brandInk,
    '--website-primary-solid': hsl(t.brandInk),
    '--website-primary-muted': hsl(roles.primary, 0.3),
    '--website-primary-surface': hsl(t.chip),
    '--website-secondary': roles.secondary,
    '--website-secondary-solid': hsl(roles.secondary),
    '--website-accent': roles.accent,
    '--website-accent-solid': hsl(t.marker),

    // Dashboard-origin components inside the scope, and the learner portal.
    '--primary': t.action,
    '--primary-foreground': t.actionText,
    '--primary-hover': t.actionHover,
    '--ring': t.focus,
    '--background': t.porcelain,
    '--foreground': t.ink,
    '--card': t.porcelain,
    '--card-foreground': t.ink,
    '--popover': t.porcelain,
    '--popover-foreground': t.ink,
    '--muted': t.stone,
    '--muted-foreground': t.inkMuted,
    '--secondary': t.stone,
    '--secondary-foreground': t.ink,
    '--accent': t.stone,
    '--accent-foreground': t.ink,
    '--border': t.rule,
    '--input': t.ruleStrong,
    '--border-strong': t.ruleStrong,
    '--success': t.success,
    '--warning': t.warning,
    '--destructive': t.error,
    '--destructive-foreground': '0 0% 100%',
  };
}
