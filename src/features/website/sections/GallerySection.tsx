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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {config.images.map((image) => {
          const caption = resolveLocalizedText(image.caption, locale);
          const imageAlt = resolveLocalizedText(image.imageAlt, locale) || caption;
          return (
            <figure key={image.id} className="space-y-1.5">
              <img
                src={image.image}
                alt={imageAlt}
                className="aspect-square w-full object-cover"
                style={{ borderRadius: 'var(--website-radius)' }}
              />
              {caption ? (
                <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
