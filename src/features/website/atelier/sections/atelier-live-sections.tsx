/**
 * Atelier sections driven by live Academy data (plan §5a): the category
 * list, the featured-courses contents page, the instructors masthead and
 * the numbers chapter. They read the same hooks and follow the same
 * hiding rules as Theme 1:
 * - categories hide with fewer than two;
 * - instructors (derived from public courses) hide publicly when there
 *   are none;
 * - statistics drop zeros, and the chapter hides with fewer than two;
 * - data that failed to load is never presented as "none".
 * A preview (no `linkRenderer`) explains a hidden section instead, with
 * labelled placeholders — never invented names or numbers.
 */
import { useId, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { cn } from '@utils';
import { formatCoursePricing } from '@features/course';
import {
  usePublicCourseCategories,
  usePublicCourses,
  usePublicWebsiteStatistics,
} from '@hooks';
import type { Course, CourseInstructorSummary } from '@types';
import {
  MAX_SELECTED_COURSES,
  MIN_COURSE_CATEGORIES,
} from '@/features/website/constants/website.constants';
import { formatCatalogDuration } from '@/features/website/sections/CourseCatalogSection';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { resolvePagePath } from '@/features/website/utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  AtelierArrow,
  AtelierChapter,
  AtelierLink,
  AtelierMedia,
  AtelierMonogram,
  AtelierSectionHeader,
  formatAtelierIndex,
  formatAtelierNumber,
} from '../atelier-parts';
import {
  AtelierLiveDataUnavailable,
  AtelierPreviewNote,
  AtelierPreviewSample,
} from './atelier-section-utils';
import { AtelierScene } from '../cinematic/AtelierScene';
import { isCinematicRuntime } from '../cinematic/cinematic-runtime';
import { stagger } from './atelier-stagger';
import '../atelier-sections.css';

const COURSE_FALLBACK = 'theme-asset:atelier/course-fallback';
const COURSES_LAUNCHING = 'theme-asset:atelier/courses-launching';

/* ------------------------------------------------------------------ */
/* Course categories — a typographic list                               */
/* ------------------------------------------------------------------ */

export function AtelierCourseCategories({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'courseCategories'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data, isLoading, isError } = usePublicCourseCategories(academyId);
  if (isLoading) return null;
  if (isError && !data) {
    return <AtelierLiveDataUnavailable isPublic={!!linkRenderer} />;
  }
  const categories = (data ?? []).slice(0, config.maxItems);
  if (categories.length < MIN_COURSE_CATEGORIES) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.courseCategories.previewHidden', {
          count: MIN_COURSE_CATEGORIES,
        })}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;

  return (
    <AtelierChapter labelledBy={title ? headingId : undefined} numbered>
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
        action={
          catalogHref ? (
            <AtelierLink
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="at-link"
            >
              {t('website:atelier.home.categories.viewAll')}
            </AtelierLink>
          ) : null
        }
      />
      <ul className="ath-cats">
        {categories.map((category) => {
          const body = (
            <>
              <span className="at-serif ath-cat-name" dir="auto">
                {category.name}
              </span>
              {config.showCounts ? (
                <span
                  className="at-label ath-cat-count"
                  data-atlas-numeric="true"
                >
                  {t('website:atelier.home.categories.courseCount', {
                    count: category.courseCount,
                    formatted: formatAtelierNumber(
                      category.courseCount,
                      locale
                    ),
                  })}
                </span>
              ) : null}
            </>
          );
          const href = linkRenderer
            ? resolveCatalogHref(pages, { category: category.id })
            : undefined;
          return (
            <li key={category.id} className="ath-cat">
              {href && linkRenderer ? (
                linkRenderer({
                  href,
                  external: false,
                  className: 'ath-cat-link',
                  children: body,
                })
              ) : (
                <span className="ath-cat-link">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Featured courses — the contents page                                 */
/* ------------------------------------------------------------------ */

/** The small-caps line under a course title: category, level, length. */
function useCourseMeta(course: Course, showInstructor: boolean): string[] {
  const { t } = useTranslation();
  const lessons = course.stats?.totalLessons ?? 0;
  const duration = formatCatalogDuration(course.stats?.durationSeconds, t);
  const instructor = showInstructor ? course.instructors[0]?.name : undefined;
  return [
    course.category?.name,
    course.level
      ? t(`website:renderer.courseDetails.level.${course.level}`)
      : undefined,
    duration ??
      (lessons > 0
        ? t('website:renderer.courseDetails.lessonCount', { count: lessons })
        : undefined),
    instructor
      ? t('website:atelier.home.courses.taughtBy', { name: instructor })
      : undefined,
  ].filter((item): item is string => !!item);
}

/** One course as an entry of the contents page (a row) or a plate. */
function CourseEntry({
  course,
  index,
  plate,
  showPrice,
  showInstructor,
  linkRenderer,
}: {
  readonly course: Course;
  readonly index: number;
  readonly plate: boolean;
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const meta = useCourseMeta(course, showInstructor);
  const image = course.thumbnail || COURSE_FALLBACK;
  const body = (
    <>
      {plate ? (
        <AtelierMedia
          value={image}
          alt=""
          sizes="(min-width: 768px) 22rem, 78vw"
          className="aspect-[3/2]"
        />
      ) : (
        // Desktop only: the hovered row's photograph in the fixed frame
        // beside the contents (decorative; CSS shows it).
        <div aria-hidden className="ath-peek">
          <AtelierMedia
            value={image}
            alt=""
            sizes="20rem"
            className="size-full"
          />
        </div>
      )}
      <span aria-hidden className="at-numeral ath-entry-no">
        {formatAtelierIndex(index, locale)}
      </span>
      <div className="ath-entry-main">
        <h3 className="at-serif ath-entry-title" dir="auto">
          {course.title}
        </h3>
        {meta.length > 0 ? (
          <p className="at-label ath-entry-meta" data-atlas-numeric="true">
            {meta.map((item, position) => (
              <span key={position} dir="auto">
                {item}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {showPrice ? (
        <span className="ath-entry-price" data-atlas-numeric="true">
          {formatCoursePricing(course.pricing, t)}
        </span>
      ) : null}
      {linkRenderer ? <AtelierArrow className="ath-entry-arrow" /> : null}
    </>
  );
  const className = plate ? 'ath-plate-entry' : 'ath-row-entry';
  if (linkRenderer) {
    return linkRenderer({
      href: `/courses/${course.id}`,
      external: false,
      className,
      children: body,
    });
  }
  return <article className={className}>{body}</article>;
}

export function AtelierFeaturedCourses({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'featuredCourses'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  // "Selected": exactly the courses the Owner picked, in their order; with
  // nothing picked yet it shows the latest courses (as Theme 1 does).
  const selectedIds =
    config.mode === 'selected' && config.courseIds?.length
      ? config.courseIds.slice(0, MAX_SELECTED_COURSES)
      : undefined;
  const { data, isLoading, isError, refetch } = usePublicCourses(academyId, {
    query: selectedIds
      ? {
          pagination: { page: 1, pageSize: selectedIds.length },
          filters: { ids: selectedIds.join(',') },
        }
      : { pagination: { page: 1, pageSize: Math.max(config.count, 1) } },
  });
  const fetched = data?.items ?? [];
  const courses = selectedIds
    ? selectedIds
        .map((id) => fetched.find((course) => course.id === id))
        .filter((course): course is NonNullable<typeof course> => !!course)
        .slice(0, Math.max(config.count, 1))
    : fetched;
  const failed = isError && !data;
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;
  const contactPage = pages.find((page) => page.coreType === 'contact');
  const contactHref =
    linkRenderer && contactPage ? resolvePagePath(contactPage) : undefined;
  const title = resolveLocalizedText(config.title, locale);
  const carousel = config.layout === 'carousel';

  let content: JSX.Element;
  if (isLoading) {
    content = (
      <ul aria-hidden className="ath-contents" data-courses-loading="">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="ath-row-skeleton" />
        ))}
      </ul>
    );
  } else if (failed) {
    // A failed request is not "no courses": say so and offer a retry.
    content = (
      <div data-courses-error="" className="ath-notice">
        <p className="at-serif ath-notice-title">
          {t('website:atelier.home.courses.errorTitle')}
        </p>
        <p className="at-lead">
          {t('website:atelier.home.courses.errorDescription')}
        </p>
        <button
          type="button"
          className="at-btn-ghost"
          onClick={() => void refetch()}
        >
          <RotateCw className="size-4" aria-hidden />
          {t('website:atelier.home.courses.retry')}
        </button>
      </div>
    );
  } else if (courses.length === 0) {
    // The designed empty state: "courses launching soon".
    content = (
      <div data-courses-launching="" className="ath-launching">
        <AtelierMedia
          value={COURSES_LAUNCHING}
          alt=""
          sizes="(min-width: 768px) 40vw, 100vw"
          className="aspect-[3/2]"
        />
        <div className="space-y-5">
          <h3 className="at-subtitle">
            {t('website:atelier.home.courses.launchingTitle')}
          </h3>
          <p className="at-lead">
            {t('website:atelier.home.courses.launchingDescription')}
          </p>
          {contactPage ? (
            <AtelierLink
              href={contactHref}
              linkRenderer={linkRenderer}
              className="at-btn-ghost"
            >
              {t('website:atelier.home.courses.launchingAction')}
            </AtelierLink>
          ) : null}
        </div>
      </div>
    );
  } else if (carousel) {
    // Native horizontal scroll with snap points: plates are links (focus
    // scrolls them into view); without links the strip takes focus itself.
    content = (
      <ul
        className="ath-plates"
        tabIndex={linkRenderer ? undefined : 0}
        aria-label={
          linkRenderer
            ? undefined
            : title || t('website:atelier.home.courses.listLabel')
        }
        data-courses-carousel=""
      >
        {courses.map((course, index) => (
          <li key={course.id} className="ath-plate">
            <CourseEntry
              course={course}
              index={index}
              plate
              showPrice={config.showPrice}
              showInstructor={config.showInstructor}
              linkRenderer={linkRenderer}
            />
          </li>
        ))}
      </ul>
    );
  } else {
    content = (
      <ol className="ath-contents">
        {courses.map((course, index) => (
          <li key={course.id} className="ath-contents-item">
            <Reveal delayMs={stagger(index)}>
              <CourseEntry
                course={course}
                index={index}
                plate={false}
                showPrice={config.showPrice}
                showInstructor={config.showInstructor}
                linkRenderer={linkRenderer}
              />
            </Reveal>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <AtelierChapter labelledBy={title ? headingId : undefined} numbered>
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
        action={
          catalogHref && courses.length > 0 && !failed ? (
            <AtelierLink
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="at-link"
            >
              {t('website:atelier.home.courses.viewAll')}
            </AtelierLink>
          ) : null
        }
      />
      <div className={cn(!carousel && 'ath-contents-frame')}>{content}</div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Instructors — the masthead                                           */
/* ------------------------------------------------------------------ */

export function AtelierInstructors({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'instructors'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { data, isLoading, isError } = usePublicCourses(academyId, {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  if (isLoading) return null;
  if (isError && !data) {
    return <AtelierLiveDataUnavailable isPublic={!!linkRenderer} />;
  }

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
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  if (instructors.length === 0) {
    if (linkRenderer) return null;
    return (
      <AtelierPreviewSample
        headingId={headingId}
        title={title}
        description={description}
        note={t('website:atelier.home.instructors.previewHidden')}
      >
        <ul className="ath-masthead">
          {Array.from({ length: Math.min(config.count, 4) }).map((_, index) => (
            <li key={index} className="ath-masthead-entry ath-sample">
              <span aria-hidden className="at-monogram ath-masthead-plate">
                —
              </span>
              <span className="min-w-0">
                <span className="at-serif ath-masthead-name">
                  {t('website:atelier.home.instructors.sampleName')}
                </span>
                <span className="at-label block">
                  {t('website:atelier.home.instructors.sampleCourses')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </AtelierPreviewSample>
    );
  }

  return (
    <AtelierChapter labelledBy={title ? headingId : undefined}>
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={description}
        numbered={false}
        layout="split"
      />
      <ul
        className="ath-masthead"
        aria-label={
          title ? undefined : t('website:atelier.home.instructors.listLabel')
        }
      >
        {instructors.map(({ instructor, courses }, index) => (
          <li key={instructor.id}>
            <Reveal delayMs={stagger(index)} className="ath-masthead-entry">
              {instructor.avatar ? (
                <img
                  src={instructor.avatar}
                  alt=""
                  loading="lazy"
                  className="ath-masthead-plate object-cover"
                />
              ) : (
                <AtelierMonogram
                  name={instructor.name}
                  className="ath-masthead-plate"
                />
              )}
              <span className="min-w-0">
                <span className="at-serif ath-masthead-name" dir="auto">
                  {instructor.name}
                </span>
                <span className="at-label block" data-atlas-numeric="true">
                  {t('website:atelier.home.instructors.courseCount', {
                    count: courses,
                    formatted: formatAtelierNumber(courses, locale),
                  })}
                </span>
              </span>
            </Reveal>
          </li>
        ))}
      </ul>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Statistics — the ink numbers chapter                                 */
/* ------------------------------------------------------------------ */

export function AtelierStatistics({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'statistics'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasLive = config.items.some((item) => !!item.metric);
  const { data, isLoading, isError } = usePublicWebsiteStatistics(
    hasLive ? academyId : undefined
  );
  if (hasLive && isLoading) return null;
  // Live numbers that failed to load are not zeros: the chapter steps aside.
  if (hasLive && isError && !data) {
    return <AtelierLiveDataUnavailable isPublic={!!linkRenderer} />;
  }

  // Live metrics show only real, non-zero numbers; a hand-typed value
  // shows as written (the Owner's own claim).
  const items = config.items
    .map((item) => {
      const label = resolveLocalizedText(item.label, locale);
      if (item.metric) {
        const value = data?.[item.metric] ?? 0;
        return value > 0
          ? { id: item.id, label, text: formatAtelierNumber(value, locale) }
          : null;
      }
      const text = resolveLocalizedText(item.value, locale);
      return text ? { id: item.id, label, text } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const title = resolveLocalizedText(config.title, locale);
  if (items.length < 2) {
    if (linkRenderer) return null;
    const labels = config.items.slice(0, 4).map((item) => ({
      id: item.id,
      label: resolveLocalizedText(item.label, locale),
    }));
    if (labels.length === 0) {
      return (
        <AtelierPreviewNote>
          {t('website:atelier.home.statistics.previewHidden')}
        </AtelierPreviewNote>
      );
    }
    return (
      <AtelierPreviewSample
        env="ink"
        headingId={headingId}
        title={title}
        note={t('website:atelier.home.statistics.previewHidden')}
      >
        <dl className="ath-stats">
          {labels.map((item) => (
            <div key={item.id} className="ath-stat">
              <dt className="at-label">{item.label}</dt>
              <dd
                className="ath-stat-value"
                aria-label={t('website:atelier.home.statistics.sampleValue')}
              >
                —
              </dd>
            </div>
          ))}
        </dl>
      </AtelierPreviewSample>
    );
  }

  // The ink scene (public site, large screens): the page turns from paper
  // to ink through a growing window, then the figures rise in order.
  const cinematic = isCinematicRuntime(linkRenderer);
  return (
    <AtelierScene
      name="ink"
      enabled={cinematic}
      style={{ '--at-stats': items.length } as CSSProperties}
    >
      <AtelierChapter
        env="ink"
        unveil
        labelledBy={title ? headingId : undefined}
        label={title ? undefined : t('website:atelier.home.statistics.label')}
        backdrop={
          cinematic ? (
            <span aria-hidden className="atc-ink-window" />
          ) : undefined
        }
      >
        {title ? (
          <AtelierSectionHeader id={headingId} title={title} numbered={false} />
        ) : null}
        <dl className="ath-stats">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="ath-stat"
              style={
                cinematic ? ({ '--at-i': index } as CSSProperties) : undefined
              }
            >
              <dt className="at-label">{item.label}</dt>
              <dd data-atlas-numeric="true">
                <Reveal delayMs={stagger(index)} className="ath-stat-value">
                  {item.text}
                </Reveal>
              </dd>
            </div>
          ))}
        </dl>
      </AtelierChapter>
    </AtelierScene>
  );
}
