/**
 * Website Theme domain types (Prompt 9).
 *
 * Named `WebsiteTheme*` throughout — deliberately NOT `Theme*` — because
 * Atlas already has an unrelated `Theme`/`ThemePreference`/`ThemeProvider`
 * concept (`theme.types.ts`, Light/Dark Mode for the Atlas dashboard
 * itself). A public Academy website's visual design and the dashboard's
 * own color-scheme preference are two completely different concerns that
 * happen to share the English word "theme"; disambiguating the name here
 * avoids both a real naming collision and a confusing one.
 *
 * A `WebsiteThemeDefinition` is a TOKEN + VARIANT set, not executable code
 * or markup. The client controls which theme and which token values are
 * active; the client never controls layout logic itself — that lives in
 * the (code-level, registered) section/header/footer renderer components,
 * which brand this contract's variant fields into structural choices (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "Design Tokens vs. Executable
 * Content").
 */

/** The five built-in themes shipped in this prompt. Adding a sixth means adding a new key here and one new definition module — never touching an existing one (see `WebsiteThemeRegistry`). */
export const WEBSITE_THEME_KEYS = [
  'modern-education',
  'premium-academy',
  'corporate-learning',
  'minimal-editorial',
  'bold-creative',
] as const;

export type WebsiteThemeKey = (typeof WEBSITE_THEME_KEYS)[number];

/** Structural Hero layouts. This is the one section where themes differ structurally, not just stylistically — it is the first thing a visitor sees. */
export type WebsiteHeroVariant = 'split' | 'centered' | 'fullbleed' | 'minimal';

/** Structural Header layouts. */
export type WebsiteHeaderVariant = 'standard' | 'centered' | 'minimal';

/** Structural Footer layouts. */
export type WebsiteFooterVariant = 'columns' | 'simple' | 'stacked';

/** How a card-shaped element (course card, feature card, testimonial card) is treated. */
export type WebsiteCardVariant = 'flat' | 'elevated' | 'outlined' | 'bold';

/** A bounded corner-radius scale — never an arbitrary pixel value the client could inject. */
export type WebsiteRadiusScale = 'none' | 'small' | 'medium' | 'large';

/** A bounded elevation scale. */
export type WebsiteShadowScale = 'none' | 'soft' | 'medium' | 'bold';

/** A bounded vertical rhythm scale — how much breathing room sections get. */
export type WebsiteSpacingScale = 'compact' | 'comfortable' | 'spacious';

/** A bounded content-width scale. */
export type WebsiteContainerWidth = 'narrow' | 'standard' | 'wide';

/** A bounded heading-weight scale. */
export type WebsiteHeadingWeight = 'semibold' | 'bold' | 'black';

/** A bounded letter-spacing scale. */
export type WebsiteHeadingTracking = 'tight' | 'normal' | 'wide';

export type WebsiteHeadingCase = 'normal' | 'uppercase';

/**
 * The full token set a `WebsiteThemeDefinition` provides. Every field is a
 * bounded enum or a validated HSL triplet — never a raw CSS value, font
 * file, or arbitrary string the client could turn into an injection
 * vector (see `Reports/ARCHITECTURE.md`, Prompt 9, "Security Audit").
 *
 * Typography deliberately reuses Atlas's own already-loaded font stacks
 * (`--font-display`/`--font-sans`, both RTL-safe) rather than introducing
 * new web fonts per theme — themes differ in weight/tracking/case/scale,
 * not typeface, which keeps the system self-contained with zero new
 * external font dependencies.
 */
export interface WebsiteThemeTokens {
  readonly heroVariant: WebsiteHeroVariant;
  readonly headerVariant: WebsiteHeaderVariant;
  readonly footerVariant: WebsiteFooterVariant;
  readonly cardVariant: WebsiteCardVariant;
  readonly radius: WebsiteRadiusScale;
  readonly shadow: WebsiteShadowScale;
  readonly spacing: WebsiteSpacingScale;
  readonly containerWidth: WebsiteContainerWidth;
  readonly headingWeight: WebsiteHeadingWeight;
  readonly headingTracking: WebsiteHeadingTracking;
  readonly headingCase: WebsiteHeadingCase;
  /** Default brand HSL triplets (e.g. `"221 83% 53%"`), used until the Tenant overrides them in `WebsiteBrandConfig`. */
  readonly defaultPrimary: string;
  readonly defaultSecondary: string;
  readonly defaultAccent: string;
}

/**
 * One registered theme. `version` is this THEME's own schema/design
 * version — bumped only if a theme's token *shape* changes in a way that
 * could affect an already-published site (see `Reports/ARCHITECTURE.md`,
 * Prompt 9, "Versioning"). Adding a theme is adding one new
 * `WebsiteThemeDefinition` object; it never requires editing another
 * theme's definition or the renderer engine itself.
 */
export interface WebsiteThemeDefinition {
  readonly key: WebsiteThemeKey;
  /** Translation key for the theme's display name. */
  readonly nameKey: string;
  /** Translation key for a one-line description of the theme's personality. */
  readonly descriptionKey: string;
  readonly tokens: WebsiteThemeTokens;
  readonly version: number;
}

/** The fully resolved, ready-to-render design system: a theme's tokens plus the Tenant's brand color overrides — the ONLY shape section/header/footer renderers ever consume. */
export interface ResolvedWebsiteDesignSystem extends WebsiteThemeTokens {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}
