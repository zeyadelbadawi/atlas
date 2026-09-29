/**
 * Logo file intake for the Brand Studio (Theme 1 plan §F.4.2 step 1,
 * §I.2 "Malformed / malicious images").
 *
 * Nothing about a picked file is trusted: the type comes from its first
 * bytes (not the name or the browser's MIME guess), raster dimensions are
 * read from the header BEFORE anything decodes it (a 20000×20000 "bomb" is
 * refused without allocating it), and an SVG is rebuilt from a whitelist
 * of drawing elements with no scripts, event handlers, external references
 * or `foreignObject`, so rasterising it can't run code or make a request.
 */

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** Longest edge / total pixels a logo header may declare (a logo, not a photo). */
export const MAX_LOGO_EDGE = 8000;
export const MAX_LOGO_PIXELS = 40_000_000;
/** The long edge an SVG is rasterised at (analysis downsamples further). */
export const SVG_RASTER_EDGE = 256;

export type LogoKind = 'png' | 'jpeg' | 'webp' | 'svg';

export type LogoFileError =
  'empty' | 'tooLarge' | 'unsupportedType' | 'corrupt' | 'dimensionsTooLarge';

export interface InspectedLogo {
  readonly kind: LogoKind;
  /** A blob safe to decode: the original raster, or the sanitised SVG. */
  readonly blob: Blob;
  /** sha256 of the ORIGINAL bytes — recorded as `extraction.logoFingerprint`. */
  readonly fingerprint: string;
}

export type InspectLogoResult =
  | { readonly ok: true; readonly logo: InspectedLogo }
  | { readonly ok: false; readonly error: LogoFileError };

function startsWith(bytes: Uint8Array, signature: readonly number[], at = 0) {
  return signature.every((value, index) => bytes[at + index] === value);
}

export function sniffLogoKind(bytes: Uint8Array): LogoKind | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'webp';
  }
  const head = new TextDecoder()
    .decode(bytes.subarray(0, 1024))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  if (
    (head.startsWith('<?xml') ||
      head.startsWith('<svg') ||
      head.startsWith('<!--')) &&
    head.includes('<svg')
  ) {
    return 'svg';
  }
  return null;
}

/** Width/height from a raster header, or `null` if the header is unreadable. */
export function readRasterDimensions(
  kind: Exclude<LogoKind, 'svg'>,
  bytes: Uint8Array
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (kind === 'png') {
      // IHDR is always the first chunk.
      if (bytes.length < 24) return null;
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (kind === 'webp') {
      const chunk = String.fromCharCode(...bytes.subarray(12, 16));
      if (chunk === 'VP8X') {
        return {
          width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
          height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
        };
      }
      if (chunk === 'VP8 ') {
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      }
      if (chunk === 'VP8L') {
        const b = bytes.subarray(21, 25);
        return {
          width: 1 + (((b[1] & 0x3f) << 8) | b[0]),
          height:
            1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)),
        };
      }
      return null;
    }
    // JPEG: walk the segments to the first start-of-frame marker.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      const isFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) {
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

/** Elements an SVG logo may keep: shapes, paths, text, gradients, groups. */
const SVG_ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'title',
  'desc',
  'symbol',
  'use',
]);
const SVG_URL_ATTRIBUTE = /url\(\s*['"]?\s*(?!#)/i;

/**
 * A new SVG document containing only whitelisted elements and attributes:
 * no scripts, no `on*` handlers, no `foreignObject`/`image`/`style`, and no
 * reference that isn't a same-document `#fragment`. `null` if unparsable.
 */
export function sanitizeSvg(source: string): string | null {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = parsed.documentElement;
  if (
    !root ||
    root.nodeName.toLowerCase() !== 'svg' ||
    parsed.querySelector('parsererror')
  ) {
    return null;
  }
  const walk = (element: Element): void => {
    for (const child of Array.from(element.children)) {
      if (!SVG_ALLOWED_ELEMENTS.has(child.nodeName.toLowerCase())) {
        child.remove();
        continue;
      }
      walk(child);
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const isReference = name === 'href' || name === 'xlink:href';
      if (
        name.startsWith('on') ||
        name === 'style' ||
        (isReference && !value.startsWith('#')) ||
        SVG_URL_ATTRIBUTE.test(value)
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  };
  walk(root);

  // Rasterisation needs an intrinsic size: take it from the viewBox.
  const viewBox = root
    .getAttribute('viewBox')
    ?.split(/[\s,]+/)
    .map(Number);
  if (viewBox && viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    const scale = SVG_RASTER_EDGE / Math.max(viewBox[2], viewBox[3]);
    root.setAttribute('width', String(Math.round(viewBox[2] * scale)));
    root.setAttribute('height', String(Math.round(viewBox[3] * scale)));
  } else if (!root.getAttribute('width') || !root.getAttribute('height')) {
    root.setAttribute('width', String(SVG_RASTER_EDGE));
    root.setAttribute('height', String(SVG_RASTER_EDGE));
  }
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(root);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

/** `Blob.arrayBuffer`, with a `FileReader` fallback for older engines. */
function readBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Validates a picked logo and returns a blob that is safe to decode. */
export async function inspectLogoFile(file: Blob): Promise<InspectLogoResult> {
  if (file.size === 0) return { ok: false, error: 'empty' };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: 'tooLarge' };
  const bytes = await readBytes(file);
  const kind = sniffLogoKind(bytes);
  if (!kind) return { ok: false, error: 'unsupportedType' };
  const fingerprint = await sha256Hex(bytes);

  if (kind === 'svg') {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!clean) return { ok: false, error: 'corrupt' };
    return {
      ok: true,
      logo: {
        kind,
        blob: new Blob([clean], { type: 'image/svg+xml' }),
        fingerprint,
      },
    };
  }

  const size = readRasterDimensions(kind, bytes);
  if (!size || size.width < 1 || size.height < 1) {
    return { ok: false, error: 'corrupt' };
  }
  if (
    Math.max(size.width, size.height) > MAX_LOGO_EDGE ||
    size.width * size.height > MAX_LOGO_PIXELS
  ) {
    return { ok: false, error: 'dimensionsTooLarge' };
  }
  return {
    ok: true,
    logo: {
      kind,
      blob: new Blob([bytes as BlobPart], { type: `image/${kind}` }),
      fingerprint,
    },
  };
}
