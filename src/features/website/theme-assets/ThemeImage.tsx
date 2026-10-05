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
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  isThemeAssetReference,
  resolveThemeAsset,
} from './resolve-theme-asset';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';

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
    return loading ? (
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
