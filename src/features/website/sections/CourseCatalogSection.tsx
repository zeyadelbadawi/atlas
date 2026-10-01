/**
 * Course Catalog Section (P64 Phase 4 §E.1).
 *
 * The full, filterable, server-paginated course listing an Owner drops
 * onto the `/courses` core page. `FeaturedCoursesSection` remains the small
 * fixed-size teaser; this section is the real catalog. It deliberately
 * reuses that section's every convention rather than inventing parallel
 * ones:
 *
 *   - DATA: `usePublicCourses` — the public-safe, published-only transport
 *     (see that hook's own doc comment for why the tenant-scoped
 *     `useCourses` 403s for a real visitor). The controls here map 1:1 onto
 *     what the backend public catalog already accepts and
 *     `toCollectionParams` already sends: `search`, `sortBy`/`sortDirection`,
 *     `page`/`pageSize`, and the FLAT filters `level`/`pricingType`. No
 *     client-side filtering of a partial page — every control is a query.
 *   - STYLE: website design tokens only, through the shared
 *     `useWebsite*Class` helpers; the card is the featured card plus the
 *     public list's `stats` (level, duration, lesson count, free-preview
 *     badge, rating) — see `CatalogCardBody`.
 *   - NAVIGATION: the injected `linkRenderer` (real `/courses/:id` links on
 *     the public runtime); absent it (dashboard preview) a card is the same
 *     inert `<article>` every other section renders.
 *
 * URL STATE (Theme 1 plan §D.2). On the public runtime the search, category,
 * filters, sort and page live in the query string (`catalog-url.utils.ts`
 * owns the names), so a filtered catalog can be shared, reloaded and linked
 * to — the category tiles and hero search arrive here that way. The URL is
 * REPLACED, not pushed (typing a search must not bury Back under one entry
 * per keystroke), only the catalog's own parameters are touched, and the
 * dashboard preview (no `linkRenderer`) never reads or writes the URL.
 *
 * PAGE RESET RULE. Every filter/sort/search change returns to page 1 in the
 * SAME event handler that changes it (React 18 batches both state updates
 * into one render), so a request for "page 7 of the new filter" — which
 * would be empty and strand the visitor — is never issued.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  BookOpen,
  Clock,
  PlayCircle,
  SearchX,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, SearchInput, StarRating } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { apiErrorKind } from '@api';
import { formatCoursePricing } from '@features/course';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import { ALL, useCourseCatalog } from './useCourseCatalog';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type {
  Course,
  CourseCatalogSectionConfig,
  CourseCatalogSort,
} from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CourseCatalogSectionProps {
  readonly config: CourseCatalogSectionConfig;
  readonly academyId: string;
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export const SORT_LABEL_KEYS: Record<CourseCatalogSort, string> = {
  newest: 'website:renderer.courseCatalog.sortNewest',
  title: 'website:renderer.courseCatalog.sortTitle',
  priceAsc: 'website:renderer.courseCatalog.sortPriceAsc',
  priceDesc: 'website:renderer.courseCatalog.sortPriceDesc',
};

/**
 * `1h 20m` / `12m` — the catalog's glanceable form, not the player's
 * `1:20:00` (`PlayerShell.formatDuration`), which reads as a clock time on
 * a card. Anything under a minute rounds UP to `1m` rather than showing
 * `0m` for a course that does have content; `null`/non-positive means the
 * backend has no lesson durations and the card simply omits the cell.
 */
export function formatCatalogDuration(
  seconds: number | null | undefined,
  t: TFunction
): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return t('website:renderer.courseCatalog.durationMinutes', { minutes });
  }
  if (minutes === 0) {
    return t('website:renderer.courseCatalog.durationHoursOnly', { hours });
  }
  return t('website:renderer.courseCatalog.durationHours', { hours, minutes });
}

/**
 * The responsive column tiers. Fixed tiers rather than
 * `FeaturedCoursesSection`'s `auto-fit`: a paginated catalog must keep the
 * same card width on a full page and on a short final page, and the
 * loading skeleton must occupy exactly the slots real cards will (no layout
 * shift when data lands).
 */
const GRID_CLASS = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

/** Mirrors the real card's shape (media, two title lines, meta, footer) so swapping it for content moves nothing. */
function CatalogCardSkeleton({ cardClass }: { readonly cardClass: string }) {
  return (
    <div className={`flex h-full flex-col ${cardClass}`} aria-hidden>
      <Skeleton className="mb-4 aspect-video w-full rounded-[var(--website-radius)]" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

interface CatalogCardBodyProps {
  readonly course: Course;
  readonly t: TFunction;
}

/**
 * The content of one card, identical whether wrapped by the runtime's
 * link or the preview's inert `<article>`. Every metadata cell is
 * conditional on its datum so a card never shows an empty slot, a `0m`
 * duration, or zero stars presented as a rating.
 */
function CatalogCardBody({ course, t }: CatalogCardBodyProps): JSX.Element {
  const stats = course.stats;
  const duration = formatCatalogDuration(stats?.durationSeconds, t);
  const lessons = stats?.totalLessons ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;
  const averageRating = stats?.averageRating ?? 0;
  const hasRating = totalReviews > 0;
  const instructor = course.instructors[0]?.name;
  const hasMeta = Boolean(course.level) || duration !== null || lessons > 0;

  return (
    <>
      <div className="relative mb-4">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt=""
            loading="lazy"
            className="aspect-video w-full object-cover"
            style={{ borderRadius: 'var(--website-radius)' }}
          />
        ) : (
          <div
            className="flex aspect-video w-full items-center justify-center bg-[var(--website-primary-surface)]"
            style={{ borderRadius: 'var(--website-radius)' }}
          >
            <BookOpen
              className="size-8 text-[var(--website-primary-solid)]"
              aria-hidden
            />
          </div>
        )}
        {stats?.hasPreview ? (
          // Overlaid on the media (it is a property of the content, like a
          // "trailer" sticker) on an opaque card-coloured chip so it stays
          // legible over any thumbnail; text, never colour, carries it.
          <Badge
            variant="secondary"
            className="absolute start-2 top-2 gap-1 border border-border/60 bg-card text-foreground shadow-sm"
          >
            <PlayCircle className="size-3.5" aria-hidden />
            {t('website:renderer.courseDetails.previewBadge')}
          </Badge>
        ) : null}
      </div>

      {/* `dir="auto"`: single-language, Owner-typed strings —
          see `FeaturedCoursesSection`'s identical comment. */}
      <h3 className="line-clamp-2 font-medium text-foreground" dir="auto">
        {course.title}
      </h3>
      {course.shortDescription ? (
        <p
          className="mt-1 line-clamp-2 text-sm text-muted-foreground"
          dir="auto"
        >
          {course.shortDescription}
        </p>
      ) : null}

      {hasMeta ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground"
          data-atlas-numeric="true"
        >
          {course.level ? (
            <Badge variant="secondary" className="shrink-0">
              {t(`website:renderer.courseDetails.level.${course.level}`)}
            </Badge>
          ) : null}
          {duration !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">
                {t('website:renderer.courseCatalog.durationLabel')}:{' '}
              </span>
              {duration}
            </span>
          ) : null}
          {lessons > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <PlayCircle className="size-4 shrink-0" aria-hidden />
              {t('website:renderer.courseDetails.lessonCount', {
                count: lessons,
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      {hasRating ? (
        <div
          className="mt-3 flex items-center gap-2 text-sm"
          data-atlas-numeric="true"
        >
          <StarRating
            value={averageRating}
            size="sm"
            label={t('website:renderer.courseDetails.ratingLabel', {
              rating: averageRating.toFixed(1),
            })}
          />
          <span className="font-medium text-foreground" aria-hidden>
            {averageRating.toFixed(1)}
          </span>
          {/* The visible "(12)" is the sighted shorthand; AT gets the full
              plural phrase instead of a bare parenthesised number. */}
          <span className="text-muted-foreground" aria-hidden>
            ({totalReviews})
          </span>
          <span className="sr-only">
            {t('website:renderer.courseDetails.reviewCount', {
              count: totalReviews,
            })}
          </span>
        </div>
      ) : null}

      {/* `mt-auto` pins price/instructor to the card's bottom edge so a
          row of cards with different description lengths still aligns. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
        {instructor ? (
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground"
            dir="auto"
          >
            <UserRound className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">
              {t('website:renderer.courseCatalog.instructorLabel')}:{' '}
            </span>
            <span className="truncate">{instructor}</span>
          </span>
        ) : (
          <span />
        )}
        <span
          className="shrink-0 font-semibold text-foreground"
          data-atlas-numeric="true"
        >
          {formatCoursePricing(course.pricing, t)}
        </span>
      </div>
    </>
  );
}

export function CourseCatalogSection({
  config,
  academyId,
  linkRenderer,
}: CourseCatalogSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const controlId = useId();

  const {
    pageSize,
    search,
    handleSearch,
    category,
    categoryName,
    handleClearCategory,
    level,
    handleLevel,
    pricing,
    handlePricing,
    sort,
    handleSort,
    pagination,
    data,
    isLoading,
    error,
    refetch,
    courses,
    hasActiveFilters,
    hasControls,
  } = useCourseCatalog({ config, academyId, syncUrl: !!linkRenderer });

  const levelId = `${controlId}-level`;
  const pricingId = `${controlId}-pricing`;
  const sortId = `${controlId}-sort`;

  return (
    <section className={`${container} ${section}`}>
      <div className="mb-10 space-y-2 text-center">
        <h2 className={`${heading} text-3xl text-foreground`}>
          {resolveLocalizedText(config.title, locale)}
        </h2>
        {config.description ? (
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {resolveLocalizedText(config.description, locale)}
          </p>
        ) : null}
      </div>

      {category ? (
        <div className="mb-4 flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearCategory}
            aria-label={t('website:renderer.courseCatalog.clearCategory', {
              name: categoryName ?? '',
            })}
          >
            <span dir="auto">
              {categoryName ??
                t('website:renderer.courseCatalog.categoryFilter')}
            </span>
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}

      {hasControls ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {config.showSearch ? (
            <SearchInput
              value={search}
              onValueChange={handleSearch}
              labelKey="website:renderer.courseCatalog.searchLabel"
              className="flex-1 sm:min-w-[16rem]"
            />
          ) : null}

          {config.showLevelFilter ? (
            <div className="space-y-1.5">
              <Label htmlFor={levelId}>
                {t('website:renderer.courseCatalog.levelLabel')}
              </Label>
              <Select value={level} onValueChange={handleLevel}>
                <SelectTrigger id={levelId} className="w-full sm:w-[11rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:renderer.courseCatalog.allLevels')}
                  </SelectItem>
                  {COURSE_LEVEL_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`website:renderer.courseDetails.level.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {config.showPricingFilter ? (
            <div className="space-y-1.5">
              <Label htmlFor={pricingId}>
                {t('website:renderer.courseCatalog.pricingLabel')}
              </Label>
              <Select value={pricing} onValueChange={handlePricing}>
                <SelectTrigger id={pricingId} className="w-full sm:w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:renderer.courseCatalog.allPricing')}
                  </SelectItem>
                  <SelectItem value="free">
                    {t('website:renderer.courseCatalog.free')}
                  </SelectItem>
                  <SelectItem value="paid">
                    {t('website:renderer.courseCatalog.paid')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {config.showSort ? (
            <div className="space-y-1.5 sm:ms-auto">
              <Label htmlFor={sortId}>
                {t('website:renderer.courseCatalog.sortLabel')}
              </Label>
              <Select value={sort} onValueChange={handleSort}>
                <SelectTrigger id={sortId} className="w-full sm:w-[13rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_CATALOG_SORT_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(SORT_LABEL_KEYS[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Always mounted so the live region exists BEFORE its text changes —
          a region that appears already populated is not announced. Empty
          while loading rather than unmounted, for the same reason. */}
      <p
        role="status"
        aria-live="polite"
        className="mb-4 text-start text-sm text-muted-foreground"
        data-atlas-numeric="true"
      >
        {!isLoading && !error && data
          ? t('website:renderer.courseCatalog.resultCount', {
              count: data.pagination.totalItems,
            })
          : null}
      </p>

      {error ? (
        <ErrorState kind={apiErrorKind(error)} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className={GRID_CLASS}>
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <CatalogCardSkeleton key={i} cardClass={cardClass} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          titleKey={
            hasActiveFilters
              ? 'website:renderer.courseCatalog.noResults'
              : 'website:renderer.noCourses'
          }
          descriptionKey={
            hasActiveFilters
              ? 'website:renderer.courseCatalog.noResultsDescription'
              : undefined
          }
          icon={hasActiveFilters ? SearchX : BookOpen}
        />
      ) : (
        <>
          <div className={GRID_CLASS}>
            {courses.map((course) =>
              linkRenderer ? (
                <div key={course.id} className="contents">
                  {linkRenderer({
                    href: `/courses/${course.id}`,
                    external: false,
                    // `h-full flex-col` so `CatalogCardBody`'s `mt-auto`
                    // footer lands on the grid row's shared bottom edge.
                    className: `flex h-full w-full flex-col text-start hover:shadow-[var(--website-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${cardClass}`,
                    children: <CatalogCardBody course={course} t={t} />,
                  })}
                </div>
              ) : (
                <article
                  key={course.id}
                  className={`flex h-full flex-col ${cardClass}`}
                >
                  <CatalogCardBody course={course} t={t} />
                </article>
              )
            )}
          </div>

          {pagination.totalPages > 1 ? (
            <Pagination
              pagination={pagination}
              hidePageSize
              className="mt-8 border-t-0 px-0 sm:px-0"
            />
          ) : null}
        </>
      )}
    </section>
  );
}
