/**
 * Manara sections driven by live Academy data (plan §3.10): Pick your
 * track (`courseCategories`), Now enrolling (`featuredCourses`), Your
 * teachers (`instructors`) and the Scoreboard (`statistics`). They read the
 * same hooks and follow the same hiding rules as Theme 1 and Atelier:
 * - categories hide with fewer than two;
 * - instructors (derived from public courses) hide publicly when there
 *   are none;
 * - the scoreboard shows live metrics only, drops zeros and hides with
 *   fewer than two;
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
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { resolvePagePath } from '@/features/website/utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  ManaraArrow,
  ManaraBlock,
  ManaraLink,
  ManaraMedia,
  ManaraMonogram,
  ManaraNumeral,
  ManaraPill,
  ManaraSectionHeader,
  formatManaraNumber,
} from '../manara-parts';
import {
  ManaraLiveDataUnavailable,
  ManaraPreviewNote,
  ManaraPreviewSample,
} from './manara-section-utils';
import {
  MANARA_COURSES_LAUNCHING,
  MANARA_COURSE_FALLBACK,
  stagger,
} from './manara-section-helpers';
import '../manara-sections.css';

/** Tiles alternate between the brand block and the accent. */
const tileTone = (index: number): 'accent' | undefined =>
  index % 2 === 1 ? 'accent' : undefined;

/* ------------------------------------------------------------------ */
/* Course categories — Pick your track                                  */
/* ------------------------------------------------------------------ */

export function ManaraCourseCategories({
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
    return <ManaraLiveDataUnavailable isPublic={!!linkRenderer} />;
  }
  const categories = (data ?? []).slice(0, config.maxItems);
  if (categories.length < MIN_COURSE_CATEGORIES) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.courseCategories.previewHidden', {
          count: MIN_COURSE_CATEGORIES,
        })}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;

  return (
    <ManaraBlock labelledBy={title ? headingId : undefined}>
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
        action={
          catalogHref ? (
            <ManaraLink
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="mn-link"
            >
              {t('website:manara.home.categories.viewAll')}
              <ManaraArrow />
            </ManaraLink>
          ) : null
        }
      />
      <ul className="mnh-tracks">
        {categories.map((category, index) => {
          const body = (
            <>
              <span className="mn-subtitle mnh-track-name" dir="auto">
                {category.name}
              </span>
              <span className="mnh-track-foot">
                {config.showCounts ? (
                  <ManaraPill>
                    <span data-atlas-numeric="true">
                      {t('website:manara.home.categories.courseCount', {
                        count: category.courseCount,
                        formatted: formatManaraNumber(
                          category.courseCount,
                          locale
                        ),
                      })}
                    </span>
                  </ManaraPill>
                ) : (
                  <span />
                )}
                <ManaraArrow className="mnh-track-arrow size-6" />
              </span>
            </>
          );
          const href = linkRenderer
            ? resolveCatalogHref(pages, { category: category.id })
            : undefined;
          // The tile carries the tone; the link fills it (its padding is
          // the link's, so the whole tile is the target).
          return (
            <li key={category.id} className="min-w-0">
              <Reveal delayMs={stagger(index)} className="h-full">
                <div className="mn-tile mnh-track" data-tone={tileTone(index)}>
                  {href && linkRenderer ? (
                    linkRenderer({
                      href,
                      external: false,
                      className: 'mnh-track-link',
                      children: body,
                    })
                  ) : (
                    <span className="mnh-track-link">{body}</span>
                  )}
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Featured courses — Now enrolling                                     */
/* ------------------------------------------------------------------ */

/** One course as a poster card: slanted image with its level pill, title, teacher, price. */
function CoursePoster({
  course,
  showPrice,
  showInstructor,
  linkRenderer,
}: {
  readonly course: Course;
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const { t } = useTranslation();
  const instructor = showInstructor ? course.instructors[0]?.name : undefined;
  const body = (
    <>
      <ManaraMedia
        value={course.thumbnail || MANARA_COURSE_FALLBACK}
        alt=""
        sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 82vw"
        shape="slant"
        className="mnh-course-media aspect-[3/2]"
      >
        {course.level ? (
          <ManaraPill tone="block" className="mnh-course-level">
            {t(`website:renderer.courseDetails.level.${course.level}`)}
          </ManaraPill>
        ) : null}
      </ManaraMedia>
      <span className="mnh-course-body">
        <span className="mn-subtitle mnh-course-title" dir="auto">
          {course.title}
        </span>
        {instructor ? (
          <span className="mn-muted mnh-course-teacher" dir="auto">
            {t('website:manara.home.courses.taughtBy', { name: instructor })}
          </span>
        ) : null}
        <span className="mnh-course-foot">
          {showPrice ? (
            <ManaraPill tone="accent" className="mnh-course-price">
              <span data-atlas-numeric="true">
                {formatCoursePricing(course.pricing, t)}
              </span>
            </ManaraPill>
          ) : (
            <span />
          )}
          <ManaraArrow className="mnh-course-arrow size-5" />
        </span>
      </span>
    </>
  );
  const className = 'mn-card mnh-course';
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

export function ManaraFeaturedCourses({
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

  let content: JSX.Element;
  if (isLoading) {
    content = (
      <ul aria-hidden className="mn-rail mnh-courses" data-courses-loading="">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="mn-card mnh-course-skeleton" />
        ))}
      </ul>
    );
  } else if (failed) {
    // A failed request is not "no courses": say so and offer a retry.
    content = (
      <div data-courses-error="" className="mnh-notice">
        <p className="mn-subtitle">
          {t('website:manara.home.courses.errorTitle')}
        </p>
        <p className="mn-body mn-muted">
          {t('website:manara.home.courses.errorDescription')}
        </p>
        <button
          type="button"
          className="mn-btn mn-btn-outline"
          onClick={() => void refetch()}
        >
          <RotateCw className="size-4" aria-hidden />
          {t('website:manara.home.courses.retry')}
        </button>
      </div>
    );
  } else if (courses.length === 0) {
    // The designed empty state: a night tile, "courses launching soon".
    content = (
      <div
        data-courses-launching=""
        className="mn-tile mnh-launching"
        data-tone="night"
      >
        <ManaraMedia
          value={MANARA_COURSES_LAUNCHING}
          alt=""
          sizes="(min-width: 768px) 40vw, 100vw"
          shape="slant"
          className="aspect-[3/2]"
        />
        <div className="mnh-launching-copy">
          <h3 className="mn-subtitle">
            {t('website:manara.home.courses.launchingTitle')}
          </h3>
          <p className="mn-body mn-muted">
            {t('website:manara.home.courses.launchingDescription')}
          </p>
          {contactPage ? (
            <ManaraLink
              href={contactHref}
              linkRenderer={linkRenderer}
              className="mn-btn mn-btn-outline"
            >
              {t('website:manara.home.courses.launchingAction')}
            </ManaraLink>
          ) : null}
        </div>
      </div>
    );
  } else {
    // A scroll-snap rail on phones, a grid of posters from tablets up; the
    // posters are links (focus scrolls them into view) — without links the
    // rail takes focus itself.
    content = (
      <ul
        className="mn-rail mnh-courses"
        tabIndex={linkRenderer ? undefined : 0}
        aria-label={
          linkRenderer
            ? undefined
            : title || t('website:manara.home.courses.listLabel')
        }
        data-courses-rail=""
        data-layout={config.layout}
      >
        {courses.map((course) => (
          <li key={course.id} className="min-w-0">
            <CoursePoster
              course={course}
              showPrice={config.showPrice}
              showInstructor={config.showInstructor}
              linkRenderer={linkRenderer}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ManaraBlock env="soft" labelledBy={title ? headingId : undefined}>
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
        action={
          catalogHref && courses.length > 0 && !failed ? (
            <ManaraLink
              href={catalogHref}
              linkRenderer={linkRenderer}
              className="mn-btn mn-btn-block"
            >
              {t('website:manara.home.courses.viewAll')}
              <ManaraArrow />
            </ManaraLink>
          ) : null
        }
      />
      {content}
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Instructors — Your teachers                                          */
/* ------------------------------------------------------------------ */

export function ManaraInstructors({
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
    return <ManaraLiveDataUnavailable isPublic={!!linkRenderer} />;
  }

  // Derived from the real catalogue (never a parallel instructor model),
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
      <ManaraPreviewSample
        headingId={headingId}
        title={title}
        description={description}
        note={t('website:manara.home.instructors.previewHidden')}
      >
        <ul className="mnh-teachers">
          {Array.from({ length: Math.min(config.count, 4) }).map((_, index) => (
            <li key={index} className="min-w-0">
              <div className="mn-card mnh-teacher mnh-sample">
                <span aria-hidden className="mn-monogram mnh-teacher-plate">
                  —
                </span>
                <span className="min-w-0">
                  <span className="mn-subtitle mnh-teacher-name">
                    {t('website:manara.home.instructors.sampleName')}
                  </span>
                  <ManaraPill className="mt-3">
                    {t('website:manara.home.instructors.sampleCourses')}
                  </ManaraPill>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </ManaraPreviewSample>
    );
  }

  return (
    <ManaraBlock labelledBy={title ? headingId : undefined}>
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={description}
        layout="split"
      />
      <ul
        className="mnh-teachers"
        aria-label={
          title ? undefined : t('website:manara.home.instructors.listLabel')
        }
      >
        {instructors.map(({ instructor, courses }, index) => (
          <li key={instructor.id} className="min-w-0">
            <Reveal delayMs={stagger(index)} className="h-full">
              <div className="mn-card mnh-teacher">
                {instructor.avatar ? (
                  <img
                    src={instructor.avatar}
                    alt=""
                    loading="lazy"
                    className="mnh-teacher-plate object-cover"
                  />
                ) : (
                  <ManaraMonogram
                    name={instructor.name}
                    className="mnh-teacher-plate"
                  />
                )}
                <span className="min-w-0">
                  <h3 className="mn-subtitle mnh-teacher-name" dir="auto">
                    {instructor.name}
                  </h3>
                  <ManaraPill className="mt-3">
                    <span data-atlas-numeric="true">
                      {t('website:manara.home.instructors.courseCount', {
                        count: courses,
                        formatted: formatManaraNumber(courses, locale),
                      })}
                    </span>
                  </ManaraPill>
                </span>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Statistics — the Scoreboard                                          */
/* ------------------------------------------------------------------ */

export function ManaraStatistics({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'statistics'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  // The scoreboard shows live metrics only (plan §3.10 #2): a number is
  // either the Academy's real count or absent — never a typed claim.
  const liveItems = config.items.filter((item) => !!item.metric);
  const { data, isLoading, isError } = usePublicWebsiteStatistics(
    liveItems.length > 0 ? academyId : undefined
  );
  if (liveItems.length > 0 && isLoading) return null;
  // Live numbers that failed to load are not zeros: the block steps aside.
  if (liveItems.length > 0 && isError && !data) {
    return <ManaraLiveDataUnavailable isPublic={!!linkRenderer} />;
  }

  const items = liveItems
    .map((item) => {
      const value = item.metric ? (data?.[item.metric] ?? 0) : 0;
      return value > 0
        ? {
            id: item.id,
            label: resolveLocalizedText(item.label, locale),
            text: formatManaraNumber(value, locale),
          }
        : null;
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
        <ManaraPreviewNote>
          {t('website:manara.home.statistics.previewHidden')}
        </ManaraPreviewNote>
      );
    }
    return (
      <ManaraPreviewSample
        headingId={headingId}
        title={title}
        note={t('website:manara.home.statistics.previewHidden')}
      >
        <ul
          className="mnh-score"
          style={{ '--mnh-cols': Math.min(labels.length, 4) } as CSSProperties}
        >
          {labels.map((item, index) => (
            <li
              key={item.id}
              className="mn-tile mnh-score-tile mnh-sample"
              data-tone={tileTone(index)}
            >
              <span aria-hidden className="mnh-score-value">
                <ManaraNumeral value="—" />
              </span>
              <span className="mn-sr-only">
                {t('website:manara.home.statistics.sampleValue')}
              </span>
              <span className="mn-label mnh-score-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </ManaraPreviewSample>
    );
  }

  return (
    <ManaraBlock
      seamTop
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:manara.home.statistics.label')}
      className="mnh-scoreboard"
    >
      {title ? <ManaraSectionHeader id={headingId} title={title} /> : null}
      {/* Each tile reads "6 courses": the number first, then its label. */}
      <ul
        className="mnh-score"
        style={{ '--mnh-cols': Math.min(items.length, 4) } as CSSProperties}
      >
        {items.map((item, index) => (
          <li key={item.id} className="min-w-0">
            <Reveal delayMs={stagger(index)} className="h-full">
              <div
                className="mn-tile mnh-score-tile"
                data-tone={tileTone(index)}
              >
                <span className="mnh-score-value" data-atlas-numeric="true">
                  <ManaraNumeral value={item.text} />
                </span>
                <span className="mn-label mnh-score-label">{item.label}</span>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </ManaraBlock>
  );
}
