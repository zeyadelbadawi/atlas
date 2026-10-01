/**
 * Logo analysis Web Worker (Theme 1 plan §F.4.3): decoding and colour
 * analysis run here, off the main thread, in the browser's sandboxed image
 * decoder — never on the API server.
 */
import { analyzeLogoPixels } from '../brand-engine';
import { decodeLogoPixels } from './decode-logo';

// The app compiles with the DOM lib, where `self.postMessage` is Window's.
const worker = self as unknown as { postMessage(message: unknown): void };

self.onmessage = async (event: MessageEvent<{ blob: Blob }>) => {
  try {
    const pixels = await decodeLogoPixels(
      event.data.blob,
      (width, height) => new OffscreenCanvas(width, height)
    );
    worker.postMessage({ ok: true, analysis: analyzeLogoPixels(pixels) });
  } catch {
    worker.postMessage({ ok: false });
  }
};
