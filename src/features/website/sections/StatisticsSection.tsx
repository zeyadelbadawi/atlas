/**
 * Statistics Section.
 */
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { StatisticsSectionConfig } from '@types';

export interface StatisticsSectionProps {
  readonly config: StatisticsSectionConfig;
}

export function StatisticsSection({ config }: StatisticsSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-10 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <dl className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
        {config.items.map((item) => (
          <div key={item.id}>
            <dd
              className={`${heading} text-4xl text-[var(--website-primary-solid)]`}
              data-atlas-numeric="true"
            >
              {item.value}
            </dd>
            <dt className="mt-1 text-sm text-muted-foreground">{item.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
