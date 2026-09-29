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
