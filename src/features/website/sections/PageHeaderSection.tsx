/**
 * Page Header Section (Theme 1 plan §D.2) — an inner page's title band.
 *
 * The base renderer draws the eyebrow, title, description and optional
 * image with the shared website tokens. `search` (courses/FAQ) is honoured
 * by theme renderers that design it; the base band stays text-only.
 */
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { PageHeaderSectionConfig } from '@types';

export interface PageHeaderSectionProps {
  readonly config: PageHeaderSectionConfig;
}

export function PageHeaderSection({
  config,
}: PageHeaderSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      <div
        className={`grid items-center gap-8 ${config.image ? 'md:grid-cols-2' : ''}`}
      >
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-sm font-medium text-[var(--website-primary-solid)]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`${heading} break-words text-4xl text-foreground md:text-5xl`}
          >
            {resolveLocalizedText(config.title, locale)}
          </h1>
          {description ? (
            <p className="max-w-2xl text-lg text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {config.image ? (
          <img
            src={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            className="aspect-[4/3] w-full object-cover"
            style={{ borderRadius: 'var(--website-radius)' }}
          />
        ) : null}
      </div>
    </section>
  );
}
