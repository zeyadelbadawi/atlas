/**
 * Manara course catalogue (Reports/THEME_3_MANARA_PLAN.md §3.11,
 * `courseCatalog`): a pick-your-course board.
 *
 * - **Filter bar**, sticky under the header: the track (category) pills,
 *   then search, level, price and sort as boxed fields, and Clear all.
 * - **Results:** a live result count with removable filters, card-shaped
 *   skeletons, and the empty / error / "launching soon" states set in type
 *   on a night tile.
 * - **Grid:** poster cards (`ManaraCourseCard`), three across from 1024px,
 *   two from 640px, one on phones.
 * - **Pagination:** numbered quiet buttons with previous / next.
 *
 * All state — search, category, filters, sort, page and URL sync — is the
 * shared `useCourseCatalog` hook, exactly as Theme 1 uses it; a search
 * typed into the Courses banner reaches it as an in-page event.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { usePublicCourseCategories } from '@hooks';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import {
  ALL,
  useCourseCatalog,
} from '@/features/website/sections/useCourseCatalog';
import { SORT_LABEL_KEYS } from '@/features/website/sections/CourseCatalogSection';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '@/features/website/constants/locale.constants';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  ManaraBlock,
  ManaraSectionHeader,
  formatManaraNumber,
} from '../manara-parts';
import { ManaraCourseCard, ManaraCourseCardSkeleton } from './ManaraCourseCard';
import '../manara-pages.css';

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly { value: string; label: string }[];
}): JSX.Element {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mnp-sr-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mn-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A statement set in type on a night tile: the empty, error and launching states. */
export function ManaraStatement({
  title,
  description,
  action,
  marker,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: JSX.Element;
  readonly marker: Record<string, string>;
}): JSX.Element {
  return (
    <div className="mn-tile mnp-statement" data-tone="night" {...marker}>
      <p className="mn-title max-w-3xl">{title}</p>
      <p className="mn-lead mn-muted">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function ManaraCourseCatalog({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'courseCatalog'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const headingId = useId();
  const controlId = useId();
  const {
    search,
    handleSearch,
    category,
    categoryName,
    handleCategory,
    level,
    handleLevel,
    pricing,
    handlePricing,
    sort,
    handleSort,
    clearFilters,
    pagination,
    data,
    isLoading,
    error,
    refetch,
    courses,
    hasActiveFilters,
  } = useCourseCatalog({ config, academyId, syncUrl: !!linkRenderer });
  const { data: categories } = usePublicCourseCategories(academyId);
  // An Academy with no published courses yet: nothing to filter, so only
  // the "launching soon" statement shows.
  const noCourses =
    !isLoading &&
    !error &&
    !hasActiveFilters &&
    data?.pagination.totalItems === 0;

  const levelOptions = [
    { value: ALL, label: t('website:renderer.courseCatalog.allLevels') },
    ...COURSE_LEVEL_VALUES.map((value) => ({
      value,
      label: t(`website:renderer.courseDetails.level.${value}`),
    })),
  ];
  const pricingOptions = [
    { value: ALL, label: t('website:renderer.courseCatalog.allPricing') },
    { value: 'free', label: t('website:renderer.courseCatalog.free') },
    { value: 'paid', label: t('website:renderer.courseCatalog.paid') },
  ];
  const sortOptions = COURSE_CATALOG_SORT_VALUES.map((value) => ({
    value,
    label: t(SORT_LABEL_KEYS[value]),
  }));
  const categoryList = categories ?? [];
  const title = resolveLocalizedText(config.title, locale);
  const hasFieldControls =
    config.showSearch ||
    config.showLevelFilter ||
    config.showPricingFilter ||
    config.showSort;

  // Removable entries for everything that narrows the board.
  const active: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    active.push({
      key: 'search',
      label: `“${search.trim()}”`,
      clear: () => handleSearch(''),
    });
  }
  if (category) {
    active.push({
      key: 'category',
      label: categoryName ?? t('website:renderer.courseCatalog.categoryFilter'),
      clear: () => handleCategory(undefined),
    });
  }
  if (level !== ALL) {
    active.push({
      key: 'level',
      label: t(`website:renderer.courseDetails.level.${level}`),
      clear: () => handleLevel(ALL),
    });
  }
  if (pricing !== ALL) {
    active.push({
      key: 'pricing',
      label: t(`website:renderer.courseCatalog.${pricing}`),
      clear: () => handlePricing(ALL),
    });
  }

  const PrevIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <ManaraBlock labelledBy={title ? headingId : undefined}>
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />

      {noCourses ? null : (
        <div
          role="group"
          aria-label={t('website:manara.pages.catalog.filters')}
          data-manara-catalog-toolbar=""
          className="mnp-filterbar"
        >
          {categoryList.length >= 2 ? (
            <div
              role="group"
              aria-label={t('website:manara.pages.catalog.categories')}
              className="mnp-pill-rail"
            >
              <button
                type="button"
                aria-pressed={!category}
                onClick={() => handleCategory(undefined)}
                className="mnp-filter-pill"
              >
                {t('website:manara.pages.catalog.allCategories')}
              </button>
              {categoryList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() =>
                    handleCategory(category === item.id ? undefined : item.id)
                  }
                  className="mnp-filter-pill"
                >
                  <span dir="auto">{item.name}</span>
                  <span className="mnp-count" data-atlas-numeric="true">
                    {formatManaraNumber(item.courseCount, locale)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {hasFieldControls ? (
            <div className="mnp-filter-fields">
              {config.showSearch ? (
                <div role="search" className="min-w-0">
                  <label
                    htmlFor={`${controlId}-search`}
                    className="mnp-sr-label"
                  >
                    {t('website:renderer.courseCatalog.searchLabel')}
                  </label>
                  <input
                    id={`${controlId}-search`}
                    type="search"
                    value={search}
                    onChange={(event) => handleSearch(event.target.value)}
                    placeholder={t('website:manara.pages.search.placeholder')}
                    className="mn-input"
                    maxLength={100}
                  />
                </div>
              ) : null}
              {config.showLevelFilter ? (
                <FilterSelect
                  id={`${controlId}-level`}
                  label={t('website:renderer.courseCatalog.levelLabel')}
                  value={level}
                  onChange={handleLevel}
                  options={levelOptions}
                />
              ) : null}
              {config.showPricingFilter ? (
                <FilterSelect
                  id={`${controlId}-pricing`}
                  label={t('website:renderer.courseCatalog.pricingLabel')}
                  value={pricing}
                  onChange={handlePricing}
                  options={pricingOptions}
                />
              ) : null}
              {config.showSort ? (
                <FilterSelect
                  id={`${controlId}-sort`}
                  label={t('website:renderer.courseCatalog.sortLabel')}
                  value={sort}
                  onChange={handleSort}
                  options={sortOptions}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <div className="mnp-results">
        {/* Always mounted: a live region must exist before its text changes. */}
        <p
          role="status"
          aria-live="polite"
          className="mn-label"
          data-atlas-numeric="true"
        >
          {!isLoading && !error && data && !noCourses
            ? t('website:renderer.courseCatalog.resultCount', {
                count: data.pagination.totalItems,
              })
            : null}
        </p>
        {active.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.clear}
            className="mnp-chip"
            aria-label={t('website:manara.pages.catalog.removeFilter', {
              name: item.label,
            })}
          >
            <span dir="auto">{item.label}</span>
            <X className="size-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        ))}
        {active.length > 1 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mn-link min-h-11 px-1 text-sm"
          >
            {t('website:manara.pages.catalog.clearAll')}
          </button>
        ) : null}
      </div>

      {error ? (
        <ManaraStatement
          marker={{ 'data-catalog-error': '' }}
          title={t('website:manara.pages.catalog.errorTitle')}
          description={t('website:manara.pages.catalog.errorDescription')}
          action={
            <button
              type="button"
              className="mn-btn mn-btn-outline"
              onClick={() => void refetch()}
            >
              {t('website:manara.pages.catalog.retry')}
            </button>
          }
        />
      ) : isLoading ? (
        <div
          aria-busy="true"
          aria-label={t('website:manara.pages.catalog.loading')}
        >
          <ul className="mnp-grid">
            {Array.from({ length: Math.min(pagination.pageSize, 6) }).map(
              (_, index) => (
                <li key={index}>
                  <ManaraCourseCardSkeleton />
                </li>
              )
            )}
          </ul>
        </div>
      ) : courses.length === 0 ? (
        <ManaraStatement
          marker={{ 'data-catalog-empty': '' }}
          title={
            hasActiveFilters
              ? t('website:renderer.courseCatalog.noResults')
              : t('website:manara.pages.catalog.launchingTitle')
          }
          description={
            hasActiveFilters
              ? t('website:renderer.courseCatalog.noResultsDescription')
              : t('website:manara.pages.catalog.launchingDescription')
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                className="mn-btn mn-btn-outline"
                onClick={clearFilters}
              >
                {t('website:manara.pages.catalog.clearAll')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ol className="mnp-grid" data-manara-catalog-grid="">
            {courses.map((course) => (
              <li key={course.id} className="min-w-0">
                <ManaraCourseCard course={course} linkRenderer={linkRenderer} />
              </li>
            ))}
          </ol>
          {pagination.totalPages > 1 ? (
            <nav
              aria-label={t('website:manara.pages.catalog.pagination')}
              className="mnp-pages"
            >
              <button
                type="button"
                className="mnp-icon-btn"
                onClick={pagination.goToPreviousPage}
                disabled={!pagination.canGoPrevious}
                aria-label={t('website:manara.pages.catalog.previousPage')}
              >
                <PrevIcon className="size-5" strokeWidth={2.25} aria-hidden />
              </button>
              {pagination.entries.map((entry, index) =>
                typeof entry === 'number' ? (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => pagination.goToPage(entry)}
                    aria-current={
                      entry === pagination.page ? 'page' : undefined
                    }
                    aria-label={t('website:manara.pages.catalog.page', {
                      page: formatManaraNumber(entry, locale),
                    })}
                    className="mn-btn mn-btn-quiet mnp-page"
                    data-atlas-numeric="true"
                  >
                    {formatManaraNumber(entry, locale)}
                  </button>
                ) : (
                  <span
                    key={`gap-${index}`}
                    aria-hidden
                    className="mn-muted px-1"
                  >
                    …
                  </span>
                )
              )}
              <button
                type="button"
                className="mnp-icon-btn"
                onClick={pagination.goToNextPage}
                disabled={!pagination.canGoNext}
                aria-label={t('website:manara.pages.catalog.nextPage')}
              >
                <NextIcon className="size-5" strokeWidth={2.25} aria-hidden />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </ManaraBlock>
  );
}
