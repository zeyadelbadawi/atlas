/**
 * The colours a site-wide overlay (the cookie consent banner and its
 * preferences dialog) wears on an Academy's public website.
 *
 * Two pure, per-call functions — no module state, no `document` — so the
 * server renderer, which serves many Academies from one process, computes
 * them from the request's own data exactly as the browser does.
 *
 * `mapWebsiteBrandVariables` is the variable set `WebsiteThemeScope` emits
 * for a theme and brand (same seed resolution, same pack mapping), so the
 * overlay and the page can never disagree about the Academy's palette.
 *
 * `resolveContrastSafePrimary` then guarantees the four generic tokens a
 * dashboard-origin `Button` reads are legible, whatever was stored:
 *  - Theme 1's mapping is already contrast-checked (`roles.cta` with
 *    `roles.ctaForeground` ≥ 4.5:1, `roles.focus` ≥ 3:1), so its values
 *    pass through unchanged.
 *  - The base mapping (retired Themes 2–5) copies the raw seed onto
 *    `--primary` with a fixed white label. A light brand (yellow, mint)
 *    makes that label unreadable, and a legacy non-triplet value makes
 *    `hsl(var(--primary))` invalid — a transparent button. Here the seed
 *    is validated (else the theme's default, else near-black) and the
 *    label is chosen to reach 4.5:1 (white, else near-black, else black).
 */
import type { WebsiteBrandConfig, WebsiteThemeDefinition } from '@types';
import { contrastRatio, isHslTriplet } from '../brand-engine';
import { getThemePack } from '../theme-packs/theme-pack.registry';
import type {
  BrandMappingInput,
  WebsiteBrandVariables,
} from '../theme-packs/theme-pack.types';

export type WebsiteOverlayBrand = Pick<
  WebsiteBrandConfig,
  'primaryColor' | 'secondaryColor' | 'accentColor' | 'palette'
>;

/** The scope's static canvas and text (`.website-theme-scope`, `index.css`). */
export const SCOPE_BACKGROUND = '0 0% 100%';
export const NEAR_BLACK = '222 22% 12%';
const WHITE = '0 0% 100%';
const BLACK = '0 0% 0%';

/** WCAG 2.x 1.4.3 (text) and 1.4.11 (focus indicator). */
const TEXT_CONTRAST = 4.5;
const NON_TEXT_CONTRAST = 3;

/**
 * Exactly what `WebsiteThemeScope` maps for this theme and brand. The
 * mapping is the theme pack's, so the pack must have loaded
 * (`WebsiteOverlayScope` stays neutral until it has).
 */
export function mapWebsiteBrandVariables(
  theme: WebsiteThemeDefinition,
  brand: WebsiteOverlayBrand | undefined
): WebsiteBrandVariables {
  return getThemePack(theme.key).mapBrandPalette({
    theme,
    seeds: {
      primary: brand?.primaryColor || theme.tokens.defaultPrimary,
      secondary: brand?.secondaryColor || theme.tokens.defaultSecondary,
      accent: brand?.accentColor || theme.tokens.defaultAccent,
    },
    palette: brand?.palette as BrandMappingInput['palette'],
  });
}

export interface ContrastSafePrimaryTokens {
  readonly '--primary': string;
  readonly '--primary-foreground': string;
  readonly '--primary-hover': string;
  readonly '--ring': string;
}

function validTriplet(value: string | undefined): string | undefined {
  return isHslTriplet(value) ? value : undefined;
}

function shiftLightness(triplet: string, delta: number): string {
  const [h, s, l] = triplet.split(' ').map((part) => parseInt(part, 10));
  return `${h} ${s}% ${Math.min(100, Math.max(0, l + delta))}%`;
}

/**
 * White, else near-black, else black: the first that reads on `fill`.
 * Near-black alone is not enough — a mid-luminance fill can sit at ≈ 4.2:1
 * against both it and white — but black always clears ≈ 4.58:1 wherever
 * white fails.
 */
function readableOn(fill: string): string {
  return (
    [WHITE, NEAR_BLACK].find(
      (label) => contrastRatio(fill, label) >= TEXT_CONTRAST
    ) ?? BLACK
  );
}

/**
 * `--primary`, `--primary-foreground`, `--primary-hover` and `--ring` for
 * an overlay, from the scope's mapped variables (`null` when there is no
 * Academy palette to read, e.g. a status page) and the theme's default.
 */
export function resolveContrastSafePrimary(
  variables: WebsiteBrandVariables | null,
  themeDefaultPrimary?: string
): ContrastSafePrimaryTokens {
  const mapped: Partial<WebsiteBrandVariables> = variables ?? {};
  const background = validTriplet(mapped['--background']) ?? SCOPE_BACKGROUND;
  const text = validTriplet(mapped['--foreground']) ?? NEAR_BLACK;

  const mappedPrimary = validTriplet(mapped['--primary']);
  const primary =
    mappedPrimary ?? validTriplet(themeDefaultPrimary) ?? NEAR_BLACK;
  // The mapping's own label/hover/ring only describe ITS primary.
  const keepsMapping = primary === mappedPrimary;

  const mappedForeground = keepsMapping
    ? validTriplet(mapped['--primary-foreground'])
    : undefined;
  const foreground =
    mappedForeground &&
    contrastRatio(primary, mappedForeground) >= TEXT_CONTRAST
      ? mappedForeground
      : readableOn(primary);

  const mappedHover = keepsMapping
    ? validTriplet(mapped['--primary-hover'])
    : undefined;
  // Away from the label: darker under white text, lighter under dark text.
  const shiftedHover = shiftLightness(primary, foreground === WHITE ? -6 : 6);
  const hover = [mappedHover, shiftedHover].find(
    (candidate): candidate is string =>
      !!candidate && contrastRatio(candidate, foreground) >= TEXT_CONTRAST
  );

  const mappedRing = keepsMapping ? validTriplet(mapped['--ring']) : undefined;
  const ring = [mappedRing, primary].find(
    (candidate): candidate is string =>
      !!candidate && contrastRatio(candidate, background) >= NON_TEXT_CONTRAST
  );

  return {
    '--primary': primary,
    '--primary-foreground': foreground,
    '--primary-hover': hover ?? primary,
    '--ring': ring ?? text,
  };
}
