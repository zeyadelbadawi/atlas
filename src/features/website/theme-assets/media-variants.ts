/**
 * CMS phase 4 — responsive variants of an Owner's uploaded image.
 *
 * The API stores AVIF and WebP copies of every public raster upload (JPEG,
 * PNG, still WebP) at 480, 960 and 1600px, served from the image's own
 * path with `?w=<width>&f=<avif|webp>` (the narrowest stored copy at least
 * that wide, else the widest; the original bytes until the copies exist).
 * The widths here are always these three, so every page asks for the same
 * cache keys; `sizes` (the slot's layout width) lets the browser choose.
 *
 * Only an Atlas media path (`/api/v1/public/media/…`) ending in .jpg,
 * .jpeg, .png or .webp gets them — never a GIF or SVG, an external URL, a
 * `theme-asset:` reference, a data URL, or a signed link with a query.
 */
const MEDIA_RASTER_PATH =
  /^\/api\/v1\/public\/media\/[\w-]+(?:\/[\w-]+)*\.(?:jpe?g|png|webp)$/;

export const MEDIA_VARIANT_WIDTHS = [480, 960, 1600] as const;

/** The `srcset` of one format's variants, or `null` for a value that has none. */
export function mediaVariantSrcSet(
  value: string,
  format: 'avif' | 'webp'
): string | null {
  if (!MEDIA_RASTER_PATH.test(value)) return null;
  return MEDIA_VARIANT_WIDTHS.map(
    (width) => `${value}?w=${width}&f=${format} ${width}w`
  ).join(', ');
}
