/**
 * Features Section.
 */
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { resolveFeatureIcon } from '../utils/feature-icons';
import type { FeaturesSectionConfig } from '@types';

export interface FeaturesSectionProps {
  readonly config: FeaturesSectionConfig;
}

export function FeaturesSection({ config }: FeaturesSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();

  return (
    <section className={`${container} ${section}`}>
      {(config.title || config.description) && (
        <div className="mb-10 space-y-2 text-center">
          {config.title ? <h2 className={`${heading} text-3xl text-foreground`}>{config.title}</h2> : null}
          {config.description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">{config.description}</p>
          ) : null}
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {config.items.map((item) => {
          const Icon = resolveFeatureIcon(item.icon);
          return (
            <div key={item.id} className={cardClass}>
              <Icon className="size-6 text-[var(--website-primary-solid)]" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-3 font-medium text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
