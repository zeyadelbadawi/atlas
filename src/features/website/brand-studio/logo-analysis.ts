/**
 * Runs logo analysis (Theme 1 plan §F.4.3 "States"): in a Web Worker with a
 * 3 s budget — on timeout the Worker is terminated, so a hostile image
 * can't keep burning CPU — or, where OffscreenCanvas/Worker aren't
 * available, on the main thread from a downscaled canvas. Any failure
 * resolves to `{ ok: false }`; the Brand Studio then offers "Try another
 * file" / "Pick colours manually".
 */
import { analyzeLogoPixels, type LogoAnalysis } from '../brand-engine';
import { decodeLogoPixels } from './decode-logo';

export const ANALYSIS_TIMEOUT_MS = 3000;

export type LogoAnalysisResult =
  | { readonly ok: true; readonly analysis: LogoAnalysis }
  | { readonly ok: false; readonly reason: 'failed' | 'timeout' };

export interface AnalysisWorkerLike {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface AnalyzeLogoOptions {
  readonly timeoutMs?: number;
  /** Injected in tests; `null` forces the main-thread path. */
  readonly createWorker?: (() => AnalysisWorkerLike) | null;
}

function canUseWorker(): boolean {
  return (
    typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
  );
}

function defaultWorker(): AnalysisWorkerLike {
  return new Worker(new URL('./logo-analysis.worker.ts', import.meta.url), {
    type: 'module',
  });
}

export function analyzeLogoInWorker(
  blob: Blob,
  createWorker: () => AnalysisWorkerLike,
  timeoutMs: number
): Promise<LogoAnalysisResult> {
  return new Promise((resolve) => {
    let worker: AnalysisWorkerLike;
    try {
      worker = createWorker();
    } catch {
      resolve({ ok: false, reason: 'failed' });
      return;
    }
    const finish = (result: LogoAnalysisResult) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, reason: 'timeout' }),
      timeoutMs
    );
    worker.onmessage = (event) => {
      const data = event.data as { ok: boolean; analysis?: LogoAnalysis };
      finish(
        data.ok && data.analysis
          ? { ok: true, analysis: data.analysis }
          : { ok: false, reason: 'failed' }
      );
    };
    worker.onerror = () => finish({ ok: false, reason: 'failed' });
    worker.postMessage({ blob });
  });
}

async function analyzeOnMainThread(blob: Blob): Promise<LogoAnalysisResult> {
  try {
    const pixels = await decodeLogoPixels(blob, (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    });
    return { ok: true, analysis: analyzeLogoPixels(pixels) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * SVG → PNG on the main thread. Browsers' `createImageBitmap` won't decode
 * SVG blobs (verified in Chromium), so the (already sanitised) SVG is drawn
 * through an `<img>` — a context in which SVG can't run script or fetch
 * anything — onto a canvas, and the PNG goes to the Worker like any logo.
 */
export function rasterizeSvg(svg: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(svg);
    const image = new Image();
    const done = (value: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, image.naturalWidth || image.width);
        canvas.height = Math.max(1, image.naturalHeight || image.height);
        const context = canvas.getContext('2d');
        if (!context) return done(null);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((png) => done(png), 'image/png');
      } catch {
        done(null);
      }
    };
    image.onerror = () => done(null);
    image.src = url;
  });
}

export function analyzeLogo(
  blob: Blob,
  options: AnalyzeLogoOptions = {}
): Promise<LogoAnalysisResult> {
  const timeoutMs = options.timeoutMs ?? ANALYSIS_TIMEOUT_MS;
  const createWorker =
    options.createWorker === undefined
      ? canUseWorker()
        ? defaultWorker
        : null
      : options.createWorker;
  return createWorker
    ? analyzeLogoInWorker(blob, createWorker, timeoutMs)
    : analyzeOnMainThread(blob);
}
