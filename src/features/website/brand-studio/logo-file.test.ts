/**
 * Logo intake (Theme 1 plan §I.2 "Malformed / malicious images"): the type
 * comes from the bytes, oversized or bomb-sized images are refused before
 * decoding, and SVGs are rebuilt without anything that can run or fetch.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_LOGO_BYTES,
  inspectLogoFile,
  readRasterDimensions,
  sanitizeSvg,
  sniffLogoKind,
} from './logo-file';

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, an APP0 segment, then SOF0 with the size.
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}

function webpVp8x(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return bytes;
}

const blob = (bytes: Uint8Array | string, type = '') =>
  new Blob([bytes as BlobPart], { type });

describe('logo intake', () => {
  it('identifies the format from the bytes, not the name or MIME type', () => {
    expect(sniffLogoKind(png(10, 10))).toBe('png');
    expect(sniffLogoKind(jpeg(10, 10))).toBe('jpeg');
    expect(sniffLogoKind(webpVp8x(10, 10))).toBe('webp');
    expect(
      sniffLogoKind(
        new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')
      )
    ).toBe('svg');
    // GIF (animated or not) and random bytes are not accepted.
    expect(sniffLogoKind(new TextEncoder().encode('GIF89a...'))).toBeNull();
    expect(sniffLogoKind(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it('reads raster dimensions from the header without decoding', () => {
    expect(readRasterDimensions('png', png(640, 320))).toEqual({
      width: 640,
      height: 320,
    });
    expect(readRasterDimensions('jpeg', jpeg(300, 200))).toEqual({
      width: 300,
      height: 200,
    });
    expect(readRasterDimensions('webp', webpVp8x(512, 256))).toEqual({
      width: 512,
      height: 256,
    });
    expect(
      readRasterDimensions('png', new Uint8Array([0x89, 0x50]))
    ).toBeNull();
  });

  it('refuses empty, oversized, bomb-sized, truncated and unsupported files', async () => {
    expect(await inspectLogoFile(blob(new Uint8Array()))).toEqual({
      ok: false,
      error: 'empty',
    });
    expect(
      await inspectLogoFile(blob(new Uint8Array(MAX_LOGO_BYTES + 1)))
    ).toEqual({
      ok: false,
      error: 'tooLarge',
    });
    expect(await inspectLogoFile(blob(png(20000, 20000)))).toEqual({
      ok: false,
      error: 'dimensionsTooLarge',
    });
    expect(await inspectLogoFile(blob(png(0, 0)))).toEqual({
      ok: false,
      error: 'corrupt',
    });
    expect(await inspectLogoFile(blob('GIF89a animated', 'image/png'))).toEqual(
      {
        ok: false,
        error: 'unsupportedType',
      }
    );
  });

  it('accepts a PNG mislabelled as JPEG and fingerprints the original bytes', async () => {
    const result = await inspectLogoFile(blob(png(64, 64), 'image/jpeg'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.logo.kind).toBe('png');
    expect(result.logo.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rebuilds an SVG without scripts, handlers, foreign content or external references', () => {
    const clean = sanitizeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 50" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><div>html</div></foreignObject>
        <image href="https://evil.example/track.png"/>
        <style>@import url(https://evil.example/x.css);</style>
        <defs><linearGradient id="g"><stop offset="0" stop-color="#f60"/></linearGradient></defs>
        <use xlink:href="https://evil.example/sprite.svg#a"/>
        <use href="#shape"/>
        <path id="shape" d="M0 0h10v10z" fill="url(#g)" style="fill:url(https://evil.example/)" />
        <rect width="10" height="10" fill="url(https://evil.example/p)"/>
      </svg>`)!;
    expect(clean).not.toMatch(
      /script|foreignObject|<image|<style|onload|evil\.example/i
    );
    expect(clean).toContain('<path');
    expect(clean).toContain('fill="url(#g)"');
    expect(clean).toContain('href="#shape"');
    // Sized for rasterising from the viewBox (2:1 → 256 × 128).
    expect(clean).toMatch(/width="256"/);
    expect(clean).toMatch(/height="128"/);
  });

  it('refuses markup that is not an SVG document', () => {
    expect(sanitizeSvg('<html><body/></html>')).toBeNull();
    expect(sanitizeSvg('<svg><unclosed')).toBeNull();
  });
});
