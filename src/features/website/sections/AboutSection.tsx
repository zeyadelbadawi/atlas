/**
 * About Section.
 */
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import type { AboutSectionConfig } from '@types';

export interface AboutSectionProps {
  readonly config: AboutSectionConfig;
}

export function AboutSection({ config }: AboutSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={`${container} ${section}`}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {config.image ? (
          <img
            src={config.image}
            alt=""
            className="aspect-[4/3] w-full object-cover"
            style={{ borderRadius: 'var(--website-radius)' }}
          />
        ) : null}
        <div className="space-y-4">
          <h2 className={`${heading} text-3xl text-foreground`}>{config.title}</h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {config.body}
          </p>
        </div>
      </div>
    </section>
  );
}
