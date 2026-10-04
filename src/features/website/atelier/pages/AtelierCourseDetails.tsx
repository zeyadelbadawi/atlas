/**
 * Atelier Course Details (Reports/THEME_2_ATELIER_PLAN.md §5a "Chrome"):
 * the same course data and enrolment behaviour as every theme
 * (`useCourseDetails`), set as an editorial product spread.
 *
 * - **Title spread:** the trail, category, display title, summary, a
 *   small-caps meta line (level, lessons, quizzes, duration; the rating
 *   only with real reviews), the instructors, and the course's own picture
 *   in an arch (the thumbnail, else Atelier's `course-fallback`).
 * - **Body:** about, what you'll learn, the curriculum as a table of
 *   contents (native disclosures, free previews), requirements,
 *   instructors, then the learner's review form and the reviews — the same
 *   shared components Theme 1 renders, in the same conditions.
 * - **Purchase "ticket":** sticky beside the body on desktop; on phones and
 *   tablets a bar fixed to the bottom (above the mobile navigation) with
 *   the price and the one primary action.
 * - **Related courses:** an index of rows, when there are any.
 *
 * An unknown course renders Atelier's "page not found"; a failed load says
 * so with a retry.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@utils';
import { formatCoursePricing } from '@features/course';
import { usePublicCourseRecommendations } from '@hooks';
import { useCourseDetails } from '@/features/website/renderer/useCourseDetails';
import { CoursePreviewDialog } from '@/features/website/renderer/CoursePreviewDialog';
import { CourseReviews } from '@/features/website/renderer/CourseReviews';
import { MyCourseReviewForm } from '@/features/website/renderer/MyCourseReviewForm';
import { useMobileBottomNavVisibility } from '@/features/website/renderer/useMobileBottomNavVisibility';
import { formatCatalogDuration } from '@/features/website/sections/CourseCatalogSection';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { Reveal } from '@/features/website/primitives';
import type { ThemeCourseDetailsProps } from '@/features/website/theme-packs/theme-pack.types';
import type { Course } from '@types';
import {
  AtelierChapter,
  AtelierHeading,
  AtelierLink,
  AtelierMedia,
  AtelierMonogram,
  formatAtelierIndex,
} from '../atelier-parts';
import { AtelierCourseRow } from './AtelierCourseRow';
import { AtelierNotFound } from './AtelierSystemPages';
import '../atelier-pages.css';

const COURSE_FALLBACK = 'theme-asset:atelier/course-fallback';

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
  readonly children: ReactNode;
}): JSX.Element {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="atp-block scroll-mt-28"
    >
      <h2 id={headingId} className="at-subtitle atp-block-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RelatedCourses({
  academyId,
  courseId,
  locale,
  linkRenderer,
}: {
  readonly academyId: string;
  readonly courseId: string;
  readonly locale: 'en' | 'ar';
  readonly linkRenderer?: ThemeCourseDetailsProps['linkRenderer'];
}): JSX.Element | null {
  const { t } = useTranslation();
  const headingId = useId();
  const { data } = usePublicCourseRecommendations(academyId, courseId);
  if (!data || data.length === 0) return null;
  return (
    <AtelierChapter env="deep" labelledBy={headingId} thread="none">
      <AtelierHeading id={headingId} className="mb-10">
        {t('website:renderer.courseDetails.relatedTitle')}
      </AtelierHeading>
      <Reveal>
        <ol className="atp-index">
          {data.slice(0, 3).map((related, index) => (
            <li key={related.id}>
              <AtelierCourseRow
                course={related as Course}
                index={formatAtelierIndex(index, locale)}
                linkRenderer={linkRenderer}
              />
            </li>
          ))}
        </ol>
      </Reveal>
    </AtelierChapter>
  );
}

export function AtelierCourseDetails({
  academyId,
  courseId,
  locale = 'en',
  pages,
  linkRenderer,
}: ThemeCourseDetailsProps): JSX.Element {
  const { t } = useTranslation();
  const bottomNavRoute = useMobileBottomNavVisibility();
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
  } = useCourseDetails(academyId, courseId, locale);

  if (isLoading) {
    // A full viewport while loading, so the footer starts below the fold
    // and the loaded course doesn't push it down (no layout shift).
    return (
      <div aria-busy="true" className="min-h-[100svh]">
        <div className="at-container grid gap-10 py-16 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="atp-skeleton h-3 w-1/4" />
            <div className="atp-skeleton h-16 w-4/5" />
            <div className="atp-skeleton h-5 w-full" />
          </div>
          <div className="atp-skeleton aspect-[4/5] lg:col-span-4 lg:col-start-9" />
        </div>
      </div>
    );
  }

  // No such course here — unknown, unpublished or not public (the public
  // endpoint's 404 becomes `null`): the theme's "page not found".
  if (!error && !course) {
    return <AtelierNotFound pages={pages} linkRenderer={linkRenderer} />;
  }

  if (error || !course) {
    return (
      <AtelierChapter
        label={t('website:atelier.pages.courseDetails.errorTitle')}
        thread="none"
      >
        <div className="atp-statement" data-course-error="">
          <p className="at-subtitle">
            {t('website:atelier.pages.courseDetails.errorTitle')}
          </p>
          <p className="at-lead mt-4">
            {t('website:atelier.pages.courseDetails.errorDescription')}
          </p>
          <button
            type="button"
            className="at-btn-ghost mt-8"
            onClick={() => void refetch()}
          >
            {t('website:atelier.pages.courseDetails.retry')}
          </button>
        </div>
      </AtelierChapter>
    );
  }

  const stats = course.stats;
  const reviews = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const lessons = stats?.totalLessons ?? 0;
  const quizzes = stats?.totalQuizzes ?? 0;
  const assignments = stats?.totalAssignments ?? 0;
  const sections = stats?.totalSections ?? 0;
  const duration = formatCatalogDuration(stats?.durationSeconds, t);
  const curriculumLessons =
    curriculum?.reduce((sum, section) => sum + section.lessons.length, 0) ?? 0;
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
      className={cn('at-btn at-btn-lg', className)}
      data-course-action={action.kind}
    >
      {action.busy ? (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : action.kind === 'completed' ? (
        <CheckCircle2 className="size-4" aria-hidden />
      ) : null}
      {t(action.labelKey)}
    </button>
  );

  const meta = [
    course.level
      ? t(`website:renderer.courseDetails.level.${course.level}`)
      : null,
    lessons > 0
      ? t('website:renderer.courseDetails.lessonCount', { count: lessons })
      : null,
    quizzes > 0
      ? t('website:renderer.courseDetails.quizCount', { count: quizzes })
      : null,
    duration,
  ].filter((item): item is string => !!item);

  const includes = [
    lessons > 0
      ? t('website:renderer.courseDetails.lessonCount', { count: lessons })
      : null,
    quizzes > 0
      ? t('website:renderer.courseDetails.quizCount', { count: quizzes })
      : null,
    assignments > 0
      ? t('website:renderer.courseDetails.assignmentCount', {
          count: assignments,
        })
      : null,
    sections > 0
      ? t('website:renderer.courseDetails.sectionCount', { count: sections })
      : null,
    duration,
    stats?.hasPreview
      ? t('website:atelier.pages.courseDetails.hasPreview')
      : null,
    course.language ? course.language.toUpperCase() : null,
  ].filter((item): item is string => !!item);

  return (
    <article data-atelier-course-details="">
      {/* The title spread. */}
      <AtelierChapter as="header" thread="start" className="atp-masthead">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="min-w-0 space-y-7 lg:col-span-7">
            <nav
              aria-label={t('website:atelier.pages.courseDetails.breadcrumb')}
            >
              <ol className="atp-trail at-label">
                <li>
                  <AtelierLink
                    href={catalogHref}
                    linkRenderer={linkRenderer}
                    className="atp-text-btn min-h-0"
                  >
                    {t('website:atelier.pages.courseDetails.allCourses')}
                  </AtelierLink>
                </li>
                {course.category ? (
                  <li>
                    <AtelierLink
                      href={categoryHref}
                      linkRenderer={linkRenderer}
                      className="atp-text-btn min-h-0"
                    >
                      <span dir="auto">{course.category.name}</span>
                    </AtelierLink>
                  </li>
                ) : null}
              </ol>
            </nav>
            <h1 className="at-display atp-spread-title break-words" dir="auto">
              {course.title}
            </h1>
            {course.shortDescription ? (
              <p className="at-lead" dir="auto">
                {course.shortDescription}
              </p>
            ) : null}
            {meta.length > 0 || reviews > 0 ? (
              <p className="at-label atp-meta" data-atlas-numeric="true">
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
                {reviews > 0 ? (
                  <a
                    href="#reviews"
                    className="at-link normal-case tracking-normal"
                  >
                    <span aria-hidden>{rating.toFixed(1)} / 5 · </span>
                    <span className="sr-only">
                      {t('website:renderer.courseDetails.ratingLabel', {
                        rating: rating.toFixed(1),
                      })}
                      ,{' '}
                    </span>
                    {t('website:renderer.courseDetails.reviewCount', {
                      count: reviews,
                    })}
                  </a>
                ) : null}
              </p>
            ) : null}
            {course.instructors.length > 0 ? (
              <p className="text-[0.9375rem] text-[var(--atelier-text-muted)]">
                {t('website:atelier.pages.courseDetails.taughtBy')}{' '}
                <span
                  className="at-serif text-lg text-[var(--atelier-text)]"
                  dir="auto"
                >
                  {course.instructors
                    .map((instructor) => instructor.name)
                    .join(', ')}
                </span>
              </p>
            ) : null}
          </div>
          <div aria-hidden className="lg:col-span-4 lg:col-start-9">
            <AtelierMedia
              value={course.thumbnail || COURSE_FALLBACK}
              alt=""
              shape="arch"
              priority
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="mx-auto aspect-[4/5] w-full max-w-sm lg:max-w-none"
            />
          </div>
        </div>
      </AtelierChapter>

      <div className="at-container">
        <div className="at-body grid gap-14 py-16 md:py-20 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            {course.description ? (
              <Block title={t('website:renderer.courseDetails.aboutTitle')}>
                <p
                  className="max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed text-[var(--atelier-text-muted)]"
                  dir="auto"
                >
                  {course.description}
                </p>
              </Block>
            ) : null}

            {course.outcomes && course.outcomes.length > 0 ? (
              <Block title={t('website:renderer.courseDetails.outcomesTitle')}>
                <ol className="grid gap-x-10 sm:grid-cols-2">
                  {course.outcomes.map((outcome, index) => (
                    <li
                      key={index}
                      className="flex items-baseline gap-4 border-b border-[var(--atelier-hairline)] py-4"
                    >
                      <span aria-hidden className="at-numeral text-lg">
                        {formatAtelierIndex(index, locale)}
                      </span>
                      <span dir="auto">{outcome}</span>
                    </li>
                  ))}
                </ol>
              </Block>
            ) : null}

            {curriculum && curriculum.length > 0 ? (
              <Block
                title={t('website:renderer.courseDetails.curriculumTitle')}
              >
                <p className="at-label mb-5" data-atlas-numeric="true">
                  {[
                    t('website:renderer.courseDetails.sectionCount', {
                      count: curriculum.length,
                    }),
                    // The curriculum lists lessons only; quizzes and
                    // assignments come from the course's own counts, so a
                    // quiz-only course never reads "0 lessons".
                    curriculumLessons > 0
                      ? t('website:renderer.courseDetails.lessonCount', {
                          count: curriculumLessons,
                        })
                      : null,
                    quizzes > 0
                      ? t('website:renderer.courseDetails.quizCount', {
                          count: quizzes,
                        })
                      : null,
                    assignments > 0
                      ? t('website:renderer.courseDetails.assignmentCount', {
                          count: assignments,
                        })
                      : null,
                    duration,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <ol
                  className="atp-toc"
                  aria-label={t('website:atelier.pages.courseDetails.contents')}
                >
                  {curriculum.map((section, index) => (
                    <li key={section.id}>
                      <details open={index === 0}>
                        <summary>
                          <span aria-hidden className="at-numeral text-lg">
                            {formatAtelierIndex(index, locale)}
                          </span>
                          <span className="at-serif min-w-0 text-xl" dir="auto">
                            {section.title}
                          </span>
                          <span aria-hidden className="atp-toc-leader" />
                          {section.lessons.length > 0 ? (
                            <span className="at-label whitespace-nowrap">
                              {t('website:renderer.courseDetails.lessonCount', {
                                count: section.lessons.length,
                              })}
                            </span>
                          ) : null}
                          <ChevronDown
                            className="atp-toc-chevron size-4 shrink-0"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </summary>
                        {section.lessons.length > 0 ? (
                          <ul className="atp-lessons pb-4">
                            {section.lessons.map((lesson) => {
                              const Icon =
                                CONTENT_TYPE_ICON[lesson.contentType];
                              return (
                                <li key={lesson.id}>
                                  <Icon
                                    className="size-4 shrink-0 text-[var(--atelier-text-muted)]"
                                    strokeWidth={1.5}
                                    aria-hidden
                                  />
                                  <span
                                    className="min-w-0 flex-1 text-[0.9375rem]"
                                    dir="auto"
                                  >
                                    {lesson.title}
                                  </span>
                                  {lesson.isPreview ? (
                                    <button
                                      type="button"
                                      className="atp-text-btn text-[var(--atelier-brand)]"
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
                                      <PlayCircle
                                        className="size-4"
                                        strokeWidth={1.5}
                                        aria-hidden
                                      />
                                      {t(
                                        'website:renderer.courseDetails.previewAction'
                                      )}
                                    </button>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </details>
                    </li>
                  ))}
                </ol>
              </Block>
            ) : isLoadingCurriculum ? (
              <div aria-hidden className="atp-block atp-skeleton h-40" />
            ) : null}

            {course.requirements && course.requirements.length > 0 ? (
              <Block
                title={t('website:renderer.courseDetails.requirementsTitle')}
              >
                <ul className="space-y-3">
                  {course.requirements.map((requirement, index) => (
                    <li
                      key={index}
                      className="flex items-baseline gap-4 text-[var(--atelier-text-muted)]"
                    >
                      <span
                        aria-hidden
                        className="h-px w-4 shrink-0 translate-y-[-0.3em] bg-[var(--atelier-accent)]"
                      />
                      <span dir="auto">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}

            {course.instructors.length > 0 ? (
              <Block title={t('website:renderer.instructorsLabel')}>
                <ul className="grid gap-6 sm:grid-cols-2">
                  {course.instructors.map((instructor) => (
                    <li key={instructor.id} className="flex items-center gap-5">
                      {instructor.avatar ? (
                        <img
                          src={instructor.avatar}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-16 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <AtelierMonogram
                          name={instructor.name}
                          className="size-16 shrink-0 rounded-full text-xl"
                        />
                      )}
                      <p className="at-serif min-w-0 text-xl" dir="auto">
                        {instructor.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}

            <div id="reviews" className="atp-block scroll-mt-28 space-y-10">
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

          {/* The purchase ticket: sticky beside the body on desktop. */}
          <aside
            aria-label={t('website:atelier.pages.courseDetails.purchase')}
            className="hidden lg:col-span-4 lg:col-start-9 lg:block"
          >
            <div className="atp-ticket" data-atelier-ticket="">
              <p className="at-label">
                {t('website:atelier.pages.courseDetails.purchase')}
              </p>
              <p className="atp-ticket-price mt-4" data-atlas-numeric="true">
                {price}
              </p>
              <hr className="atp-perforation" />
              {actionButton('w-full')}
              {enrollError ? (
                <p role="alert" className="atp-error mt-4 text-sm">
                  {t('website:renderer.courseDetails.enrollError')}
                </p>
              ) : null}
              {includes.length > 0 ? (
                <div className="mt-7">
                  <p className="at-label mb-2">
                    {t('website:atelier.pages.courseDetails.includes')}
                  </p>
                  <ul className="atp-includes">
                    {includes.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <RelatedCourses
        academyId={academyId}
        courseId={courseId}
        locale={locale}
        linkRenderer={linkRenderer}
      />

      {/* Phones and tablets: the price and the action stay one tap away. */}
      <div
        data-atelier-purchase-bar=""
        className={cn(
          'atp-purchase-bar lg:hidden',
          showBar
            ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0'
            : 'bottom-0'
        )}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="atp-price text-2xl" data-atlas-numeric="true">
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
