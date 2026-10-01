/**
 * Brand engine — logo colour analysis (Theme 1 plan §F.4.2 steps 2–5).
 *
 * FRONTEND ONLY. The backend never decodes or analyses logo pixels
 * (§F.4.3); it validates the palette the browser proposes. Decoding and
 * downscaling (step 1) happen in the Phase 4 Web Worker; this takes the
 * resulting RGBA pixels and is pure and deterministic, so it's unit-tested
 * with synthetic images.
 *
 *   2. mask: drop transparent pixels (α < 0.5), a solid background found
 *      on the border ring, and the anti-alias fringe;
 *   3. cluster in OKLab: weighted k-means (k ≤ 8), deterministic
 *      farthest-point initialisation, weight = pixel count × chroma boost;
 *      merge clusters closer than ΔE_ok 0.04;
 *   4. classify by OKLCH (neutral / dark / light / chromatic) and rank;
 *   5. choose candidate seeds (+ flags).
 */
import {
  contrastRatio,
  deltaEOk,
  hueDistance,
  oklabToOklch,
  oklchToTriplet,
  rgbToOklab,
  tripletToOklch,
  type HslTriplet,
  type Oklab,
} from './color-space';
import type {
  BrandCandidate,
  BrandCandidateClass,
  BrandExtractionFlag,
  BrandSeeds,
} from './palette.types';

export interface LogoPixels {
  /** RGBA, row-major, 4 bytes per pixel (`ImageData.data`). */
  readonly data: Uint8ClampedArray | Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface LogoAnalysis {
  /** `null` when nothing usable remains after masking (`empty`). */
  readonly seeds: BrandSeeds | null;
  readonly candidates: readonly BrandCandidate[];
  readonly flags: readonly BrandExtractionFlag[];
}

/** Worker downscales to ≤ 128px (§F.4.2 step 1); anything far larger is a caller bug. */
export const MAX_ANALYSIS_EDGE = 512;

const ALPHA_THRESHOLD = 128;
const BORDER_DOMINANCE = 0.6;
const BACKGROUND_DELTA_E = 0.08;
const MAX_CLUSTERS = 8;
const KMEANS_ITERATIONS = 24;
const MERGE_DELTA_E = 0.04;
const CHROMA_BOOST = 4;
const MIN_CANDIDATE_SHARE = 0.01;
const NEUTRAL_CHROMA = 0.03;
const DARK_LIGHTNESS = 0.25;
const LIGHT_LIGHTNESS = 0.92;
const LIGHT_MAX_CHROMA = 0.1;
const SECONDARY_HUE_DISTANCE = 30;
const SECONDARY_DELTA_E = 0.1;
const LOW_CHROMA = 0.08;

interface Cluster {
  lab: Oklab;
  /** Boosted weight (ranking). */
  weight: number;
  /** Raw pixel count (share). */
  count: number;
}

function pixelLab(data: LogoPixels['data'], offset: number): Oklab {
  return rgbToOklab({
    r: data[offset] / 255,
    g: data[offset + 1] / 255,
    b: data[offset + 2] / 255,
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Step 2: which pixels belong to the mark. Returns the mask and whether a
 * solid border colour was removed or the border was opaque but noisy.
 */
function maskLogo(pixels: LogoPixels): {
  keep: Uint8Array;
  noisyBackground: boolean;
} {
  const { data, width, height } = pixels;
  const total = width * height;
  const keep = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    keep[index] = data[index * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
  }

  // The border ring: every pixel on the outer edge.
  const ring: number[] = [];
  for (let x = 0; x < width; x += 1) {
    ring.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    ring.push(y * width, y * width + width - 1);
  }
  const opaqueRing = ring.filter((index) => keep[index]);

  let noisyBackground = false;
  // A logo on a transparent canvas has a (mostly) transparent ring.
  if (opaqueRing.length >= ring.length * 0.5) {
    const labs = opaqueRing.map((index) => pixelLab(data, index * 4));
    const centre: Oklab = {
      L: median(labs.map((lab) => lab.L)),
      a: median(labs.map((lab) => lab.a)),
      b: median(labs.map((lab) => lab.b)),
    };
    const near = labs.filter(
      (lab) => deltaEOk(lab, centre) < BACKGROUND_DELTA_E
    );
    if (near.length > ring.length * BORDER_DOMINANCE) {
      const background: Oklab = {
        L: near.reduce((sum, lab) => sum + lab.L, 0) / near.length,
        a: near.reduce((sum, lab) => sum + lab.a, 0) / near.length,
        b: near.reduce((sum, lab) => sum + lab.b, 0) / near.length,
      };
      for (let index = 0; index < total; index += 1) {
        if (
          keep[index] &&
          deltaEOk(pixelLab(data, index * 4), background) < BACKGROUND_DELTA_E
        ) {
          keep[index] = 0;
        }
      }
    } else {
      noisyBackground = true;
    }
  }

  // Anti-alias fringe: kept pixels touching a removed one. Skipped when
  // it would take most of the mark (thin strokes are all "edge").
  const fringe: number[] = [];
  let kept = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!keep[index]) continue;
      kept += 1;
      const touchesMasked =
        (x > 0 && !keep[index - 1]) ||
        (x < width - 1 && !keep[index + 1]) ||
        (y > 0 && !keep[index - width]) ||
        (y < height - 1 && !keep[index + width]);
      if (touchesMasked) fringe.push(index);
    }
  }
  if (fringe.length > 0 && fringe.length <= kept * 0.5) {
    for (const index of fringe) keep[index] = 0;
  }

  return { keep, noisyBackground };
}

/** Step 3: weighted k-means in OKLab over a 5-bit-per-channel histogram. */
function clusterPixels(pixels: LogoPixels, keep: Uint8Array): Cluster[] {
  const bins = new Map<
    number,
    { r: number; g: number; b: number; count: number }
  >();
  const { data } = pixels;
  for (let index = 0; index < keep.length; index += 1) {
    if (!keep[index]) continue;
    const offset = index * 4;
    const key =
      ((data[offset] >> 3) << 10) |
      ((data[offset + 1] >> 3) << 5) |
      (data[offset + 2] >> 3);
    const bin = bins.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bin.r += data[offset];
    bin.g += data[offset + 1];
    bin.b += data[offset + 2];
    bin.count += 1;
    bins.set(key, bin);
  }

  const points = [...bins.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, bin]) => {
      const lab = rgbToOklab({
        r: bin.r / bin.count / 255,
        g: bin.g / bin.count / 255,
        b: bin.b / bin.count / 255,
      });
      const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
      return {
        lab,
        count: bin.count,
        weight: bin.count * (1 + CHROMA_BOOST * chroma),
      };
    });
  if (points.length === 0) return [];

  // Deterministic farthest-point (k-means++-style) initialisation.
  const k = Math.min(MAX_CLUSTERS, points.length);
  let heaviest = 0;
  points.forEach((point, index) => {
    if (point.weight > points[heaviest].weight) heaviest = index;
  });
  const centres: Oklab[] = [points[heaviest].lab];
  while (centres.length < k) {
    let bestIndex = -1;
    let bestScore = 0;
    points.forEach((point, index) => {
      const nearest = Math.min(
        ...centres.map((centre) => deltaEOk(point.lab, centre))
      );
      const score = point.weight * nearest * nearest;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex < 0) break;
    centres.push(points[bestIndex].lab);
  }

  let assignment = new Array<number>(points.length).fill(-1);
  for (let iteration = 0; iteration < KMEANS_ITERATIONS; iteration += 1) {
    const next = points.map((point) => {
      let best = 0;
      let bestDistance = Infinity;
      centres.forEach((centre, index) => {
        const distance = deltaEOk(point.lab, centre);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      return best;
    });
    const stable = next.every((value, index) => value === assignment[index]);
    assignment = next;
    centres.forEach((_, index) => {
      let weight = 0;
      let L = 0;
      let a = 0;
      let b = 0;
      points.forEach((point, pointIndex) => {
        if (assignment[pointIndex] !== index) return;
        weight += point.weight;
        L += point.lab.L * point.weight;
        a += point.lab.a * point.weight;
        b += point.lab.b * point.weight;
      });
      if (weight > 0)
        centres[index] = { L: L / weight, a: a / weight, b: b / weight };
    });
    if (stable) break;
  }

  let clusters: Cluster[] = centres
    .map((lab, index) => {
      let weight = 0;
      let count = 0;
      points.forEach((point, pointIndex) => {
        if (assignment[pointIndex] !== index) return;
        weight += point.weight;
        count += point.count;
      });
      return { lab, weight, count };
    })
    .filter((cluster) => cluster.count > 0);

  // Merge near-duplicates, closest pair first.
  for (;;) {
    let pair: [number, number] | null = null;
    let closest = MERGE_DELTA_E;
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        const distance = deltaEOk(clusters[i].lab, clusters[j].lab);
        if (distance < closest) {
          closest = distance;
          pair = [i, j];
        }
      }
    }
    if (!pair) break;
    const [a, b] = [clusters[pair[0]], clusters[pair[1]]];
    const weight = a.weight + b.weight;
    const merged: Cluster = {
      lab: {
        L: (a.lab.L * a.weight + b.lab.L * b.weight) / weight,
        a: (a.lab.a * a.weight + b.lab.a * b.weight) / weight,
        b: (a.lab.b * a.weight + b.lab.b * b.weight) / weight,
      },
      weight,
      count: a.count + b.count,
    };
    clusters = clusters.filter(
      (_, index) => index !== pair![0] && index !== pair![1]
    );
    clusters.push(merged);
  }

  // Heaviest first; ties by lightness so the order is total.
  return clusters.sort((a, b) => b.weight - a.weight || a.lab.L - b.lab.L);
}

function classify(lab: Oklab): BrandCandidateClass {
  const { L, C } = oklabToOklch(lab);
  if (C < NEUTRAL_CHROMA) return 'neutral';
  if (L < DARK_LIGHTNESS) return 'dark';
  // Neon yellow sits above L 0.92 too, but it's a brand colour, not a pale
  // background tone: only low-chroma light colours count as 'light'.
  if (L > LIGHT_LIGHTNESS && C < LIGHT_MAX_CHROMA) return 'light';
  return 'chromatic';
}

/** Cluster centres are means of real pixels, so in gamut up to float error. */
function toTriplet(lab: Oklab): HslTriplet {
  return oklchToTriplet(oklabToOklch(lab));
}

export function analyzeLogoPixels(pixels: LogoPixels): LogoAnalysis {
  const { width, height, data } = pixels;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_ANALYSIS_EDGE ||
    height > MAX_ANALYSIS_EDGE ||
    data.length !== width * height * 4
  ) {
    throw new Error('analyzeLogoPixels: invalid or oversized pixel buffer');
  }

  const { keep, noisyBackground } = maskLogo(pixels);
  const clusters = clusterPixels(pixels, keep);
  const flags: BrandExtractionFlag[] = noisyBackground
    ? ['noisyBackground']
    : [];
  const totalCount = clusters.reduce((sum, cluster) => sum + cluster.count, 0);

  const candidates: BrandCandidate[] = clusters
    .filter((cluster) => cluster.count / totalCount >= MIN_CANDIDATE_SHARE)
    .map((cluster) => ({
      color: toTriplet(cluster.lab),
      share: Math.round((cluster.count / totalCount) * 1000) / 1000,
      class: classify(cluster.lab),
    }));
  const significant = clusters.filter(
    (cluster) => cluster.count / totalCount >= MIN_CANDIDATE_SHARE
  );

  if (significant.length === 0) {
    return { seeds: null, candidates: [], flags: [...flags, 'empty'] };
  }

  const chromatic = significant.filter(
    (cluster) => classify(cluster.lab) === 'chromatic'
  );
  if (chromatic.length === 0) {
    // Monochrome: the darkest mark colour becomes an "ink brand"; the
    // deriver supplies an accent from the theme default (§F.4.2 step 5).
    const darkest = [...significant].sort((a, b) => a.lab.L - b.lab.L)[0];
    return {
      seeds: { primary: toTriplet(darkest.lab) },
      candidates,
      flags: [...flags, 'monochrome'],
    };
  }

  const dominant = chromatic[0];
  const dominantLch = oklabToOklch(dominant.lab);
  const secondary = chromatic.find(
    (cluster) =>
      cluster !== dominant &&
      hueDistance(oklabToOklch(cluster.lab).h, dominantLch.h) >=
        SECONDARY_HUE_DISTANCE &&
      deltaEOk(cluster.lab, dominant.lab) >= SECONDARY_DELTA_E
  );
  const accent = chromatic
    .filter(
      (cluster) =>
        cluster !== dominant &&
        cluster !== secondary &&
        deltaEOk(cluster.lab, dominant.lab) >= SECONDARY_DELTA_E &&
        (!secondary ||
          deltaEOk(cluster.lab, secondary.lab) >= SECONDARY_DELTA_E)
    )
    .sort((a, b) => oklabToOklch(b.lab).C - oklabToOklch(a.lab).C)[0];

  if (chromatic.every((cluster) => oklabToOklch(cluster.lab).C < LOW_CHROMA)) {
    flags.push('lowChroma');
  }
  if (
    chromatic.every(
      (cluster) =>
        hueDistance(oklabToOklch(cluster.lab).h, dominantLch.h) <
        SECONDARY_HUE_DISTANCE
    )
  ) {
    flags.push('singleHue');
  }

  const seeds: BrandSeeds = {
    primary: toTriplet(dominant.lab),
    ...(secondary ? { secondary: toTriplet(secondary.lab) } : {}),
    ...(accent ? { accent: toTriplet(accent.lab) } : {}),
  };
  // Neon: vivid and nearly as light as the page — unusable for text.
  const isNeon = (color: HslTriplet) =>
    tripletToOklch(color).C >= 0.12 && contrastRatio(color, '0 0% 100%') < 1.6;
  if (
    [seeds.primary, seeds.secondary, seeds.accent].some((c) => c && isNeon(c))
  ) {
    flags.push('neonSeed');
  }

  return { seeds, candidates, flags };
}
