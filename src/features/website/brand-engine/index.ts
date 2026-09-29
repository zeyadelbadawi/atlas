/**
 * Brand engine — public entry point (Theme 1 plan §F.4).
 *
 * Logo pixels → seeds (`analyzeLogoPixels`), seeds → semantic palette
 * (`deriveBrandPalette` / `buildBrandPalette`), palette → accept or reject
 * (`validateBrandPalette`). Theme-agnostic: themes consume the roles
 * through their own `mapBrandPalette` (§F.5). Not wired into any UI yet
 * (Phase 4 adds the Web Worker and the Brand Studio).
 */
export * from './color-space';
export * from './palette.types';
export {
  DEFAULT_FALLBACK_ACCENT,
  DEFAULT_NEUTRAL_CHROMA_CAP,
  WHITE,
  buildBrandPalette,
  deriveBrandPalette,
  deriveBrandPaletteAlternatives,
  deriveInteractionStates,
  evaluateContrastPairs,
  resolveColorRef,
  solveLightness,
} from './derive';
export type {
  BuildBrandPaletteInput,
  DeriveBrandPaletteOptions,
  DerivedBrandPalette,
} from './derive';
export { scoreHarmony } from './harmony';
export { validateBrandPalette } from './validate';
export type {
  BrandPaletteIssue,
  BrandPaletteIssueCode,
  BrandPaletteValidationResult,
} from './validate';
export { analyzeLogoPixels, MAX_ANALYSIS_EDGE } from './analyze';
export type { LogoAnalysis, LogoPixels } from './analyze';
