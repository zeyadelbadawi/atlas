/**
 * Theme 1 Course Details (plan §C.0, §C.3): the same course data and
 * enrolment behaviour as every theme (`useCourseDetails`), in Theme 1's
 * composition.
 *
 * - **Hero (soft band):** breadcrumb, category, display title, summary,
 *   meta (level, lessons, sections, duration, language), rating only when
 *   there are reviews, the instructors, and the course's own media (the
 *   thumbnail, or the brand-tinted fallback pattern).
 * - **Body:** about, what you'll learn, course content (curriculum with
 *   free previews), requirements, instructors, then reviews and the
 *   learner's own review form.
 * - **Purchase:** a sticky card beside the body on desktop. On phones and
 *   tablets it becomes a bar fixed to the bottom of the screen (above the
 *   mobile bottom navigation), with the price and the one primary action.
 * - **Related courses:** Theme 1 course cards.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Layers,
  Loader2,
  PlayCircle,
  RotateCw,
  Star,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@utils';
import { formatCoursePricing } from '@features/course';
import { usePublicCourseRecommendations } from '@hooks';
import { useCourseDetails } from '../renderer/useCourseDetails';
import { CoursePreviewDialog } from '../renderer/CoursePreviewDialog';
import { CourseReviews } from '../renderer/CourseReviews';
import { MyCourseReviewForm } from '../renderer/MyCourseReviewForm';
import { useMobileBottomNavVisibility } from '../renderer/useMobileBottomNavVisibility';
import { formatCatalogDuration } from '../sections/CourseCatalogSection';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import type { ThemeCourseDetailsProps } from '../theme-packs/theme-pack.types';
import type { Course } from '@types';
import { InitialsAvatar, T1Heading, T1Link, formatT1Number } from './t1-parts';
import { CourseFallbackPattern, T1CourseCard } from './T1CourseCard';
import { T1NotFound } from './T1SystemPages';

const CONTENT_TYPE_ICON = {
  video: PlayCircle,
  file: FileText,
  text: BookOpen,
} as const;

function Block({
  title,
  id,
  children,
}: {
  readonly title: string;
  readonly id?: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-28">
      <h2
        id={headingId}
        className="mb-5 font-display text-2xl font-bold text-[var(--website-foreground)]"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function RelatedCourses({
  academyId,
  courseId,
  linkRenderer,
}: {
  readonly academyId: string;
  readonly courseId: string;
  readonly linkRenderer?: ThemeCourseDetailsProps['linkRenderer'];
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const headingId = useId();
  const { data } = usePublicCourseRecommendations(academyId, courseId);
  if (!data || data.length === 0) return null;
  return (
    <section
      aria-labelledby={headingId}
      data-tone="soft"
      className="t1-section bg-[var(--website-surface)]"
    >
      <div className={container}>
        <T1Heading id={headingId} className="mb-10">
          {t('website:renderer.courseDetails.relatedTitle')}
        </T1Heading>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.slice(0, 3).map((related) => (
            <li key={related.id}>
              <T1CourseCard
                course={related as Course}
                linkRenderer={linkRenderer}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function T1CourseDetails({
  academyId,
  courseId,
  locale = 'en',
  pages,
  linkRenderer,
}: ThemeCourseDetailsProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const bottomNavRoute = useMobileBottomNavVisibility();
  const details = useCourseDetails(academyId, courseId, locale);
  const {
    course,
    isLoading,
    error,
    refetch,
    curriculum,
    isLoadingCurriculum,
    previewLesson,
    setPreviewLesson,
    isAuthenticated,
    isEnrolled,
    enrollError,
    action,
  } = details;

  if (isLoading) {
    // The loading state reserves a full viewport so the footer starts below
    // the fold; otherwise the loaded course pushes it down (CLS ≈ 0.33).
    return (
      <div
        aria-busy="true"
        className="min-h-[100svh] bg-[var(--website-surface)]"
      >
        <div className={cn(container, 'grid gap-10 py-14 lg:grid-cols-2')}>
          <div className="space-y-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
            <div className="h-12 w-4/5 animate-pulse rounded bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
            <div className="h-5 w-full animate-pulse rounded bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
          </div>
          <div className="aspect-[16/9] animate-pulse rounded-[var(--t1-radius-card)] bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  // No such course here — unknown, unpublished or not public (the public
  // endpoint answers 404, which the service turns into `null`): the
  // theme's own "page not found", not a connection error (the page is
  // also marked noindex — `PublicWebsitePage`).
  if (!error && !course) {
    return <T1NotFound pages={pages} linkRenderer={linkRenderer} />;
  }

  if (error || !course) {
    return (
      <div className={cn(container, 't1-section')}>
        <div className="t1-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <p className="font-display text-xl font-bold">
            {t('website:theme1.courseDetails.errorTitle')}
          </p>
          <p className="text-[var(--website-foreground-muted)]">
            {t('website:theme1.courseDetails.errorDescription')}
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
      </div>
    );
  }

  const stats = course.stats;
  const reviews = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const lessons = stats?.totalLessons ?? 0;
  const sections = stats?.totalSections ?? 0;
  const duration = formatCatalogDuration(stats?.durationSeconds, t);
  const price = formatCoursePricing(course.pricing, t);
  const catalogHref = linkRenderer ? resolveCatalogHref(pages) : undefined;
  const categoryHref =
    linkRenderer && course.category
      ? resolveCatalogHref(pages, { category: course.category.id })
      : undefined;
  const showBar = bottomNavRoute && !!linkRenderer;

  const actionButton = (className?: string) => (
    <button
      type="button"
      onClick={action.onSelect}
      disabled={action.busy}
      className={cn('t1-cta t1-btn-lg', className)}
      data-course-action={action.kind}
    >
      {action.busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : action.kind === 'continue' ? (
        <CheckCircle2 className="size-4" aria-hidden />
      ) : null}
      {t(action.labelKey)}
    </button>
  );

  const includes = [
    lessons > 0
      ? {
          Icon: PlayCircle,
          text: t('website:renderer.courseDetails.lessonCount', {
            count: lessons,
          }),
        }
      : null,
    sections > 0
      ? {
          Icon: Layers,
          text: t('website:renderer.courseDetails.sectionCount', {
            count: sections,
          }),
        }
      : null,
    duration ? { Icon: Clock, text: duration } : null,
    stats?.hasPreview
      ? { Icon: PlayCircle, text: t('website:theme1.courseDetails.hasPreview') }
      : null,
    course.language
      ? { Icon: Globe, text: course.language.toUpperCase() }
      : null,
  ].filter((item): item is NonNullable<typeof item> => !!item);

  return (
    <article data-t1-course-details="">
      {/* The course-detail hero (§C.0). */}
      <header
        data-tone="soft"
        data-t1-page-hero="course"
        className="bg-[var(--website-surface)] text-[var(--website-foreground)]"
      >
        <div
          className={cn(
            container,
            'grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14'
          )}
        >
          <div className="min-w-0 space-y-5">
            <nav aria-label={t('website:theme1.courseDetails.breadcrumb')}>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--website-foreground-muted)]">
                <li>
                  <T1Link
                    href={catalogHref}
                    linkRenderer={linkRenderer}
                    className="t1-link min-h-0 text-sm"
                  >
                    {t('website:theme1.courseDetails.allCourses')}
                  </T1Link>
                </li>
                {course.category ? (
                  <li className="flex items-center gap-1.5">
                    <ChevronRight
                      className="size-4 rtl:-scale-x-100"
                      aria-hidden
                    />
                    <T1Link
                      href={categoryHref}
                      linkRenderer={linkRenderer}
                      className="t1-link min-h-0 text-sm"
                    >
                      <span dir="auto">{course.category.name}</span>
                    </T1Link>
                  </li>
                ) : null}
              </ol>
            </nav>
            <h1
              className="t1-title break-words font-display font-bold md:text-[2.75rem]"
              dir="auto"
            >
              {course.title}
            </h1>
            {course.shortDescription ? (
              <p className="t1-lead" dir="auto">
                {course.shortDescription}
              </p>
            ) : null}
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[var(--website-foreground-muted)]"
              data-atlas-numeric="true"
            >
              {course.level ? (
                <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--website-chip-bg)] px-3 text-sm font-semibold text-[var(--website-chip-fg)]">
                  {t(`website:renderer.courseDetails.level.${course.level}`)}
                </span>
              ) : null}
              {reviews > 0 ? (
                <a
                  href="#reviews"
                  className="t1-link min-h-0 gap-1.5 text-sm text-[var(--website-foreground)]"
                >
                  <Star
                    className="size-4 fill-[var(--website-warning)] text-[var(--website-warning)]"
                    aria-hidden
                  />
                  <span className="font-bold">{rating.toFixed(1)}</span>
                  <span className="font-normal text-[var(--website-foreground-muted)]">
                    {t('website:renderer.courseDetails.reviewCount', {
                      count: reviews,
                    })}
                  </span>
                </a>
              ) : null}
              {lessons > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <PlayCircle className="size-4" aria-hidden />
                  {t('website:renderer.courseDetails.lessonCount', {
                    count: lessons,
                  })}
                </span>
              ) : null}
              {duration ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden />
                  <span className="sr-only">
                    {t('website:renderer.courseCatalog.durationLabel')}:{' '}
                  </span>
                  {duration}
                </span>
              ) : null}
            </div>
            {course.instructors.length > 0 ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {course.instructors
                    .slice(0, 3)
                    .map((instructor) =>
                      instructor.avatar ? (
                        <img
                          key={instructor.id}
                          src={instructor.avatar}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-9 rounded-full border-2 border-[var(--website-surface)] object-cover"
                        />
                      ) : (
                        <InitialsAvatar
                          key={instructor.id}
                          name={instructor.name}
                          className="size-9 border-2 border-[var(--website-surface)] text-xs"
                        />
                      )
                    )}
                </div>
                <p className="text-sm text-[var(--website-foreground-muted)]">
                  {t('website:theme1.courseDetails.taughtBy')}{' '}
                  <span
                    className="font-semibold text-[var(--website-foreground)]"
                    dir="auto"
                  >
                    {course.instructors.map((i) => i.name).join(', ')}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="t1-media aspect-[16/9] shadow-[var(--t1-shadow-lift)]">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt=""
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <CourseFallbackPattern title={course.title} />
            )}
          </div>
        </div>
      </header>

      <div
        className={cn(
          container,
          'grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14'
        )}
      >
        <div className="min-w-0 space-y-14">
          {course.description ? (
            <Block title={t('website:renderer.courseDetails.aboutTitle')}>
              <p
                className="max-w-prose whitespace-pre-line text-base leading-relaxed text-[var(--website-foreground-muted)]"
                dir="auto"
              >
                {course.description}
              </p>
            </Block>
          ) : null}

          {course.outcomes && course.outcomes.length > 0 ? (
            <Block title={t('website:renderer.courseDetails.outcomesTitle')}>
              <ul className="grid gap-4 rounded-[var(--t1-radius-card)] bg-[var(--website-surface)] p-6 sm:grid-cols-2 md:p-8">
                {course.outcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-[var(--website-link)]"
                      aria-hidden
                    />
                    <span dir="auto">{outcome}</span>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          {curriculum && curriculum.length > 0 ? (
            <Block title={t('website:renderer.courseDetails.curriculumTitle')}>
              <p
                className="mb-4 text-sm text-[var(--website-foreground-muted)]"
                data-atlas-numeric="true"
              >
                {[
                  t('website:renderer.courseDetails.sectionCount', {
                    count: curriculum.length,
                  }),
                  t('website:renderer.courseDetails.lessonCount', {
                    count: curriculum.reduce(
                      (sum, section) => sum + section.lessons.length,
                      0
                    ),
                  }),
                  duration,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <Accordion
                type="multiple"
                defaultValue={curriculum[0] ? [curriculum[0].id] : []}
                className="overflow-hidden rounded-[var(--t1-radius-card)] border border-[var(--website-border)]"
              >
                {curriculum.map((section, index) => (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="border-[var(--website-border)] px-5 last:border-b-0"
                  >
                    <AccordionTrigger className="t1-faq-trigger min-h-14 gap-3 text-start text-base font-semibold hover:no-underline [&>svg]:text-[var(--website-link)]">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="t1-number size-8 text-sm" aria-hidden>
                          {formatT1Number(index + 1, locale)}
                        </span>
                        <span className="min-w-0 break-words" dir="auto">
                          {section.title}
                        </span>
                      </span>
                      <span className="me-2 whitespace-nowrap text-xs font-normal text-[var(--website-foreground-muted)]">
                        {t('website:renderer.courseDetails.lessonCount', {
                          count: section.lessons.length,
                        })}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 pb-2">
                        {section.lessons.map((lesson) => {
                          const Icon = CONTENT_TYPE_ICON[lesson.contentType];
                          return (
                            <li
                              key={lesson.id}
                              className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-[var(--website-foreground)]"
                            >
                              <Icon
                                className="size-4 shrink-0 text-[var(--website-foreground-muted)]"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1" dir="auto">
                                {lesson.title}
                              </span>
                              {lesson.isPreview ? (
                                <button
                                  type="button"
                                  className="t1-btn-secondary min-h-9 shrink-0 px-3 text-xs"
                                  onClick={() =>
                                    setPreviewLesson({
                                      id: lesson.id,
                                      title: lesson.title,
                                    })
                                  }
                                  aria-label={t(
                                    'website:renderer.courseDetails.previewActionLabel',
                                    { title: lesson.title }
                                  )}
                                >
                                  <PlayCircle className="size-4" aria-hidden />
                                  {t(
                                    'website:renderer.courseDetails.previewAction'
                                  )}
                                </button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Block>
          ) : isLoadingCurriculum ? (
            <div className="h-40 animate-pulse rounded-[var(--t1-radius-card)] bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
          ) : null}

          {course.requirements && course.requirements.length > 0 ? (
            <Block
              title={t('website:renderer.courseDetails.requirementsTitle')}
            >
              <ul className="space-y-2">
                {course.requirements.map((requirement, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[var(--website-foreground-muted)]"
                  >
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--website-highlight)]"
                    />
                    <span dir="auto">{requirement}</span>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          {course.instructors.length > 0 ? (
            <Block title={t('website:renderer.instructorsLabel')}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {course.instructors.map((instructor) => (
                  <li
                    key={instructor.id}
                    className="t1-card flex items-center gap-4 p-5"
                  >
                    {instructor.avatar ? (
                      <img
                        src={instructor.avatar}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-14 rounded-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar
                        name={instructor.name}
                        className="size-14 text-lg"
                      />
                    )}
                    <p className="min-w-0 font-semibold" dir="auto">
                      {instructor.name}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          <div id="reviews" className="scroll-mt-28 space-y-10">
            <MyCourseReviewForm
              academyId={academyId}
              courseId={courseId}
              canReview={isAuthenticated && isEnrolled}
            />
            <CourseReviews
              academyId={academyId}
              courseId={courseId}
              locale={locale}
            />
          </div>

          <CoursePreviewDialog
            courseId={courseId}
            lessonId={previewLesson?.id ?? null}
            lessonTitle={previewLesson?.title ?? ''}
            onOpenChange={(open) => {
              if (!open) setPreviewLesson(null);
            }}
          />
        </div>

        {/* The purchase card: sticky beside the content on desktop. */}
        <aside
          aria-label={t('website:theme1.courseDetails.purchase')}
          className="hidden lg:block"
        >
          <div className="t1-card sticky top-[calc(var(--t1-header-height)+1.5rem)] space-y-5 p-6 shadow-[var(--t1-shadow-lift)]">
            <p
              className="font-display text-3xl font-bold"
              data-atlas-numeric="true"
            >
              {price}
            </p>
            {actionButton('w-full')}
            {enrollError ? (
              <p
                role="alert"
                className="text-sm font-medium text-[var(--website-error)]"
              >
                {t('website:renderer.courseDetails.enrollError')}
              </p>
            ) : null}
            {includes.length > 0 ? (
              <div className="border-t border-[var(--website-border)] pt-5">
                <p className="mb-3 text-sm font-semibold">
                  {t('website:theme1.courseDetails.includes')}
                </p>
                <ul className="space-y-2.5 text-sm text-[var(--website-foreground-muted)]">
                  {includes.map(({ Icon, text }) => (
                    <li key={text} className="flex items-center gap-2.5">
                      <Icon
                        className="size-4 shrink-0 text-[var(--website-link)]"
                        aria-hidden
                      />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <RelatedCourses
        academyId={academyId}
        courseId={courseId}
        linkRenderer={linkRenderer}
      />

      {/* Phones and tablets: the price and the action stay one tap away. */}
      <div
        data-t1-purchase-bar=""
        className={cn(
          'fixed inset-x-0 z-30 border-t border-[var(--website-border)] bg-[var(--website-background)] px-4 py-3 shadow-[var(--t1-shadow-header)] lg:hidden',
          showBar
            ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0'
            : 'bottom-0'
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p
            className="font-display text-xl font-bold"
            data-atlas-numeric="true"
          >
            {price}
          </p>
          {actionButton('min-h-11')}
        </div>
      </div>
      {/* Room for the bar, so it never covers the page's last content. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </article>
  );
}
