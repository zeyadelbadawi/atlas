/**
 * Brand Studio state (Theme 1 plan §F.4.5, §F.4.6): the Owner's inputs —
 * seeds, role overrides, the chosen alternative, status — and everything
 * derived from them live. The palette is always rebuilt by the same engine
 * the backend re-runs on save, so what the Owner sees is what gets stored.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BRAND_PALETTE_VARIANTS,
  BRAND_SEED_NAMES,
  buildBrandPalette,
  validateBrandPalette,
  type BrandExtraction,
  type BrandOverrides,
  type BrandPalette,
  type BrandPaletteValidationResult,
  type BrandRoleName,
  type BrandSeedName,
  type BrandSeeds,
  type HslTriplet,
} from '../brand-engine';
import type { WebsiteThemeDefinition } from '@types';
import { inspectLogoFile, type LogoFileError } from './logo-file';
import {
  analyzeLogo,
  rasterizeSvg,
  type AnalyzeLogoOptions,
} from './logo-analysis';

/** What gets persisted (`brand.palette` input, validated again server-side). */
export interface BrandPaletteDraft {
  readonly seeds: BrandSeeds;
  readonly overrides: BrandOverrides;
  readonly variantIndex: number;
  readonly status: 'proposed' | 'confirmed';
  readonly source: 'logo' | 'manual' | 'themeDefault';
  readonly extraction?: BrandExtraction;
}

export type LogoAnalysisState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'analyzing'; readonly slow: boolean }
  | { readonly kind: 'error'; readonly error: LogoFileError | 'analysisFailed' }
  | { readonly kind: 'done'; readonly flags: BrandExtraction['flags'] };

/** A spinner only when analysis takes longer than this (§F.4.3). */
export const SLOW_ANALYSIS_MS = 300;

export function themeDefaultSeeds(theme: WebsiteThemeDefinition): BrandSeeds {
  return {
    primary: theme.tokens.defaultPrimary,
    secondary: theme.tokens.defaultSecondary,
    accent: theme.tokens.defaultAccent,
  };
}

export function draftFromPalette(
  palette: BrandPalette | undefined,
  theme: WebsiteThemeDefinition
): BrandPaletteDraft {
  if (!palette) {
    return {
      seeds: themeDefaultSeeds(theme),
      overrides: {},
      variantIndex: 0,
      status: 'proposed',
      source: 'themeDefault',
    };
  }
  const variantIndex = Math.max(
    0,
    BRAND_PALETTE_VARIANTS.indexOf(palette.report?.variant ?? 'balanced')
  );
  return {
    seeds: palette.seeds,
    overrides: palette.overrides ?? {},
    variantIndex,
    status: palette.status,
    source: palette.source,
    extraction: palette.extraction,
  };
}

export function buildDraftPalette(draft: BrandPaletteDraft): BrandPalette {
  return buildBrandPalette({
    seeds: draft.seeds,
    source: draft.source,
    status: draft.status,
    variant: BRAND_PALETTE_VARIANTS[draft.variantIndex],
    overrides: draft.overrides,
    extraction: draft.extraction,
  });
}

/** The `brand.palette` request body (the server derives everything else). */
export function toPaletteInput(draft: BrandPaletteDraft) {
  return {
    seeds: draft.seeds,
    overrides: draft.overrides,
    variant: BRAND_PALETTE_VARIANTS[draft.variantIndex],
    status: draft.status,
    source: draft.source,
    ...(draft.extraction ? { extraction: draft.extraction } : {}),
  };
}

export interface UseBrandStudioOptions {
  readonly theme: WebsiteThemeDefinition;
  readonly initialPalette?: BrandPalette;
  readonly analysisOptions?: AnalyzeLogoOptions;
}

export function useBrandStudio({
  theme,
  initialPalette,
  analysisOptions,
}: UseBrandStudioOptions) {
  const [draft, setDraft] = useState<BrandPaletteDraft>(() =>
    draftFromPalette(initialPalette, theme)
  );
  const [analysis, setAnalysis] = useState<LogoAnalysisState>({ kind: 'idle' });
  const [logoSuggestion, setLogoSuggestion] = useState<{
    seeds: BrandSeeds;
    extraction: BrandExtraction;
  } | null>(() =>
    initialPalette?.source === 'logo' && initialPalette.extraction
      ? { seeds: initialPalette.seeds, extraction: initialPalette.extraction }
      : null
  );
  const lastFile = useRef<Blob | null>(null);
  const run = useRef(0);

  const palette = useMemo(() => buildDraftPalette(draft), [draft]);
  const validation: BrandPaletteValidationResult = useMemo(
    () => validateBrandPalette(palette),
    [palette]
  );

  /** Any edit makes the palette "proposed" again until the Owner accepts it. */
  const edit = useCallback(
    (change: (current: BrandPaletteDraft) => BrandPaletteDraft) =>
      setDraft((current) => ({ ...change(current), status: 'proposed' })),
    []
  );

  const analyzeFile = useCallback(
    async (file: Blob) => {
      lastFile.current = file;
      const ticket = ++run.current;
      setAnalysis({ kind: 'analyzing', slow: false });
      const slowTimer = setTimeout(() => {
        if (run.current === ticket)
          setAnalysis({ kind: 'analyzing', slow: true });
      }, SLOW_ANALYSIS_MS);
      try {
        const inspected = await inspectLogoFile(file);
        if (run.current !== ticket) return;
        if (!inspected.ok) {
          setAnalysis({ kind: 'error', error: inspected.error });
          return;
        }
        const decodable =
          inspected.logo.kind === 'svg'
            ? await rasterizeSvg(inspected.logo.blob)
            : inspected.logo.blob;
        if (run.current !== ticket) return;
        if (!decodable) {
          setAnalysis({ kind: 'error', error: 'analysisFailed' });
          return;
        }
        const result = await analyzeLogo(decodable, analysisOptions);
        if (run.current !== ticket) return;
        if (!result.ok || !result.analysis.seeds) {
          // The preview stays on the last good palette (§F.4.3).
          setAnalysis({ kind: 'error', error: 'analysisFailed' });
          return;
        }
        const extraction: BrandExtraction = {
          logoFingerprint: inspected.logo.fingerprint,
          candidates: result.analysis.candidates.slice(0, 8),
          flags: result.analysis.flags,
        };
        const seeds = result.analysis.seeds;
        setLogoSuggestion({ seeds, extraction });
        // Picking a logo is an explicit Owner action: propose its palette,
        // keeping any per-role overrides (seed overrides give way to it).
        edit((current) => ({
          ...current,
          seeds,
          overrides: withoutSeedOverrides(current.overrides),
          variantIndex: 0,
          source: 'logo',
          extraction,
        }));
        setAnalysis({ kind: 'done', flags: result.analysis.flags });
      } catch {
        // A throw anywhere above (an unreadable file, a worker that failed
        // to start) used to leave the studio "analyzing" for good — the
        // logo picker stayed disabled and the palette could not be redone.
        if (run.current === ticket)
          setAnalysis({ kind: 'error', error: 'analysisFailed' });
      } finally {
        clearTimeout(slowTimer);
      }
    },
    [analysisOptions, edit]
  );

  const actions = useMemo(
    () => ({
      analyzeFile,
      retry: () => {
        if (lastFile.current) void analyzeFile(lastFile.current);
      },
      /** Cycles the four deterministic alternatives; overrides are kept. */
      regenerate: () =>
        edit((current) => ({
          ...current,
          variantIndex:
            (current.variantIndex + 1) % BRAND_PALETTE_VARIANTS.length,
        })),
      setSeed: (name: BrandSeedName, value: HslTriplet | undefined) =>
        edit((current) => {
          const seeds = { ...current.seeds } as Record<
            BrandSeedName,
            HslTriplet | undefined
          >;
          seeds[name] = value;
          if (name === 'primary' && !value) return current;
          return {
            ...current,
            seeds: seeds as unknown as BrandSeeds,
            overrides: omit(current.overrides, name),
            source: 'manual',
          };
        }),
      setOverride: (role: BrandRoleName, value: HslTriplet | undefined) =>
        edit((current) => ({
          ...current,
          overrides: value
            ? { ...current.overrides, [role]: value }
            : omit(current.overrides, role),
        })),
      /**
       * The nearest colour for `role` that passes EVERY pair it's in. The
       * engine suggests per failing pair (a link that passes on the
       * background may still fail on the surface), so apply and re-check
       * until nothing about that role fails.
       */
      applySuggestion: (role: BrandRoleName) => {
        let overrides = draft.overrides;
        for (let round = 0; round < 6; round += 1) {
          const issue = validateBrandPalette(
            buildDraftPalette({ ...draft, overrides })
          ).issues.find(
            (candidate) =>
              candidate.path === `overrides.${role}` && candidate.suggestion
          );
          if (!issue?.suggestion) break;
          overrides = { ...overrides, [role]: issue.suggestion };
        }
        if (overrides !== draft.overrides)
          edit((current) => ({ ...current, overrides }));
      },
      accept: () => {
        if (!validation.valid) return;
        setDraft((current) => ({ ...current, status: 'confirmed' }));
      },
      resetToLogo: () => {
        if (!logoSuggestion) return;
        edit(() => ({
          seeds: logoSuggestion.seeds,
          overrides: {},
          variantIndex: 0,
          status: 'proposed',
          source: 'logo',
          extraction: logoSuggestion.extraction,
        }));
      },
      resetToThemeDefault: () =>
        edit(() => ({
          seeds: themeDefaultSeeds(theme),
          overrides: {},
          variantIndex: 0,
          status: 'proposed',
          source: 'themeDefault',
        })),
    }),
    [analyzeFile, draft, edit, logoSuggestion, theme, validation.valid]
  );

  return {
    draft,
    palette,
    validation,
    analysis,
    hasLogoSuggestion: !!logoSuggestion,
    variant: BRAND_PALETTE_VARIANTS[draft.variantIndex],
    actions,
  };
}

function omit<T extends object>(value: T, key: string): T {
  const next = { ...value } as Record<string, unknown>;
  delete next[key];
  return next as T;
}

function withoutSeedOverrides(overrides: BrandOverrides): BrandOverrides {
  let next = overrides;
  for (const name of BRAND_SEED_NAMES) next = omit(next, name);
  return next;
}

export type BrandStudioState = ReturnType<typeof useBrandStudio>;
