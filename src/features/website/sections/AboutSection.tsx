/**
 * About Section.
 */
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { AboutSectionConfig } from '@types';

export interface AboutSectionProps {
  readonly config: AboutSectionConfig;
}

export function AboutSection({ config }: AboutSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();

  return (
    <section className={`${container} ${section}`}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {config.image ? (
          <img
            src={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            className="aspect-[4/3] w-full object-cover"
            style={{ borderRadius: 'var(--website-radius)' }}
          />
        ) : null}
        <div className="space-y-4">
          <h2 className={`${heading} text-3xl text-foreground`}>{resolveLocalizedText(config.title, locale)}</h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {resolveLocalizedText(config.body, locale)}
          </p>
        </div>
      </div>
    </section>
  );
}
