/**
 * Theme 1 course catalog (plan §C.2): the Courses page's listing.
 *
 * - **Sticky toolbar** (under the header): category chips, then level,
 *   price and sort. On phones the chips scroll sideways and the other
 *   filters open in a sheet.
 * - **Results:** a live result count, removable filter chips with
 *   "Clear all", skeletons shaped like the cards, and designed empty and
 *   error states.
 * - **Grid:** the Theme 1 course card (1 / 2 / 3 columns).
 * - **Pagination:** accessible page links.
 *
 * All state — search, category, filters, sort, page and URL sync — is the
 * shared `useCourseCatalog` hook, so the behaviour is exactly the base
 * catalog's. The Courses hero's search reaches it as an in-page event.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@utils';
import { usePublicCourseCategories } from '@hooks';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import { ALL, useCourseCatalog } from '../sections/useCourseCatalog';
import { SORT_LABEL_KEYS } from '../sections/CourseCatalogSection';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '../constants/locale.constants';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { T1Section, T1SectionHeader, formatT1Number } from './t1-parts';
import { T1CourseCard, T1CourseCardSkeleton } from './T1CourseCard';

const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

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
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-[var(--website-foreground-muted)]"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="t1-input t1-select min-h-11 pe-10 text-sm"
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

export function T1CourseCatalog({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'courseCatalog'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const headingId = useId();
  const controlId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const catalog = useCourseCatalog({
    config,
    academyId,
    syncUrl: !!linkRenderer,
  });
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
  } = catalog;
  const { data: categories } = usePublicCourseCategories(academyId);
  // An Academy with no published courses yet: nothing to filter, so only
  // the "launching soon" panel shows.
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

  const filters = (prefix: string) => (
    <>
      {config.showLevelFilter ? (
        <FilterSelect
          id={`${controlId}-${prefix}-level`}
          label={t('website:renderer.courseCatalog.levelLabel')}
          value={level}
          onChange={handleLevel}
          options={levelOptions}
        />
      ) : null}
      {config.showPricingFilter ? (
        <FilterSelect
          id={`${controlId}-${prefix}-pricing`}
          label={t('website:renderer.courseCatalog.pricingLabel')}
          value={pricing}
          onChange={handlePricing}
          options={pricingOptions}
        />
      ) : null}
      {config.showSort ? (
        <FilterSelect
          id={`${controlId}-${prefix}-sort`}
          label={t('website:renderer.courseCatalog.sortLabel')}
          value={sort}
          onChange={handleSort}
          options={sortOptions}
        />
      ) : null}
    </>
  );
  const hasFilterControls =
    config.showLevelFilter || config.showPricingFilter || config.showSort;
  const activeFilterCount = (level !== ALL ? 1 : 0) + (pricing !== ALL ? 1 : 0);
  const categoryList = categories ?? [];
  const title = resolveLocalizedText(config.title, locale);

  // Removable chips for everything that narrows the list.
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
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />

      {/* The toolbar stays under the sticky header while the list scrolls. */}
      {noCourses ? null : (
        <div
          data-t1-catalog-toolbar=""
          className="sticky top-[var(--t1-header-height)] z-20 -mx-4 mb-6 border-b border-[var(--website-border)] bg-[var(--website-background)] px-4 pb-4 pt-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {categoryList.length >= 2 ? (
            <div
              role="group"
              aria-label={t('website:theme1.catalog.categories')}
              className="t1-chip-rail mb-3"
            >
              <button
                type="button"
                aria-pressed={!category}
                onClick={() => handleCategory(undefined)}
                className="t1-filter-chip"
              >
                {t('website:theme1.catalog.allCategories')}
              </button>
              {categoryList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() =>
                    handleCategory(category === item.id ? undefined : item.id)
                  }
                  className="t1-filter-chip"
                >
                  <span dir="auto">{item.name}</span>
                  <span
                    className="t1-filter-chip-count"
                    data-atlas-numeric="true"
                  >
                    {formatT1Number(item.courseCount, locale)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-3">
            {config.showSearch ? (
              <div
                role="search"
                className="relative min-w-0 flex-1 md:max-w-sm"
              >
                <label htmlFor={`${controlId}-search`} className="sr-only">
                  {t('website:renderer.courseCatalog.searchLabel')}
                </label>
                <Search
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--website-foreground-muted)]"
                  aria-hidden
                />
                <input
                  id={`${controlId}-search`}
                  type="search"
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder={t('website:renderer.courseCatalog.searchLabel')}
                  className="t1-input min-h-11 ps-10 text-sm"
                  maxLength={100}
                />
              </div>
            ) : (
              <div className="flex-1 md:hidden" />
            )}

            {hasFilterControls ? (
              <>
                <div className="hidden flex-1 items-end justify-end gap-3 md:flex [&>*]:w-44">
                  {filters('bar')}
                </div>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="t1-btn-secondary min-h-11 shrink-0 md:hidden"
                    >
                      <SlidersHorizontal className="size-4" aria-hidden />
                      {t('website:theme1.catalog.filters')}
                      {activeFilterCount > 0 ? (
                        <span className="t1-filter-chip-count">
                          {formatT1Number(activeFilterCount, locale)}
                        </span>
                      ) : null}
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    dir={direction}
                    className="rounded-t-[24px] bg-[var(--website-background)] px-5 pb-8 pt-6 text-[var(--website-foreground)]"
                  >
                    <SheetTitle className="font-display text-lg font-bold">
                      {t('website:theme1.catalog.filters')}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      {t('website:theme1.catalog.filtersDescription')}
                    </SheetDescription>
                    <div className="mt-5 grid gap-4">{filters('sheet')}</div>
                    <button
                      type="button"
                      className="t1-cta t1-btn-lg mt-6 w-full"
                      onClick={() => setSheetOpen(false)}
                      data-atlas-numeric="true"
                    >
                      {data
                        ? t('website:theme1.catalog.showResults', {
                            count: data.pagination.totalItems,
                            formatted: formatT1Number(
                              data.pagination.totalItems,
                              locale
                            ),
                          })
                        : t('website:theme1.catalog.close')}
                    </button>
                  </SheetContent>
                </Sheet>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex flex-wrap items-center gap-2',
          !noCourses && 'mb-6'
        )}
      >
        {/* Always mounted: a live region must exist before its text changes. */}
        <p
          role="status"
          aria-live="polite"
          className="me-2 text-sm font-semibold text-[var(--website-foreground)]"
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
            className="t1-filter-chip"
            aria-label={t('website:theme1.catalog.removeFilter', {
              name: item.label,
            })}
          >
            <span dir="auto">{item.label}</span>
            <X className="size-3.5" aria-hidden />
          </button>
        ))}
        {active.length > 1 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="t1-link min-h-8 text-sm"
          >
            {t('website:theme1.catalog.clearAll')}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="t1-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <p className="font-display text-xl font-bold">
            {t('website:theme1.catalog.errorTitle')}
          </p>
          <p className="text-[var(--website-foreground-muted)]">
            {t('website:theme1.catalog.errorDescription')}
          </p>
          <button
            type="button"
            className="t1-btn-secondary"
            onClick={() => void refetch()}
          >
            <RotateCw className="size-4" aria-hidden />
            {t('website:theme1.catalog.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <div className={GRID}>
          {Array.from({ length: Math.min(pagination.pageSize, 6) }).map(
            (_, index) => (
              <T1CourseCardSkeleton key={index} />
            )
          )}
        </div>
      ) : courses.length === 0 ? (
        <div
          data-catalog-empty=""
          className="t1-card flex flex-col items-center gap-4 px-6 py-14 text-center"
        >
          <span className="t1-icon-tile size-14 rounded-full">
            <SearchX className="size-6" aria-hidden />
          </span>
          <p className="font-display text-xl font-bold">
            {hasActiveFilters
              ? t('website:renderer.courseCatalog.noResults')
              : t('website:theme1.courses.launchingTitle')}
          </p>
          <p className="max-w-md text-[var(--website-foreground-muted)]">
            {hasActiveFilters
              ? t('website:renderer.courseCatalog.noResultsDescription')
              : t('website:theme1.courses.launchingDescription')}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="t1-btn-secondary"
              onClick={clearFilters}
            >
              {t('website:theme1.catalog.clearAll')}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className={GRID}>
            {courses.map((course) => (
              <li key={course.id}>
                <T1CourseCard course={course} linkRenderer={linkRenderer} />
              </li>
            ))}
          </ul>
          {pagination.totalPages > 1 ? (
            <nav
              aria-label={t('website:theme1.catalog.pagination')}
              className="mt-10 flex items-center justify-center gap-2"
            >
              <button
                type="button"
                className="t1-btn-secondary size-11 !px-0"
                onClick={pagination.goToPreviousPage}
                disabled={!pagination.canGoPrevious}
                aria-label={t('website:theme1.catalog.previousPage')}
              >
                <PrevIcon className="size-5" aria-hidden />
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
                    aria-label={t('website:theme1.catalog.page', {
                      page: formatT1Number(entry, locale),
                    })}
                    className={cn(
                      'min-h-11 min-w-11 rounded-[var(--t1-radius-control)] px-3 text-sm font-semibold',
                      entry === pagination.page
                        ? 'bg-[var(--website-cta)] text-[var(--website-cta-foreground)]'
                        : 't1-btn-secondary'
                    )}
                    data-atlas-numeric="true"
                  >
                    {formatT1Number(entry, locale)}
                  </button>
                ) : (
                  <span
                    key={`gap-${index}`}
                    aria-hidden
                    className="px-1 text-[var(--website-foreground-muted)]"
                  >
                    …
                  </span>
                )
              )}
              <button
                type="button"
                className="t1-btn-secondary size-11 !px-0"
                onClick={pagination.goToNextPage}
                disabled={!pagination.canGoNext}
                aria-label={t('website:theme1.catalog.nextPage')}
              >
                <NextIcon className="size-5" aria-hidden />
              </button>
            </nav>
          ) : null}
        </>
      )}
    </T1Section>
  );
}
