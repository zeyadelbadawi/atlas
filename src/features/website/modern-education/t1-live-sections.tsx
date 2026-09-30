/**
 * Theme 1 Home sections driven by live Academy data (plan §C.1 #3, #4,
 * #7, #8, #9). The §C.1 hiding rules:
 * - categories hide with fewer than two;
 * - instructors hide publicly when there are none;
 * - statistics hide zeros, and the whole section hides with fewer than two
 *   metrics;
 * - sample testimonials never reach the public site.
 * The dashboard preview (no `linkRenderer`) explains a hidden section
 * instead of leaving an unexplained gap.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Code2,
  Languages,
  Lightbulb,
  Palette,
  Quote,
  Shapes,
  Star,
} from 'lucide-react';
import { cn } from '@utils';
import {
  usePublicCourseCategories,
  usePublicCourses,
  usePublicWebsiteStatistics,
} from '@hooks';
import { MIN_COURSE_CATEGORIES } from '../constants/website.constants';
import { PUBLIC_WEBSITE_LOCALE_DIRECTION } from '../constants/locale.constants';
import { useWebsiteTestimonialEntries } from '../hooks';
import { ThemeImage, hasRenderableImage } from '../theme-assets';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { resolvePagePath } from '../utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { Reveal } from '../primitives';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import type { CourseInstructorSummary } from '@types';
import {
  InitialsAvatar,
  T1Arrow,
  T1Link,
  T1Media,
  T1Section,
  T1SectionHeader,
  formatT1Number,
  prefersReducedMotion,
} from './t1-parts';
import { T1CourseCard, T1CourseCardSkeleton } from './T1CourseCard';

/** Shown only in previews, where a publicly hidden section needs a reason. */
function PreviewNote({ children }: { readonly children: string }) {
  return (
    <T1Section className="!py-8">
      <p
        data-preview-note=""
        className="rounded-[var(--t1-radius-card)] border border-dashed border-[var(--website-input-border)] px-6 py-6 text-center text-sm text-[var(--website-foreground-muted)]"
      >
        {children}
      </p>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Explore by category                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS = [
  BookOpen,
  Code2,
  Palette,
  BarChart3,
  Briefcase,
  Languages,
  Lightbulb,
  Shapes,
];

export function T1CourseCategories({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'courseCategories'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data, isLoading } = usePublicCourseCategories(academyId);
  if (isLoading) return null;
  const categories = (data ?? []).slice(0, config.maxItems);
  if (categories.length < MIN_COURSE_CATEGORIES) {
    return linkRenderer ? null : (
      <PreviewNote>
        {t('website:renderer.courseCategories.previewHidden', {
          count: MIN_COURSE_CATEGORIES,
        })}
      </PreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        action={
          catalogHref ? (
            <T1Link
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="t1-link"
            >
              {t('website:theme1.categories.viewAll')}
              <T1Arrow />
            </T1Link>
          ) : null
        }
      />
      <ul
        className={cn(
          't1-rail sm:grid-cols-2 md:grid-cols-3',
          categories.length >= 4 && 'lg:grid-cols-4'
        )}
      >
        {categories.map((category, index) => {
          const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
          const body = (
            <span className="flex h-full items-center gap-4 p-5">
              <span className="t1-icon-tile">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span
                  className="block break-words font-semibold text-[var(--website-foreground)]"
                  dir="auto"
                >
                  {category.name}
                </span>
                {config.showCounts ? (
                  <span
                    className="mt-0.5 block text-sm text-[var(--website-foreground-muted)]"
                    data-atlas-numeric="true"
                  >
                    {t('website:renderer.courseCategories.courseCount', {
                      count: category.courseCount,
                    })}
                  </span>
                ) : null}
              </span>
            </span>
          );
          const href = linkRenderer
            ? resolveCatalogHref(pages, { category: category.id })
            : undefined;
          return (
            <li key={category.id} className="w-[15rem] sm:w-auto">
              <div className="t1-card h-full">
                {href
                  ? linkRenderer!({
                      href,
                      external: false,
                      className: 't1-card-link',
                      children: body,
                    })
                  : body}
              </div>
            </li>
          );
        })}
      </ul>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured courses                                                      */
/* ------------------------------------------------------------------ */

const COURSES_LAUNCHING = 'theme-asset:modern-education/courses-launching';

export function T1FeaturedCourses({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'featuredCourses'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data, isLoading } = usePublicCourses(academyId, {
    query: { pagination: { page: 1, pageSize: Math.max(config.count, 1) } },
  });
  const courses =
    config.mode === 'selected' && config.courseIds
      ? (data?.items ?? []).filter((course) =>
          config.courseIds!.includes(course.id)
        )
      : (data?.items ?? []);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;
  const contactPage = pages.find((page) => page.coreType === 'contact');
  const contactHref =
    linkRenderer && contactPage ? resolvePagePath(contactPage) : undefined;

  return (
    <T1Section labelledBy={headingId}>
      <T1SectionHeader
        id={headingId}
        title={resolveLocalizedText(config.title, locale)}
        description={resolveLocalizedText(config.description, locale)}
        action={
          catalogHref && courses.length > 0 ? (
            <T1Link
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="t1-link"
            >
              {t('website:theme1.courses.viewAll')}
              <T1Arrow />
            </T1Link>
          ) : null
        }
      />
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <T1CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        // The designed empty state (§C.1 #4): "courses launching soon".
        <div
          data-courses-launching=""
          className="t1-card grid overflow-hidden md:grid-cols-2 md:items-stretch"
        >
          <T1Media
            value={COURSES_LAUNCHING}
            alt=""
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[16/9] !rounded-none md:aspect-[auto] md:min-h-[18rem]"
          />
          <div className="flex flex-col justify-center gap-4 p-7 md:p-10">
            <h3 className="font-display text-2xl font-bold text-[var(--website-foreground)]">
              {t('website:theme1.courses.launchingTitle')}
            </h3>
            <p className="leading-relaxed text-[var(--website-foreground-muted)]">
              {t('website:theme1.courses.launchingDescription')}
            </p>
            {contactPage ? (
              <div>
                <T1Link
                  href={contactHref}
                  linkRenderer={linkRenderer}
                  className="t1-btn-secondary"
                >
                  {t('website:theme1.courses.launchingAction')}
                </T1Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="t1-rail sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <li key={course.id} className="w-[85%] sm:w-auto">
              <Reveal delayMs={Math.min(index * 50, 400)} className="h-full">
                <T1CourseCard
                  course={course}
                  linkRenderer={linkRenderer}
                  showPrice={config.showPrice}
                  showInstructor={config.showInstructor}
                />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Instructors                                                           */
/* ------------------------------------------------------------------ */

export function T1Instructors({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'instructors'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data, isLoading } = usePublicCourses(academyId, {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  if (isLoading) return null;

  // Derived from the real catalog (never a parallel instructor model),
  // with how many published courses each teaches.
  const byId = new Map<
    string,
    { instructor: CourseInstructorSummary; courses: number }
  >();
  for (const course of data?.items ?? []) {
    for (const instructor of course.instructors) {
      const entry = byId.get(instructor.id);
      if (entry) entry.courses += 1;
      else byId.set(instructor.id, { instructor, courses: 1 });
    }
  }
  const instructors = [...byId.values()].slice(0, config.count);
  if (instructors.length === 0) {
    return linkRenderer ? null : (
      <PreviewNote>{t('website:theme1.instructors.previewHidden')}</PreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      {/* On phones this rail scrolls sideways and holds no links, so it
          takes focus itself to be scrollable from the keyboard. */}
      <ul
        tabIndex={0}
        aria-label={title || t('website:theme1.instructors.listLabel')}
        className={cn(
          't1-rail t1-focus-rail sm:grid-cols-2',
          instructors.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
        )}
      >
        {instructors.map(({ instructor, courses }, index) => (
          <li key={instructor.id} className="w-[14rem] sm:w-auto">
            <Reveal delayMs={Math.min(index * 50, 400)} className="h-full">
              <div className="t1-card flex h-full flex-col items-center px-6 py-8 text-center">
                {instructor.avatar ? (
                  <img
                    src={instructor.avatar}
                    alt=""
                    loading="lazy"
                    className="size-20 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar
                    name={instructor.name}
                    className="size-20 text-xl"
                  />
                )}
                <p
                  className="mt-4 line-clamp-2 break-words font-semibold text-[var(--website-foreground)]"
                  dir="auto"
                >
                  {instructor.name}
                </p>
                <p
                  className="mt-1 text-sm text-[var(--website-foreground-muted)]"
                  data-atlas-numeric="true"
                >
                  {t('website:theme1.instructors.courseCount', {
                    count: courses,
                  })}
                </p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Numbers (statistics)                                                  */
/* ------------------------------------------------------------------ */

const COUNT_UP_MS = 900;

/**
 * Counts up once, the first time it's seen (≤ 900ms, rAF). Reduced motion,
 * no observer, or already past: the final number. The final value is
 * always what assistive tech reads.
 */
export function CountUp({
  value,
  locale,
}: {
  readonly value: number;
  readonly locale: 'en' | 'ar';
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      prefersReducedMotion() ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / COUNT_UP_MS);
          setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <>
      <span ref={ref} aria-hidden data-count-up="">
        {formatT1Number(shown, locale)}
      </span>
      <span className="sr-only">{formatT1Number(value, locale)}</span>
    </>
  );
}

export function T1Statistics({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'statistics'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasLive = config.items.some((item) => !!item.metric);
  const { data, isLoading } = usePublicWebsiteStatistics(
    hasLive ? academyId : undefined
  );
  if (hasLive && isLoading) return null;

  // Live metrics show only real, non-zero numbers; a hand-typed value
  // shows as written (the Owner's own claim).
  const items = config.items
    .map((item) => {
      const label = resolveLocalizedText(item.label, locale);
      if (item.metric) {
        const value = data?.[item.metric] ?? 0;
        return value > 0 ? { id: item.id, label, value, text: '' } : null;
      }
      const text = resolveLocalizedText(item.value, locale);
      return text ? { id: item.id, label, value: undefined, text } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length < 2) {
    return linkRenderer ? null : (
      <PreviewNote>{t('website:theme1.statistics.previewHidden')}</PreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <div className="rounded-[28px] bg-[var(--website-surface)] px-6 py-12 md:px-12 md:py-16">
        <T1SectionHeader id={headingId} title={title} align="center" />
        <dl
          className={cn(
            'grid gap-x-4 gap-y-10 md:gap-x-6',
            // Three stay on one row even on phones (no orphan); two and
            // four split evenly.
            items.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
            items.length >= 4 && 'md:grid-cols-4'
          )}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex min-w-0 flex-col-reverse items-center gap-2 text-center"
            >
              <dt className="break-words text-sm font-medium text-[var(--website-foreground-muted)] md:text-base">
                {item.label}
              </dt>
              <dd
                className="font-display text-3xl font-bold tracking-tight text-[var(--website-foreground)] sm:text-4xl md:text-5xl"
                data-atlas-numeric="true"
              >
                {item.value !== undefined ? (
                  <CountUp value={item.value} locale={locale} />
                ) : (
                  item.text
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials — a large-quote carousel                                 */
/* ------------------------------------------------------------------ */

interface QuoteItem {
  readonly id: string;
  readonly quote: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly avatar?: string;
  readonly rating?: number;
  readonly sample: boolean;
}

function QuoteCard({ item }: { readonly item: QuoteItem }): JSX.Element {
  const { t } = useTranslation();
  return (
    <figure className="t1-card flex h-full flex-col p-7 md:p-9">
      <div className="flex items-center justify-between gap-3">
        <Quote className="size-8 text-[var(--website-highlight)]" aria-hidden />
        {item.sample ? (
          <span
            data-sample-badge=""
            className="rounded-full border border-dashed border-[var(--website-input-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--website-foreground-muted)]"
          >
            {t('website:renderer.testimonials.sampleBadge')}
          </span>
        ) : null}
      </div>
      {item.rating ? (
        <div
          className="mt-4 flex gap-0.5"
          role="img"
          aria-label={t('website:renderer.courseDetails.ratingLabel', {
            rating: item.rating,
          })}
        >
          {Array.from({ length: 5 }).map((_, star) => (
            <Star
              key={star}
              aria-hidden
              className={cn(
                'size-4',
                star < item.rating!
                  ? 'fill-[var(--website-warning)] text-[var(--website-warning)]'
                  : 'text-[var(--website-input-border)]'
              )}
            />
          ))}
        </div>
      ) : null}
      <blockquote className="mt-4 flex-1 break-words text-lg leading-relaxed text-[var(--website-foreground)] md:text-xl">
        “{item.quote}”
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--website-border)] pt-5">
        {hasRenderableImage(item.avatar) ? (
          <ThemeImage
            value={item.avatar}
            sizes="48px"
            alt=""
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar name={item.authorName} className="size-12" />
        )}
        <div className="min-w-0">
          <p
            className="truncate font-semibold text-[var(--website-foreground)]"
            dir="auto"
          >
            {item.authorName}
          </p>
          {item.authorRole ? (
            <p className="truncate text-sm text-[var(--website-foreground-muted)]">
              {item.authorRole}
            </p>
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}

export function T1Testimonials({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'testimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const direction = PUBLIC_WEBSITE_LOCALE_DIRECTION[locale];
  const headingId = useId();
  const isPublic = !!linkRenderer;
  const libraryIds = config.libraryEntryIds ?? [];
  const { data } = useWebsiteTestimonialEntries(academyId, {
    query: { filters: { status: 'published' } },
    enabled: libraryIds.length > 0,
  });
  const libraryItems: QuoteItem[] = libraryIds
    .map((id) => data?.items.find((entry) => entry.id === id))
    .filter(
      (entry): entry is NonNullable<typeof entry> => !!entry && entry.visible
    )
    .map((entry) => ({
      id: entry.id,
      quote: resolveLocalizedText(entry.quote, locale),
      authorName: entry.authorName,
      authorRole: resolveLocalizedText(entry.authorRole, locale),
      avatar: entry.avatar,
      sample: false,
    }));
  // §D.4: sample (starter) testimonials never reach the public site.
  const inlineItems: QuoteItem[] = config.items
    .filter((item) => !(isPublic && item.sample))
    .map((item) => ({
      id: item.id,
      quote: resolveLocalizedText(item.quote, locale),
      authorName: item.authorName,
      authorRole: resolveLocalizedText(item.authorRole, locale),
      avatar: item.avatar,
      rating: item.rating,
      sample: item.sample === true,
    }));
  const items = [...libraryItems, ...inlineItems].filter((item) => item.quote);

  if (items.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);
  // Embla needs `matchMedia` (every browser has it); anywhere without it,
  // the quotes render as a plain list.
  const canCarousel =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function';

  return canCarousel ? (
    <QuoteCarousel
      items={items}
      title={title}
      headingId={headingId}
      direction={direction}
    />
  ) : (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader id={headingId} title={title} />
      <ul className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <QuoteCard item={item} />
          </li>
        ))}
      </ul>
    </T1Section>
  );
}

/**
 * The carousel (§G): drag/snap, arrow buttons, keyboard arrows on the
 * focused region, dots as real buttons, no autoplay, instant under reduced
 * motion. Arrows and keys follow the reading direction.
 */
function QuoteCarousel({
  items,
  title,
  headingId,
  direction,
}: {
  readonly items: readonly QuoteItem[];
  readonly title: string;
  readonly headingId: string;
  readonly direction: 'ltr' | 'rtl';
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const [emblaRef, embla] = useEmblaCarousel({
    align: 'start',
    direction,
    duration: prefersReducedMotion() ? 0 : 25,
  });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  useEffect(() => {
    if (!embla) return undefined;
    const update = () => {
      setSelected(embla.selectedScrollSnap());
      setSnaps(embla.scrollSnapList());
    };
    update();
    embla.on('select', update);
    embla.on('reInit', update);
    return () => {
      embla.off('select', update);
      embla.off('reInit', update);
    };
  }, [embla]);

  // Arrows point the way the content moves: reversed in Arabic.
  const PrevIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const NextIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const canPage = snaps.length > 1;

  return (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        action={
          canPage ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => embla?.scrollPrev()}
                disabled={selected === 0}
                className="t1-btn-secondary size-11 !px-0"
                aria-label={t('website:theme1.testimonials.previous')}
              >
                <PrevIcon className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => embla?.scrollNext()}
                disabled={selected === snaps.length - 1}
                className="t1-btn-secondary size-11 !px-0"
                aria-label={t('website:theme1.testimonials.next')}
              >
                <NextIcon className="size-5" aria-hidden />
              </button>
            </div>
          ) : null
        }
      />
      <div
        ref={emblaRef}
        className="overflow-hidden"
        role="region"
        aria-roledescription={t('website:theme1.testimonials.carouselRole')}
        aria-label={t('website:theme1.testimonials.carousel')}
        tabIndex={canPage ? 0 : undefined}
        onKeyDown={(event) => {
          const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
          const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
          if (event.key === back) {
            event.preventDefault();
            embla?.scrollPrev();
          }
          if (event.key === forward) {
            event.preventDefault();
            embla?.scrollNext();
          }
        }}
        data-t1-carousel=""
      >
        <ul className="-ms-6 flex">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="min-w-0 shrink-0 grow-0 basis-[88%] ps-6 md:basis-[70%] lg:basis-1/2"
              aria-roledescription={t('website:theme1.testimonials.slide')}
              aria-label={t('website:theme1.testimonials.slideLabel', {
                position: formatT1Number(index + 1, locale),
                total: formatT1Number(items.length, locale),
              })}
            >
              <QuoteCard item={item} />
            </li>
          ))}
        </ul>
      </div>
      {canPage ? (
        <div className="mt-8 flex justify-center gap-1">
          {snaps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => embla?.scrollTo(index)}
              aria-label={t('website:theme1.testimonials.goTo', {
                position: formatT1Number(index + 1, locale),
              })}
              aria-current={index === selected ? 'true' : undefined}
              className="t1-focus-dot flex size-8 items-center justify-center rounded-full"
            >
              <span
                className={cn(
                  'block h-2 rounded-full transition-all motion-reduce:transition-none',
                  index === selected
                    ? 'w-6 bg-[var(--website-link)]'
                    : 'w-2 bg-[var(--website-input-border)]'
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </T1Section>
  );
}
