/**
 * Gallery Section.
 */
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { GallerySectionConfig } from '@types';

export interface GallerySectionProps {
  readonly config: GallerySectionConfig;
}

export function GallerySection({ config }: GallerySectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const title = resolveLocalizedText(config.title, locale);

  return (
    <section className={`${container} ${section}`}>
      {title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>{title}</h2>
      ) : null}
      {/* `auto-fit`/`minmax`, not fixed `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
          — see `FeaturedCoursesSection`'s identical comment for why. A
          smaller minimum than the card sections above since these are
          square image tiles, not text-bearing cards. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-4">
        {config.images.map((image) => {
          const caption = resolveLocalizedText(image.caption, locale);
          const imageAlt = resolveLocalizedText(image.imageAlt, locale) || caption;
          return (
            <figure key={image.id} className="min-w-0 space-y-1.5">
              <img
                src={image.image}
                alt={imageAlt}
                className="aspect-square w-full object-cover"
                style={{ borderRadius: 'var(--website-radius)' }}
              />
              {caption ? (
                <figcaption className="truncate text-xs text-muted-foreground">{caption}</figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
