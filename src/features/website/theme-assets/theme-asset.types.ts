/**
 * Theme assets (Theme 1 plan §E): the photographs a theme ships with,
 * referenced from section content as `theme-asset:<theme>/<key>` and
 * resolved to self-hosted, versioned, immutable files.
 *
 * An entry is `pending` until its image has been generated, reviewed and
 * prepared; a pending reference renders the section's designed no-image
 * state, never a broken image. A `released` entry must carry everything
 * §E.3 requires: the files' version, LQIP, and full provenance.
 */
export type ThemeAssetFormat = 'avif' | 'webp';

/**
 * Applied as CSS `object-position` (x% y%): the position that keeps the
 * subject inside every crop the layouts use, chosen when the image is
 * reviewed. Physical, not logical — crops don't mirror in RTL.
 */
export interface ThemeAssetFocalPoint {
  /** 0–1 from the left. */
  readonly x: number;
  /** 0–1 from the top. */
  readonly y: number;
}

export interface ThemeAssetProvenance {
  readonly generator: 'magnific';
  /** The MCP tool that produced the master, as reported. */
  readonly tool: string;
  /** Model and version as reported by the tool. */
  readonly model: string;
  /** The exact prompt sent. */
  readonly prompt: string;
  readonly seed?: number;
  /** Creation/job reference, if the tool exposes one. */
  readonly jobId?: string;
  /** ISO date-time. */
  readonly generatedAt: string;
  readonly reviewer: string;
  readonly reviewOutcome: 'approved';
  /** The plan and output terms the commercial use relies on (§L.4). */
  readonly licenseBasis: string;
  /** sha256 of the archived master (masters are not committed). */
  readonly masterSha256: string;
}

export type ThemeAssetBreakpoint = 'desktop' | 'tablet' | 'mobile';

/** How one breakpoint shows the image (Phase 4 layout freeze). */
export interface ThemeAssetCrop {
  readonly breakpoint: ThemeAssetBreakpoint;
  /** Displayed ratio (`w:h`), or `hidden`. */
  readonly ratio: string;
  /** Approximate rendered width, e.g. `~560px` or `100vw`. */
  readonly width: string;
}

/**
 * The frozen composition contract (plan §E.3 step 1): the layout the image
 * is generated for, so art direction, crops and the renderer agree.
 */
export interface ThemeAssetComposition {
  /** Section and layout slot. */
  readonly slot: string;
  readonly crops: readonly ThemeAssetCrop[];
  /** Where the subject must stay so every crop keeps it. */
  readonly safeArea: string;
  /** Areas that must stay calm because UI sits over or against them. */
  readonly exclusion: string;
  /** Layout mirrors in Arabic; the photograph never does. */
  readonly rtl: string;
}

export interface ThemeAssetEntry {
  readonly key: string;
  /** Where it is used (§E.2). */
  readonly purpose: string;
  /** `w:h` of the master. */
  readonly ratio: string;
  readonly master: { readonly width: number; readonly height: number };
  /** Delivered widths, ascending. */
  readonly widths: readonly number[];
  readonly focal: ThemeAssetFocalPoint;
  readonly alt: { readonly en: string; readonly ar: string };
  /** The subject and composition this asset is generated from (§E.3 step 3). */
  readonly direction: string;
  /** The frozen layout contract (Phase 4). */
  readonly composition: ThemeAssetComposition;
  /** Loaded eagerly with high priority (the LCP image). */
  readonly priority?: boolean;
  /** Byte budget for the ≤ 1200 w AVIF (§E.3 step 5). */
  readonly budgetBytes: number;
  readonly status: 'pending' | 'released';
  /** Present once released: the immutable folder the files live in. */
  readonly version?: `v${number}`;
  /** Present once released: a tiny blurred `data:image/webp;base64,…`. */
  readonly lqip?: string;
  readonly provenance?: ThemeAssetProvenance;
}

export interface ThemeAssetManifest {
  readonly theme: string;
  /** Shared art direction for every asset in this theme (§E.2 A). */
  readonly artDirection: string;
  /** What no prompt may produce. */
  readonly exclusions: string;
  readonly formats: readonly ThemeAssetFormat[];
  readonly assets: readonly ThemeAssetEntry[];
}
