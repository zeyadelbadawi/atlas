/**
 * Statistics Section.
 *
 * Phase 6 — an item with `metric` set resolves its displayed number LIVE
 * from `GET public/websites/:academyId/statistics` (real, Academy-scoped
 * course/student/instructor counts — never revenue, never another
 * Academy's data) instead of the freely-typed `value`. An item with no
 * `metric` keeps rendering its own `value` unchanged, so already-persisted
 * pages authored before this phase need no migration. One aggregation
 * request serves every metric-backed item in the section. A live number is
 * formatted via `toLocaleString` for the CURRENT locale (Arabic-Indic
 * digits for `ar`) — the one number this section can format correctly
 * without needing an authored `LocalizedText`, unlike `value` itself
 * (still `LocalizedText`, since an Owner may want distinct static copy per
 * language, not just a digit-shape conversion).
 */
// Direct hooks-subpath import (not the top-level `@features/public-website`
// barrel) — that barrel re-exports components which import `@features/
// website`, and this file lives inside `@features/website` itself; going
// through the full barrel would create a circular module import.
import { usePublicWebsiteStatistics } from '@hooks';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { StatisticsSectionConfig } from '@types';

export interface StatisticsSectionProps {
  readonly config: StatisticsSectionConfig;
  readonly academyId: string;
}

const NUMBER_FORMAT_LOCALE: Record<'en' | 'ar', string> = {
  en: 'en-US',
  ar: 'ar-EG',
};

export function StatisticsSection({
  config,
  academyId,
}: StatisticsSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();

  const hasLiveMetric = config.items.some((item) => !!item.metric);
  const { data: statistics } = usePublicWebsiteStatistics(
    hasLiveMetric ? academyId : undefined
  );

  const displayValue = (
    item: StatisticsSectionConfig['items'][number]
  ): string => {
    if (!item.metric) return resolveLocalizedText(item.value, locale);
    const liveValue = statistics?.[item.metric];
    return liveValue === undefined
      ? resolveLocalizedText(item.value, locale)
      : liveValue.toLocaleString(NUMBER_FORMAT_LOCALE[locale]);
  };

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-10 text-center text-3xl text-foreground`}>
          {resolveLocalizedText(config.title, locale)}
        </h2>
      ) : null}
      {/* `auto-fit`/`minmax`, not fixed `grid-cols-2 sm:grid-cols-4` — 2-3
          configured stats never stretch across 4 reserved slots, and the
          column count degrades gracefully at every width instead of
          jumping only once at `sm`. */}
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-8 text-center">
        {config.items.map((item) => (
          <div key={item.id} className="min-w-0">
            <dd
              className={`${heading} text-4xl text-[var(--website-primary-solid)]`}
              data-atlas-numeric="true"
            >
              {displayValue(item)}
            </dd>
            <dt className="mt-1 break-words text-sm text-muted-foreground">
              {resolveLocalizedText(item.label, locale)}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
