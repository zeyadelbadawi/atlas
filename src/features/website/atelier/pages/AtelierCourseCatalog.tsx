/**
 * Atelier course catalog (Reports/THEME_2_ATELIER_PLAN.md §5a,
 * `courseCatalog`): an editorial index.
 *
 * - **Filters** as a quiet small-caps bar: categories as text toggles, then
 *   search, level, price and sort as underlined fields with labels above.
 * - **Results:** a live result count, removable filters with "Clear all",
 *   row-shaped skeletons, and empty / error / launching states set in type.
 * - **Index:** numbered course rows (`AtelierCourseRow`).
 * - **Pagination:** numbered page controls with previous / next.
 *
 * All state — search, category, filters, sort, page and URL sync — is the
 * shared `useCourseCatalog` hook, exactly as Theme 1 uses it; a search
 * typed into the Courses masthead reaches it as an in-page event.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@utils';
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
  AtelierChapter,
  AtelierSectionHeader,
  formatAtelierIndex,
  formatAtelierNumber,
} from '../atelier-parts';
import { AtelierCourseRow, AtelierCourseRowSkeleton } from './AtelierCourseRow';
import '../atelier-pages.css';

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
      <label htmlFor={id} className="atp-field-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="atp-field"
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

/** A statement set in type: the empty, error and launching states. */
function Statement({
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
    <div className="atp-statement" {...marker}>
      <p className="at-subtitle max-w-3xl">{title}</p>
      <p className="at-lead mt-4">{description}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

export function AtelierCourseCatalog({
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
  // the "in preparation" statement shows.
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

  // Removable entries for everything that narrows the index.
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
  const firstIndex = (pagination.page - 1) * pagination.pageSize;

  return (
    <AtelierChapter labelledBy={title ? headingId : undefined}>
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        numbered={false}
        layout="split"
      />

      {noCourses ? null : (
        <div
          role="group"
          aria-label={t('website:atelier.pages.catalog.filters')}
          data-atelier-catalog-toolbar=""
          className="atp-filterbar mb-6"
        >
          {categoryList.length >= 2 ? (
            <div
              role="group"
              aria-label={t('website:atelier.pages.catalog.categories')}
              className="atp-category-rail"
            >
              <button
                type="button"
                aria-pressed={!category}
                onClick={() => handleCategory(undefined)}
                className="atp-text-btn"
              >
                {t('website:atelier.pages.catalog.allCategories')}
              </button>
              {categoryList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() =>
                    handleCategory(category === item.id ? undefined : item.id)
                  }
                  className="atp-text-btn"
                >
                  <span dir="auto">{item.name}</span>
                  <span className="atp-count" data-atlas-numeric="true">
                    {formatAtelierNumber(item.courseCount, locale)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {hasFieldControls ? (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
              {config.showSearch ? (
                <div
                  role="search"
                  className="min-w-0 sm:col-span-2 lg:col-span-1"
                >
                  <label
                    htmlFor={`${controlId}-search`}
                    className="atp-field-label"
                  >
                    {t('website:renderer.courseCatalog.searchLabel')}
                  </label>
                  <input
                    id={`${controlId}-search`}
                    type="search"
                    value={search}
                    onChange={(event) => handleSearch(event.target.value)}
                    placeholder={t('website:atelier.pages.search.placeholder')}
                    className="atp-field"
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

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-6',
          !noCourses && 'mb-4'
        )}
      >
        {/* Always mounted: a live region must exist before its text changes. */}
        <p
          role="status"
          aria-live="polite"
          className="at-label text-[var(--atelier-text)]"
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
            className="atp-text-btn text-[var(--atelier-text)]"
            aria-label={t('website:atelier.pages.catalog.removeFilter', {
              name: item.label,
            })}
          >
            <span dir="auto">{item.label}</span>
            <X className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
        ))}
        {active.length > 1 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="at-link text-sm"
          >
            {t('website:atelier.pages.catalog.clearAll')}
          </button>
        ) : null}
      </div>

      {error ? (
        <Statement
          marker={{ 'data-catalog-error': '' }}
          title={t('website:atelier.pages.catalog.errorTitle')}
          description={t('website:atelier.pages.catalog.errorDescription')}
          action={
            <button
              type="button"
              className="at-btn-ghost"
              onClick={() => void refetch()}
            >
              {t('website:atelier.pages.catalog.retry')}
            </button>
          }
        />
      ) : isLoading ? (
        <div
          aria-busy="true"
          aria-label={t('website:atelier.pages.catalog.loading')}
        >
          <ul className="atp-index">
            {Array.from({ length: Math.min(pagination.pageSize, 5) }).map(
              (_, index) => (
                <li key={index}>
                  <AtelierCourseRowSkeleton />
                </li>
              )
            )}
          </ul>
        </div>
      ) : courses.length === 0 ? (
        <Statement
          marker={{ 'data-catalog-empty': '' }}
          title={
            hasActiveFilters
              ? t('website:renderer.courseCatalog.noResults')
              : t('website:atelier.pages.catalog.launchingTitle')
          }
          description={
            hasActiveFilters
              ? t('website:renderer.courseCatalog.noResultsDescription')
              : t('website:atelier.pages.catalog.launchingDescription')
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                className="at-btn-ghost"
                onClick={clearFilters}
              >
                {t('website:atelier.pages.catalog.clearAll')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ol className="atp-index">
            {courses.map((course, index) => (
              <li key={course.id}>
                <AtelierCourseRow
                  course={course}
                  index={formatAtelierIndex(firstIndex + index, locale)}
                  linkRenderer={linkRenderer}
                />
              </li>
            ))}
          </ol>
          {pagination.totalPages > 1 ? (
            <nav
              aria-label={t('website:atelier.pages.catalog.pagination')}
              className="atp-pages mt-12"
            >
              <button
                type="button"
                className="atp-icon-btn"
                onClick={pagination.goToPreviousPage}
                disabled={!pagination.canGoPrevious}
                aria-label={t('website:atelier.pages.catalog.previousPage')}
              >
                <PrevIcon className="size-5" strokeWidth={1.5} aria-hidden />
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
                    aria-label={t('website:atelier.pages.catalog.page', {
                      page: formatAtelierNumber(entry, locale),
                    })}
                    className="atp-page"
                    data-atlas-numeric="true"
                  >
                    {formatAtelierNumber(entry, locale)}
                  </button>
                ) : (
                  <span
                    key={`gap-${index}`}
                    aria-hidden
                    className="px-1 text-[var(--atelier-text-muted)]"
                  >
                    …
                  </span>
                )
              )}
              <button
                type="button"
                className="atp-icon-btn"
                onClick={pagination.goToNextPage}
                disabled={!pagination.canGoNext}
                aria-label={t('website:atelier.pages.catalog.nextPage')}
              >
                <NextIcon className="size-5" strokeWidth={1.5} aria-hidden />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </AtelierChapter>
  );
}
