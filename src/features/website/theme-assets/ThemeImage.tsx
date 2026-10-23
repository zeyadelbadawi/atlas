/**
 * ThemeImage — the one way a section draws a configurable image.
 *
 *   - `theme-asset:` references become a `<picture>` with AVIF/WebP
 *     `srcset`, intrinsic `width`/`height` (no layout shift), the LQIP as a
 *     blurred background until the file arrives, `object-position` from the
 *     manifest's focal point, and lazy loading — except the theme's priority
 *     image (the hero), which loads eagerly with `fetchpriority="high"`.
 *     The theme's own alt text is used when the section has none.
 *   - A pending or unknown reference renders `fallback` (the section's
 *     designed no-image state; nothing by default).
 *   - Any other value (MediaAsset path, URL, legacy data URL) renders the
 *     plain `<img>` sections always rendered — same attributes, so existing
 *     pages are unchanged — unless the caller opts into `loading`: then it
 *     also decodes off the main thread, and an eager (above-the-fold) image
 *     is fetched at high priority.
 *   - CMS phase 4: an uploaded raster image (an Atlas media path ending in
 *     .jpg/.jpeg/.png/.webp) is that same `<img>` inside a `<picture>`
 *     whose AVIF and WebP sources list the API's 480/960/1600px variants
 *     with the caller's `sizes` — the same `sizes` a theme asset in that
 *     slot uses (`media-variants.ts`). The `<img>` keeps the original as
 *     its `src`, for browsers that pick neither source.
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  isThemeAssetReference,
  resolveThemeAsset,
} from './resolve-theme-asset';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { mediaVariantSrcSet } from './media-variants';

export interface ThemeImageProps {
  readonly value: string | undefined;
  readonly alt: string;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** The rendered width, for choosing a `srcset` candidate. */
  readonly sizes?: string;
  readonly fallback?: ReactNode;
  /**
   * For an Owner-uploaded image (not a theme asset): `lazy` below the fold,
   * `eager` for the page's lead image. Omitted, the `<img>` is exactly as
   * before (the shared sections don't pass it).
   */
  readonly loading?: 'lazy' | 'eager';
  /**
   * For a theme asset that leads its page without being the theme's hero
   * (an inner page's plate, the Course Details plate): eager at high
   * priority, as the hero is. Omitted, the manifest decides.
   */
  readonly priority?: boolean;
}

export function ThemeImage({
  value,
  alt,
  className,
  style,
  sizes = '100vw',
  fallback = null,
  loading,
  priority = false,
}: ThemeImageProps): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!value) return <>{fallback}</>;
  if (!isThemeAssetReference(value)) {
    const image = loading ? (
      <img
        src={value}
        alt={alt}
        loading={loading}
        decoding="async"
        {...(loading === 'eager' ? { fetchpriority: 'high' } : {})}
        className={className}
        style={style}
      />
    ) : (
      <img src={value} alt={alt} className={className} style={style} />
    );
    const avif = mediaVariantSrcSet(value, 'avif');
    if (!avif) return image;
    return (
      <picture>
        <source type="image/avif" srcSet={avif} sizes={sizes} />
        <source
          type="image/webp"
          srcSet={mediaVariantSrcSet(value, 'webp')!}
          sizes={sizes}
        />
        {image}
      </picture>
    );
  }

  const asset = resolveThemeAsset(value);
  if (!asset) return <>{fallback}</>;
  const eager = asset.priority || priority;

  return (
    <picture>
      {asset.sources.map((source) => (
        <source
          key={source.type}
          type={source.type}
          srcSet={source.srcSet}
          sizes={sizes}
        />
      ))}
      <img
        src={asset.src}
        alt={alt || asset.alt[locale]}
        width={asset.width}
        height={asset.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        // React 18 forwards the lowercase attribute unchanged.
        {...{ fetchpriority: eager ? 'high' : 'auto' }}
        className={className}
        style={{
          ...style,
          objectPosition: asset.objectPosition,
          ...(asset.lqip
            ? {
                backgroundImage: `url("${asset.lqip}")`,
                backgroundSize: 'cover',
                backgroundPosition: asset.objectPosition,
              }
            : {}),
        }}
      />
    </picture>
  );
}
