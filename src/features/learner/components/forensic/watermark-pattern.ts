/**
 * The faint, full-frame tile of the forensic code.
 *
 * WHY A SECOND LAYER. The moving label is the readable trace; this is what
 * survives the obvious edits. Cropping the label out, blurring it, or
 * painting over its current position in a recording still leaves the code
 * repeated across the whole picture — removing all of it means degrading
 * every frame of the video.
 *
 * TWO TONES. Light fill with a dark hairline, both at very low opacity, so
 * the tile is faintly present on a white slide and on a dark scene alike,
 * without ever competing with the lesson.
 *
 * The code alphabet is `[0-9A-Z-]` (and the flat fallback label is escaped),
 * so nothing here can break out of the SVG.
 */
const TILE_WIDTH = 280;
const TILE_HEIGHT = 160;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** A CSS `url(...)` for the repeating tile carrying `text`. */
export function buildWatermarkPattern(text: string): string {
  const label = escapeXml(text.slice(0, 48));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}">` +
    `<g transform="rotate(-24 ${TILE_WIDTH / 2} ${TILE_HEIGHT / 2})" ` +
    `font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="15" ` +
    `font-weight="700" letter-spacing="2" text-anchor="middle">` +
    `<text x="${TILE_WIDTH / 2}" y="${TILE_HEIGHT / 2}" fill="#ffffff" fill-opacity="0.075" ` +
    `stroke="#000000" stroke-opacity="0.05" stroke-width="0.6">${label}</text>` +
    `</g></svg>`;
  // `encodeURIComponent` leaves `(`, `)` and `'` alone; stricter CSS
  // parsers reject them inside `url()`, so they are encoded too.
  const encoded = encodeURIComponent(svg).replace(
    /[()']/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `url("data:image/svg+xml,${encoded}")`;
}

export const WATERMARK_PATTERN_TILE = {
  width: TILE_WIDTH,
  height: TILE_HEIGHT,
} as const;
