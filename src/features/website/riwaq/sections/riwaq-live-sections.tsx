/**
 * Riwaq sections driven by live Academy data (plan §4): Departments
 * (`courseCategories`), the Programme explorer (`featuredCourses`), Faculty
 * (`instructors`) and Facts & figures (`statistics`). Same hooks and hiding
 * rules as Themes 1–3:
 * - departments hide with fewer than two;
 * - faculty (derived from public courses) hides publicly when there is none;
 * - figures show live metrics only, drop zeros and hide with fewer than two;
 * - data that failed to load is never presented as "none".
 * A preview (no `linkRenderer`) explains a hidden section instead, with
 * labelled placeholders — never invented names or numbers.
 */
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
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
import { formatCatalogDuration } from '@/features/website/sections/CourseCatalogSection';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { Reveal } from '@/features/website/primitives';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  RIWAQ_COURSES_LAUNCHING,
  RIWAQ_COURSE_FALLBACK,
  RiwaqArrow,
  RiwaqBand,
  RiwaqLink,
  RiwaqMonogram,
  RiwaqSectionHead,
  RiwaqWindow,
  formatRiwaqIndex,
  formatRiwaqNumber,
  riwaqStagger,
} from '../riwaq-parts';
import {
  RiwaqLiveDataUnavailable,
  RiwaqPreviewNote,
  RiwaqPreviewSample,
} from './riwaq-section-utils';
import '../riwaq-sections.css';

/* ------------------------------------------------------------------ */
/* Course categories — Departments                                      */
/* ------------------------------------------------------------------ */

export function RiwaqCourseCategories({
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
    return <RiwaqLiveDataUnavailable isPublic={!!linkRenderer} />;
  }
  const categories = (data ?? []).slice(0, config.maxItems);
  if (categories.length < MIN_COURSE_CATEGORIES) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.courseCategories.previewHidden', {
          count: MIN_COURSE_CATEGORIES,
        })}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;

  return (
    <RiwaqBand ground="stone" labelledBy={title ? headingId : undefined}>
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        action={
          catalogHref ? (
            <RiwaqLink href={catalogHref} linkRenderer={linkRenderer} className="rw-link">
              {t('website:riwaq.home.categories.viewAll')}
              <RiwaqArrow />
            </RiwaqLink>
          ) : null
        }
      />
      <ul
        className="rwl-index"
        aria-label={title ? undefined : t('website:riwaq.home.categories.listLabel')}
      >
        {categories.map((category, index) => {
          const body = (
            <>
              <span aria-hidden className="rw-label rw-num rwl-index-no">
                {formatRiwaqIndex(index, locale)}
              </span>
              <span className="rw-subtitle rwl-index-name" dir="auto">
                {category.name}
              </span>
              <span aria-hidden className="rwl-index-leader" />
              {config.showCounts ? (
                <span className="rw-label rw-num rwl-index-count">
                  {t('website:riwaq.home.categories.courseCount', {
                    count: category.courseCount,
                    formatted: formatRiwaqNumber(category.courseCount, locale),
                  })}
                </span>
              ) : null}
              <RiwaqArrow className="rwl-index-arrow" />
            </>
          );
          return (
            <li key={category.id}>
              {linkRenderer ? (
                <RiwaqLink
                  href={resolveCatalogHref(pages, { category: category.id })}
                  linkRenderer={linkRenderer}
                  className="rwl-index-row"
                >
                  {body}
                </RiwaqLink>
              ) : (
                <div className="rwl-index-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Featured courses — the Programme explorer                            */
/* ------------------------------------------------------------------ */

/** Wide screens show the selected programme beside the list (`riwaq-sections.css`). */
const SIDE_BY_SIDE = '(min-width: 1024px)';

function ProgrammeSheet({
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
  const lessons = course.stats?.totalLessons ?? 0;
  const duration = formatCatalogDuration(course.stats?.durationSeconds, t);
  const instructors = showInstructor
    ? course.instructors.map((instructor) => instructor.name).join(', ')
    : '';
  const facts: { key: string; term: string; value: string }[] = [];
  if (course.level) {
    facts.push({
      key: 'level',
      term: t('website:riwaq.home.courses.facts.level'),
      value: t(`website:renderer.courseDetails.level.${course.level}`),
    });
  }
  if (lessons > 0) {
    facts.push({
      key: 'lessons',
      term: t('website:riwaq.home.courses.facts.lessons'),
      value: t('website:renderer.courseDetails.lessonCount', { count: lessons }),
    });
  }
  if (duration) {
    facts.push({
      key: 'duration',
      term: t('website:riwaq.home.courses.facts.duration'),
      value: duration,
    });
  }
  if (instructors) {
    facts.push({
      key: 'faculty',
      term: t('website:riwaq.home.courses.facts.faculty'),
      value: instructors,
    });
  }
  if (course.certificatesEnabled) {
    facts.push({
      key: 'certificate',
      term: t('website:riwaq.home.courses.facts.certificate'),
      value: t('website:riwaq.home.courses.facts.certificateIncluded'),
    });
  }
  if (showPrice) {
    facts.push({
      key: 'price',
      term: t('website:riwaq.home.courses.facts.price'),
      value: formatCoursePricing(course.pricing, t),
    });
  }
  return (
    <div className="rwx-sheet">
      <RiwaqWindow
        value={course.thumbnail || RIWAQ_COURSE_FALLBACK}
        alt=""
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="rwx-sheet-window aspect-[3/2]"
        develop
      />
      <div className="rwx-sheet-body">
        {course.shortDescription ? (
          <p className="rw-lead" dir="auto">
            {course.shortDescription}
          </p>
        ) : null}
        {facts.length > 0 ? (
          <dl className="rw-facts">
            {facts.map((fact) => (
              <div key={fact.key} className="contents">
                <dt>{fact.term}</dt>
                <dd dir="auto">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <RiwaqLink
          href={`/courses/${course.id}`}
          linkRenderer={linkRenderer}
          className="rw-btn"
        >
          <span>
            {t('website:riwaq.home.courses.view')}
            <span className="rw-sr-only">: {course.title}</span>
          </span>
          <RiwaqArrow />
        </RiwaqLink>
      </div>
    </div>
  );
}

function ProgrammeExplorer({
  courses,
  showPrice,
  showInstructor,
  linkRenderer,
}: {
  readonly courses: readonly Course[];
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);
  const select = (index: number) => {
    // Side by side, one programme is always shown; stacked (phones), a row
    // can also be closed again.
    const sideBySide =
      typeof window.matchMedia === 'function' &&
      window.matchMedia(SIDE_BY_SIDE).matches;
    setOpen((current) => (current === index && !sideBySide ? null : index));
  };
  return (
    <div
      className="rwx"
      data-explorer=""
      style={{ '--rwx-span': courses.length + 1 } as CSSProperties}
    >
      {courses.map((course, index) => {
        const expanded = open === index;
        const buttonId = `${baseId}-b${index}`;
        const panelId = `${baseId}-p${index}`;
        const meta = [
          course.level
            ? t(`website:renderer.courseDetails.level.${course.level}`)
            : null,
          showPrice ? formatCoursePricing(course.pricing, t) : null,
        ].filter(Boolean);
        return (
          <div key={course.id} className="contents">
            <h3 className="rwx-head">
              <button
                id={buttonId}
                type="button"
                className="rwx-row"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => select(index)}
              >
                <span aria-hidden className="rw-label rw-num rwx-row-no">
                  {formatRiwaqIndex(index, locale)}
                </span>
                <span className="rwx-row-main">
                  <span className="rwx-row-title" dir="auto">
                    {course.title}
                  </span>
                  {meta.length > 0 ? (
                    <span className="rw-label rwx-row-meta">{meta.join(' · ')}</span>
                  ) : null}
                </span>
                <span aria-hidden className="rwx-row-mark" />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="rwx-panel"
            >
              <ProgrammeSheet
                course={course}
                showPrice={showPrice}
                showInstructor={showInstructor}
                linkRenderer={linkRenderer}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RiwaqFeaturedCourses({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'featuredCourses'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  // "Selected": exactly the courses the Owner picked, in their order; with
  // nothing picked yet it shows the latest courses (as Themes 1–3 do).
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
      <div aria-hidden className="rwx" data-courses-loading="">
        <span className="rw-skeleton rwx-skeleton" />
      </div>
    );
  } else if (failed) {
    // A failed request is not "no programmes": say so and offer a retry.
    content = (
      <div data-courses-error="" className="rw-cell rwl-notice" data-tick="">
        <p className="rw-subtitle">{t('website:riwaq.home.courses.errorTitle')}</p>
        <p className="rw-body">{t('website:riwaq.home.courses.errorDescription')}</p>
        <button type="button" className="rw-btn rw-btn-line" onClick={() => void refetch()}>
          <RotateCw className="size-4" aria-hidden />
          {t('website:riwaq.home.courses.retry')}
        </button>
      </div>
    );
  } else if (courses.length === 0) {
    // The designed empty state: "programmes open soon", with a photograph.
    content = (
      <div data-courses-launching="" className="rw-grid rwl-launching">
        <RiwaqWindow
          shutter
          value={RIWAQ_COURSES_LAUNCHING}
          alt=""
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="rwl-launching-window aspect-[3/2]"
        />
        <div className="rw-cell rwl-launching-copy" data-tick="">
          <h3 className="rw-subtitle">{t('website:riwaq.home.courses.launchingTitle')}</h3>
          <p className="rw-body">{t('website:riwaq.home.courses.launchingDescription')}</p>
          {contactPage ? (
            <RiwaqLink
              href={contactHref}
              linkRenderer={linkRenderer}
              className="rw-btn rw-btn-line"
            >
              {t('website:riwaq.home.courses.launchingAction')}
              <RiwaqArrow />
            </RiwaqLink>
          ) : null}
        </div>
      </div>
    );
  } else {
    content = (
      <ProgrammeExplorer
        courses={courses}
        showPrice={config.showPrice}
        showInstructor={config.showInstructor}
        linkRenderer={linkRenderer}
      />
    );
  }

  return (
    <RiwaqBand labelledBy={title ? headingId : undefined} label={title ? undefined : t('website:riwaq.home.courses.listLabel')}>
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        action={
          catalogHref && courses.length > 0 && !failed ? (
            <RiwaqLink href={catalogHref} linkRenderer={linkRenderer} className="rw-link">
              {t('website:riwaq.home.courses.viewAll')}
              <RiwaqArrow />
            </RiwaqLink>
          ) : null
        }
      />
      {content}
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Instructors — Faculty                                                */
/* ------------------------------------------------------------------ */

export function RiwaqInstructors({
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
    return <RiwaqLiveDataUnavailable isPublic={!!linkRenderer} />;
  }
  // Derived from the real catalogue (never a parallel instructor model),
  // with how many published programmes each teaches.
  const byId = new Map<string, { instructor: CourseInstructorSummary; courses: number }>();
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
      <RiwaqPreviewSample
        headingId={headingId}
        title={title}
        description={description}
        note={t('website:riwaq.home.instructors.previewHidden')}
      >
        <ul className="rw-ledger rwl-faculty">
          {Array.from({ length: Math.min(config.count, 4) }).map((_, index) => (
            <li key={index} className="rwl-plate" data-sample="">
              <span aria-hidden className="rw-monogram">
                —
              </span>
              <span className="min-w-0">
                <span className="rw-subtitle rwl-plate-name">
                  {t('website:riwaq.home.instructors.sampleName')}
                </span>
                <span className="rw-label">
                  {t('website:riwaq.home.instructors.sampleCourses')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </RiwaqPreviewSample>
    );
  }

  return (
    <RiwaqBand labelledBy={title ? headingId : undefined}>
      <RiwaqSectionHead id={headingId} title={title} description={description} />
      <ul
        className="rw-ledger rwl-faculty"
        aria-label={title ? undefined : t('website:riwaq.home.instructors.listLabel')}
      >
        {instructors.map(({ instructor, courses }, index) => (
          <li key={instructor.id} className="rwl-plate">
            <Reveal delayMs={riwaqStagger(index)} className="rwl-plate-body">
              {instructor.avatar ? (
                <img
                  src={instructor.avatar}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="rwl-plate-photo"
                />
              ) : (
                <RiwaqMonogram name={instructor.name} />
              )}
              <span className="min-w-0">
                <h3 className="rw-subtitle rwl-plate-name" dir="auto">
                  {instructor.name}
                </h3>
                <span className="rw-label rw-num">
                  {t('website:riwaq.home.instructors.courseCount', {
                    count: courses,
                    formatted: formatRiwaqNumber(courses, locale),
                  })}
                </span>
              </span>
            </Reveal>
          </li>
        ))}
      </ul>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Statistics — Facts & figures, counting up once on entry              */
/* ------------------------------------------------------------------ */

const COUNT_DURATION_MS = 1100;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A live figure that counts up once when it scrolls into view. The final
 * value is what the server renders and what assistive tech reads (the
 * moving digits are hidden from it); a figure already on screen at load,
 * reduced motion or no IntersectionObserver show the final value at once.
 * Digits are tabular and the box is sized to the final value: no shift.
 */
function CountUp({
  value,
  text,
  locale,
}: {
  readonly value: number;
  readonly text: string;
  readonly locale: 'en' | 'ar';
}): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (
      !element ||
      typeof IntersectionObserver === 'undefined' ||
      prefersReducedMotion()
    ) {
      return undefined;
    }
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return undefined;
    element.textContent = formatRiwaqNumber(0, locale);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / COUNT_DURATION_MS);
          const eased = 1 - Math.pow(1 - progress, 3);
          element.textContent =
            progress < 1
              ? formatRiwaqNumber(Math.round(value * eased), locale)
              : text;
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      element.textContent = text;
    };
  }, [value, text, locale]);
  return (
    <>
      <span
        ref={ref}
        aria-hidden
        className="rw-figure rwl-figure"
        style={{ minInlineSize: `${Array.from(text).length}ch` }}
      >
        {text}
      </span>
      <span className="rw-sr-only">{text}</span>
    </>
  );
}

export function RiwaqStatistics({
  config,
  academyId,
  linkRenderer,
}: SectionRenderProps<'statistics'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  // Live metrics only: a number is the Academy's real count or absent —
  // never a typed claim.
  const liveItems = config.items.filter((item) => !!item.metric);
  const { data, isLoading, isError } = usePublicWebsiteStatistics(
    liveItems.length > 0 ? academyId : undefined
  );
  if (liveItems.length > 0 && isLoading) return null;
  // Live numbers that failed to load are not zeros: the band steps aside.
  if (liveItems.length > 0 && isError && !data) {
    return <RiwaqLiveDataUnavailable isPublic={!!linkRenderer} />;
  }
  const items = liveItems
    .map((item) => {
      const value = item.metric ? (data?.[item.metric] ?? 0) : 0;
      return value > 0
        ? {
            id: item.id,
            value,
            label: resolveLocalizedText(item.label, locale),
            text: formatRiwaqNumber(value, locale),
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
        <RiwaqPreviewNote>{t('website:riwaq.home.statistics.previewHidden')}</RiwaqPreviewNote>
      );
    }
    return (
      <RiwaqPreviewSample
        ground="deep"
        headingId={headingId}
        title={title}
        note={t('website:riwaq.home.statistics.previewHidden')}
      >
        <ul className="rw-ledger rwl-figures">
          {labels.map((item) => (
            <li key={item.id} className="rwl-figure-cell" data-sample="">
              <span aria-hidden className="rw-figure rwl-figure">
                —
              </span>
              <span className="rw-sr-only">{t('website:riwaq.home.statistics.sampleValue')}</span>
              <span className="rw-label rwl-figure-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </RiwaqPreviewSample>
    );
  }

  return (
    <RiwaqBand
      ground="deep"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:riwaq.home.statistics.label')}
    >
      <RiwaqSectionHead id={headingId} title={title} />
      <ul className="rw-ledger rwl-figures" data-count={Math.min(items.length, 4)}>
        {items.map((item) => (
          <li key={item.id} className="rwl-figure-cell">
            <CountUp value={item.value} text={item.text} locale={locale} />
            <span className="rw-label rwl-figure-label">{item.label}</span>
          </li>
        ))}
      </ul>
    </RiwaqBand>
  );
}
