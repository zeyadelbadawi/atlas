/**
 * Riwaq course catalogue (plan §4, `courseCatalog`): a faceted prospectus.
 *
 * - **Desktop:** a sticky filter panel in the start columns (search,
 *   departments, level, price, sort); the results beside it as programme
 *   sheets (ruled rows), with a live count, removable filters and
 *   numbered pagination.
 * - **Phones and tablets:** a "Filters" button opens the same panel as a
 *   bottom sheet (Radix Dialog: focus trapped, Escape closes, focus
 *   returns); the active-filter count sits on the button.
 * - Empty, error and "opening soon" states as ruled statement cells.
 *
 * All state — search, category, filters, sort, page and URL sync — is the
 * shared `useCourseCatalog` hook, exactly as Themes 1–3 use it; a search
 * typed into the Courses plate reaches it as an in-page event.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDisclosure, usePublicCourseCategories } from '@hooks';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import type { PublicCourseCategory } from '@types';
import { ALL, useCourseCatalog } from '@/features/website/sections/useCourseCatalog';
import { SORT_LABEL_KEYS } from '@/features/website/sections/CourseCatalogSection';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '@/features/website/constants/locale.constants';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqBand, RiwaqSectionHead, formatRiwaqNumber } from '../riwaq-parts';
import { RiwaqCourseSheet, RiwaqCourseSheetSkeleton } from './RiwaqCourseSheet';
import '../riwaq-pages.css';

type Catalog = ReturnType<typeof useCourseCatalog>;

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
    <div className="rwp-field">
      <label htmlFor={id} className="rw-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rw-input"
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

/** The filter panel: rendered in the desktop column and inside the phone sheet. */
function FilterPanel({
  catalog,
  config,
  categories,
}: {
  readonly catalog: Catalog;
  readonly config: SectionRenderProps<'courseCatalog'>['config'];
  readonly categories: readonly PublicCourseCategory[];
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const id = useId();
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
  return (
    <div className="rwp-panel">
      {config.showSearch ? (
        <div role="search" className="rwp-field">
          <label htmlFor={`${id}-search`} className="rw-label">
            {t('website:renderer.courseCatalog.searchLabel')}
          </label>
          <input
            id={`${id}-search`}
            type="search"
            value={catalog.search}
            onChange={(event) => catalog.handleSearch(event.target.value)}
            placeholder={t('website:riwaq.pages.search.placeholder')}
            className="rw-input"
            maxLength={100}
          />
        </div>
      ) : null}
      {categories.length >= 2 ? (
        <fieldset className="rwp-field rwp-departments">
          <legend className="rw-label">{t('website:riwaq.pages.catalog.departments')}</legend>
          <ul>
            <li>
              <button
                type="button"
                aria-pressed={!catalog.category}
                onClick={() => catalog.handleCategory(undefined)}
                className="rwp-dept"
              >
                {t('website:riwaq.pages.catalog.allDepartments')}
              </button>
            </li>
            {categories.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={catalog.category === item.id}
                  onClick={() =>
                    catalog.handleCategory(catalog.category === item.id ? undefined : item.id)
                  }
                  className="rwp-dept"
                >
                  <span dir="auto">{item.name}</span>
                  <span className="rw-num rwp-dept-count">
                    {formatRiwaqNumber(item.courseCount ?? 0, locale)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      {config.showLevelFilter ? (
        <FilterSelect
          id={`${id}-level`}
          label={t('website:renderer.courseCatalog.levelLabel')}
          value={catalog.level}
          onChange={catalog.handleLevel}
          options={levelOptions}
        />
      ) : null}
      {config.showPricingFilter ? (
        <FilterSelect
          id={`${id}-pricing`}
          label={t('website:renderer.courseCatalog.pricingLabel')}
          value={catalog.pricing}
          onChange={catalog.handlePricing}
          options={pricingOptions}
        />
      ) : null}
      {config.showSort ? (
        <FilterSelect
          id={`${id}-sort`}
          label={t('website:renderer.courseCatalog.sortLabel')}
          value={catalog.sort}
          onChange={catalog.handleSort}
          options={sortOptions}
        />
      ) : null}
    </div>
  );
}

/** A ruled statement: the empty, error and opening-soon states. */
export function RiwaqStatement({
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
    <div className="rw-cell rwp-statement" data-tick="" {...marker}>
      <p className="rw-title">{title}</p>
      <p className="rw-lead">{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function RiwaqCourseCatalog({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'courseCatalog'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const headingId = useId();
  const sheet = useDisclosure();
  const catalog = useCourseCatalog({ config, academyId, syncUrl: !!linkRenderer });
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
    clearFilters,
    pagination,
    data,
    isLoading,
    error,
    refetch,
    courses,
    hasActiveFilters,
  } = catalog;
  const { data: categoryData } = usePublicCourseCategories(academyId);
  const categories = categoryData ?? [];
  const noCourses =
    !isLoading && !error && !hasActiveFilters && data?.pagination.totalItems === 0;
  const title = resolveLocalizedText(config.title, locale);
  const hasPanel =
    config.showSearch ||
    config.showLevelFilter ||
    config.showPricingFilter ||
    config.showSort ||
    categories.length >= 2;

  const active: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) {
    active.push({ key: 'search', label: `“${search.trim()}”`, clear: () => handleSearch('') });
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
  const showPanel = hasPanel && !noCourses;

  let results: JSX.Element;
  if (error) {
    results = (
      <RiwaqStatement
        marker={{ 'data-catalog-error': '' }}
        title={t('website:riwaq.pages.catalog.errorTitle')}
        description={t('website:riwaq.pages.catalog.errorDescription')}
        action={
          <button type="button" className="rw-btn rw-btn-line" onClick={() => void refetch()}>
            {t('website:riwaq.pages.catalog.retry')}
          </button>
        }
      />
    );
  } else if (isLoading) {
    results = (
      <div aria-busy="true" aria-label={t('website:riwaq.pages.catalog.loading')}>
        <ul className="rwp-sheets">
          {Array.from({ length: Math.min(pagination.pageSize, 4) }).map((_, index) => (
            <li key={index}>
              <RiwaqCourseSheetSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (courses.length === 0) {
    results = (
      <RiwaqStatement
        marker={{ 'data-catalog-empty': '' }}
        title={
          hasActiveFilters
            ? t('website:renderer.courseCatalog.noResults')
            : t('website:riwaq.pages.catalog.launchingTitle')
        }
        description={
          hasActiveFilters
            ? t('website:renderer.courseCatalog.noResultsDescription')
            : t('website:riwaq.pages.catalog.launchingDescription')
        }
        action={
          hasActiveFilters ? (
            <button type="button" className="rw-btn rw-btn-line" onClick={clearFilters}>
              {t('website:riwaq.pages.catalog.clearAll')}
            </button>
          ) : undefined
        }
      />
    );
  } else {
    results = (
      <>
        <ol className="rwp-sheets" data-riwaq-catalog-list="">
          {courses.map((course) => (
            <li key={course.id} className="min-w-0">
              <RiwaqCourseSheet course={course} linkRenderer={linkRenderer} />
            </li>
          ))}
        </ol>
        {pagination.totalPages > 1 ? (
          <nav aria-label={t('website:riwaq.pages.catalog.pagination')} className="rwp-pages">
            <button
              type="button"
              className="rwp-page"
              onClick={pagination.goToPreviousPage}
              disabled={!pagination.canGoPrevious}
              aria-label={t('website:riwaq.pages.catalog.previousPage')}
            >
              <PrevIcon className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
            {pagination.entries.map((entry, index) =>
              typeof entry === 'number' ? (
                <button
                  key={entry}
                  type="button"
                  onClick={() => pagination.goToPage(entry)}
                  aria-current={entry === pagination.page ? 'page' : undefined}
                  aria-label={t('website:riwaq.pages.catalog.page', {
                    page: formatRiwaqNumber(entry, locale),
                  })}
                  className="rwp-page rw-num"
                >
                  {formatRiwaqNumber(entry, locale)}
                </button>
              ) : (
                <span key={`gap-${index}`} aria-hidden className="rw-muted px-1">
                  …
                </span>
              )
            )}
            <button
              type="button"
              className="rwp-page"
              onClick={pagination.goToNextPage}
              disabled={!pagination.canGoNext}
              aria-label={t('website:riwaq.pages.catalog.nextPage')}
            >
              <NextIcon className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          </nav>
        ) : null}
      </>
    );
  }

  return (
    <RiwaqBand labelledBy={title ? headingId : undefined} label={title ? undefined : t('website:riwaq.pages.catalog.label')}>
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <div className="rw-grid rwp-catalog" data-panel={showPanel ? '' : undefined}>
        {showPanel ? (
          <aside
            aria-label={t('website:riwaq.pages.catalog.filters')}
            className="rwp-catalog-aside"
            data-riwaq-catalog-panel=""
          >
            <FilterPanel catalog={catalog} config={config} categories={categories} />
          </aside>
        ) : null}
        <div className="rwp-catalog-main">
          <div className="rwp-results">
            {showPanel ? (
              <Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
                <SheetTrigger asChild>
                  <button type="button" className="rw-btn rw-btn-line rwp-filters-btn">
                    <SlidersHorizontal className="size-4" strokeWidth={1.75} aria-hidden />
                    {t('website:riwaq.pages.catalog.filters')}
                    {active.length > 0 ? (
                      <span className="rw-badge rw-num">{formatRiwaqNumber(active.length, locale)}</span>
                    ) : null}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  dir={direction}
                  data-ground="porcelain"
                  className="rwc-sheet motion-reduce:!animate-none [&>button:last-child]:hidden"
                >
                  <div className="rwc-sheet-head">
                    <SheetTitle className="rw-label" data-mark="">
                      {t('website:riwaq.pages.catalog.filters')}
                    </SheetTitle>
                    <SheetClose className="rwc-menu-btn" aria-label={t('website:riwaq.pages.catalog.closeFilters')}>
                      <X className="size-5" strokeWidth={1.75} aria-hidden />
                    </SheetClose>
                  </div>
                  <FilterPanel catalog={catalog} config={config} categories={categories} />
                  <div className="rwc-sheet-foot">
                    <SheetClose className="rw-btn rw-btn-lg w-full">
                      {data && !isLoading
                        ? t('website:riwaq.pages.catalog.showResults', {
                            count: data.pagination.totalItems,
                          })
                        : t('website:riwaq.pages.catalog.done')}
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
            {/* Always mounted: a live region must exist before its text changes. */}
            <p role="status" aria-live="polite" className="rw-label rw-num">
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
                className="rw-chip rwp-active"
                aria-label={t('website:riwaq.pages.catalog.removeFilter', { name: item.label })}
              >
                <span dir="auto">{item.label}</span>
                <X className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
            ))}
            {active.length > 1 ? (
              <button type="button" onClick={clearFilters} className="rw-link text-sm">
                {t('website:riwaq.pages.catalog.clearAll')}
              </button>
            ) : null}
          </div>
          {results}
        </div>
      </div>
    </RiwaqBand>
  );
}
