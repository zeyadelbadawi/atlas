/**
 * Gallery Section.
 */
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { GallerySectionConfig } from '@types';

export interface GallerySectionProps {
  readonly config: GallerySectionConfig;
}

export function GallerySection({ config }: GallerySectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {config.images.map((image) => (
          <figure key={image.id} className="space-y-1.5">
            <img
              src={image.image}
              alt={image.imageAlt ?? image.caption ?? ''}
              className="aspect-square w-full object-cover"
              style={{ borderRadius: 'var(--website-radius)' }}
            />
            {image.caption ? (
              <figcaption className="text-xs text-muted-foreground">{image.caption}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
