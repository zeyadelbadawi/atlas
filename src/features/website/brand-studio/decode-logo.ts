/**
 * Decodes a (validated, sanitised) logo blob and downsamples it to the
 * analysis size (Theme 1 plan §F.4.2 step 1: ≤ 128 px long edge). Shared by
 * the Worker and the main-thread fallback, so both produce identical pixels.
 */
import type { LogoPixels } from '../brand-engine';

export const ANALYSIS_EDGE = 128;

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export async function decodeLogoPixels(
  blob: Blob,
  createCanvas: (
    width: number,
    height: number
  ) => {
    getContext(kind: '2d'): Canvas2D | null;
  }
): Promise<LogoPixels> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(
      1,
      ANALYSIS_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const context = createCanvas(width, height).getContext('2d');
    if (!context) throw new Error('2d context unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return { data, width, height };
  } finally {
    bitmap.close();
  }
}
