/**
 * Manara Course Details (Reports/THEME_3_MANARA_PLAN.md §3.11): the same
 * course data and enrolment behaviour as every theme (`useCourseDetails`),
 * set as a night poster with a day body.
 *
 * - **Poster header** (night, slanted seam, the beam): the trail, the
 *   category pill, the title as the page's h1, the summary, meta pills
 *   (level, duration, lessons, quizzes; the rating only with real reviews),
 *   the teachers, and the course's own picture in a slanted frame (the
 *   thumbnail, else Manara's `course-fallback`), loaded eagerly as the
 *   page's lead image.
 * - **Body** (day): about, what you'll learn and the requirements as bold
 *   lists, the curriculum as a numbered track (parts → lessons, free
 *   previews marked), the teachers' name plates, then the learner's review
 *   form and the reviews — the same shared components Theme 1 renders, in
 *   the same conditions.
 * - **Enrolment panel:** a card sticky beside the body from 1024px; on
 *   phones and tablets a bar fixed to the bottom (above the mobile
 *   navigation, inside the safe area) with the price and the one primary
 *   action — the action is the hook's, exactly as Atelier and Theme 1 use it.
 * - **Related courses:** poster cards on the soft ground, when there are any.
 *
 * An unknown course renders Manara's "page not found"; a failed load says
 * so with a retry.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Check,
  CheckCircle2,
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
  ManaraBlock,
  ManaraHeading,
  ManaraLink,
  ManaraMedia,
  ManaraMonogram,
  ManaraPill,
  formatManaraIndex,
} from '../manara-parts';
import { ManaraCourseCard } from './ManaraCourseCard';
import { ManaraStatement } from './ManaraCourseCatalog';
import { ManaraNotFound } from './ManaraSystemPages';
import '../manara-pages.css';

const COURSE_FALLBACK = 'theme-asset:manara/course-fallback';

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
      className="mnp-section scroll-mt-28"
    >
      <h2 id={headingId} className="mn-subtitle mnp-section-title">
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
  const headingId = useId();
  const { data } = usePublicCourseRecommendations(academyId, courseId);
  if (!data || data.length === 0) return null;
  return (
    <ManaraBlock env="soft" labelledBy={headingId}>
      <ManaraHeading id={headingId} className="mb-8">
        {t('website:renderer.courseDetails.relatedTitle')}
      </ManaraHeading>
      <Reveal>
        <ul className="mnp-grid">
          {data.slice(0, 3).map((related) => (
            <li key={related.id} className="min-w-0">
              <ManaraCourseCard
                course={related as Course}
                linkRenderer={linkRenderer}
              />
            </li>
          ))}
        </ul>
      </Reveal>
    </ManaraBlock>
  );
}

export function ManaraCourseDetails({
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
        <ManaraBlock env="night" seamBottom>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="grid gap-5 lg:col-span-7">
              <span className="mnp-skeleton h-4 w-1/4" />
              <span className="mnp-skeleton h-16 w-4/5" />
              <span className="mnp-skeleton h-5 w-full" />
              <span className="mnp-skeleton h-8 w-2/3" />
            </div>
            <span className="mnp-skeleton aspect-[3/2] lg:col-span-5" />
          </div>
        </ManaraBlock>
      </div>
    );
  }

  // No such course here — unknown, unpublished or not public (the public
  // endpoint's 404 becomes `null`): the theme's "page not found".
  if (!error && !course) {
    return <ManaraNotFound pages={pages} linkRenderer={linkRenderer} />;
  }

  if (error || !course) {
    return (
      <ManaraBlock
        env="night"
        label={t('website:manara.pages.courseDetails.errorTitle')}
      >
        <ManaraStatement
          marker={{ 'data-course-error': '' }}
          title={t('website:manara.pages.courseDetails.errorTitle')}
          description={t('website:manara.pages.courseDetails.errorDescription')}
          action={
            <button
              type="button"
              className="mn-btn mn-btn-outline"
              onClick={() => void refetch()}
            >
              {t('website:manara.pages.courseDetails.retry')}
            </button>
          }
        />
      </ManaraBlock>
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
      className={cn('mn-btn mn-btn-lg', className)}
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
    duration,
    lessons > 0
      ? t('website:renderer.courseDetails.lessonCount', { count: lessons })
      : null,
    quizzes > 0
      ? t('website:renderer.courseDetails.quizCount', { count: quizzes })
      : null,
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
      ? t('website:manara.pages.courseDetails.hasPreview')
      : null,
    course.language ? course.language.toUpperCase() : null,
  ].filter((item): item is string => !!item);

  const curriculumSummary = [
    t('website:renderer.courseDetails.sectionCount', {
      count: curriculum?.length ?? 0,
    }),
    // The curriculum lists lessons only; quizzes and assignments come from
    // the course's own counts, so a quiz-only course never reads "0 lessons".
    curriculumLessons > 0
      ? t('website:renderer.courseDetails.lessonCount', {
          count: curriculumLessons,
        })
      : null,
    quizzes > 0
      ? t('website:renderer.courseDetails.quizCount', { count: quizzes })
      : null,
    assignments > 0
      ? t('website:renderer.courseDetails.assignmentCount', {
          count: assignments,
        })
      : null,
    duration,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article data-manara-course-details="">
      {/* The poster header. */}
      <ManaraBlock
        as="header"
        env="night"
        seamBottom
        beam="end"
        className="mnp-banner"
      >
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="grid min-w-0 gap-5 lg:col-span-7">
            <nav
              aria-label={t('website:manara.pages.courseDetails.breadcrumb')}
            >
              <ol className="mnp-trail">
                <li>
                  <ManaraLink
                    href={catalogHref}
                    linkRenderer={linkRenderer}
                    className="mnp-nav-link"
                  >
                    {t('website:manara.pages.courseDetails.allCourses')}
                  </ManaraLink>
                </li>
                {course.category ? (
                  <li>
                    <ManaraLink
                      href={categoryHref}
                      linkRenderer={linkRenderer}
                      className="mnp-nav-link"
                    >
                      <span dir="auto">{course.category.name}</span>
                    </ManaraLink>
                  </li>
                ) : null}
              </ol>
            </nav>
            {course.category?.name ? (
              <div>
                <ManaraPill tone="accent">
                  <span dir="auto">{course.category.name}</span>
                </ManaraPill>
              </div>
            ) : null}
            <h1 className="mn-display mnp-course-title" dir="auto">
              {course.title}
            </h1>
            {course.shortDescription ? (
              <p className="mn-lead mn-muted" dir="auto">
                {course.shortDescription}
              </p>
            ) : null}
            {meta.length > 0 || reviews > 0 ? (
              <ul className="mnp-meta" data-atlas-numeric="true">
                {meta.map((item) => (
                  <li key={item}>
                    <ManaraPill>{item}</ManaraPill>
                  </li>
                ))}
                {reviews > 0 ? (
                  <li>
                    <a href="#reviews" className="mn-pill">
                      <span aria-hidden>{rating.toFixed(1)} / 5 · </span>
                      <span className="mn-sr-only">
                        {t('website:renderer.courseDetails.ratingLabel', {
                          rating: rating.toFixed(1),
                        })}
                        ,{' '}
                      </span>
                      {t('website:renderer.courseDetails.reviewCount', {
                        count: reviews,
                      })}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            {course.instructors.length > 0 ? (
              <p className="mn-muted text-[0.9375rem]">
                {t('website:manara.pages.courseDetails.taughtBy')}{' '}
                <span
                  className="mn-font-display text-[var(--mn-env-text)]"
                  dir="auto"
                >
                  {course.instructors
                    .map((instructor) => instructor.name)
                    .join(', ')}
                </span>
              </p>
            ) : null}
          </div>
          <div aria-hidden className="lg:col-span-5">
            <ManaraMedia
              value={course.thumbnail || COURSE_FALLBACK}
              alt=""
              shape="slant"
              priority
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="aspect-[3/2] w-full"
            />
          </div>
        </div>
      </ManaraBlock>

      <div className="mn-container">
        <div className="grid gap-12 py-12 md:py-16 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            {course.description ? (
              <Block title={t('website:renderer.courseDetails.aboutTitle')}>
                <p
                  className="mn-body mn-muted whitespace-pre-line text-[1.0625rem]"
                  dir="auto"
                >
                  {course.description}
                </p>
              </Block>
            ) : null}

            {course.outcomes && course.outcomes.length > 0 ? (
              <Block title={t('website:renderer.courseDetails.outcomesTitle')}>
                <ul className="mnp-bold-list" data-columns="">
                  {course.outcomes.map((outcome, index) => (
                    <li key={index}>
                      <Check className="size-5" strokeWidth={2.5} aria-hidden />
                      <span dir="auto">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}

            {curriculum && curriculum.length > 0 ? (
              <Block
                title={t('website:renderer.courseDetails.curriculumTitle')}
              >
                <p className="mn-label mn-muted mb-5" data-atlas-numeric="true">
                  {curriculumSummary}
                </p>
                <ol
                  className="mnp-track"
                  aria-label={t('website:manara.pages.courseDetails.contents')}
                >
                  {curriculum.map((section, index) => (
                    <li key={section.id}>
                      <span aria-hidden className="mnp-track-no">
                        {formatManaraIndex(index, locale)}
                      </span>
                      <div className="mnp-track-head">
                        <h3
                          className="mn-font-display min-w-0 text-lg font-bold"
                          dir="auto"
                        >
                          <span className="mn-sr-only">
                            {t(
                              'website:manara.pages.courseDetails.sectionLabel',
                              {
                                index: formatManaraIndex(index, locale),
                              }
                            )}{' '}
                          </span>
                          {section.title}
                        </h3>
                        {section.lessons.length > 0 ? (
                          <ManaraPill>
                            {t('website:renderer.courseDetails.lessonCount', {
                              count: section.lessons.length,
                            })}
                          </ManaraPill>
                        ) : null}
                      </div>
                      {section.lessons.length > 0 ? (
                        <ul className="mnp-lessons">
                          {section.lessons.map((lesson) => {
                            const Icon = CONTENT_TYPE_ICON[lesson.contentType];
                            return (
                              <li key={lesson.id}>
                                <Icon
                                  className="size-4"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <span
                                  className="min-w-0 flex-1 text-[0.9375rem] font-medium"
                                  dir="auto"
                                >
                                  {lesson.title}
                                </span>
                                {lesson.isPreview ? (
                                  <button
                                    type="button"
                                    className="mn-link min-h-11 text-sm"
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
                                      strokeWidth={2}
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
                    </li>
                  ))}
                </ol>
              </Block>
            ) : isLoadingCurriculum ? (
              <div aria-hidden className="mnp-section">
                <span className="mnp-skeleton h-40 w-full" />
              </div>
            ) : null}

            {course.requirements && course.requirements.length > 0 ? (
              <Block
                title={t('website:renderer.courseDetails.requirementsTitle')}
              >
                <ul className="mnp-bold-list">
                  {course.requirements.map((requirement, index) => (
                    <li key={index}>
                      <Check className="size-5" strokeWidth={2.5} aria-hidden />
                      <span dir="auto">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}

            {course.instructors.length > 0 ? (
              <Block title={t('website:renderer.instructorsLabel')}>
                <ul className="mnp-people">
                  {course.instructors.map((instructor) => (
                    <li key={instructor.id} className="mnp-person">
                      {instructor.avatar ? (
                        <img
                          src={instructor.avatar}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-14 shrink-0 rounded-[var(--mn-radius)] object-cover"
                        />
                      ) : (
                        <ManaraMonogram name={instructor.name} />
                      )}
                      <p
                        className="mn-font-display min-w-0 text-lg font-bold"
                        dir="auto"
                      >
                        {instructor.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </Block>
            ) : null}

            <div id="reviews" className="mnp-section scroll-mt-28 space-y-10">
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

          {/* The enrolment panel: sticky beside the body on desktop. */}
          <aside
            aria-label={t('website:manara.pages.courseDetails.enrol')}
            className="hidden lg:col-span-4 lg:col-start-9 lg:block"
          >
            <div className="mn-card mnp-panel" data-manara-panel="">
              <p className="mn-label mn-muted">
                {t('website:manara.pages.courseDetails.enrol')}
              </p>
              <p className="mnp-panel-price mt-3" data-atlas-numeric="true">
                {price}
              </p>
              <div className="mt-6">{actionButton('w-full')}</div>
              {enrollError ? (
                <p role="alert" className="mnp-error mt-4 text-sm">
                  {t('website:renderer.courseDetails.enrollError')}
                </p>
              ) : null}
              {includes.length > 0 ? (
                <div className="mt-6">
                  <p className="mn-label mn-muted mb-2">
                    {t('website:manara.pages.courseDetails.includes')}
                  </p>
                  <ul className="mnp-includes">
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
        linkRenderer={linkRenderer}
      />

      {/* Phones and tablets: the price and the action stay one tap away. */}
      <div
        data-manara-purchase-bar=""
        data-above-nav={showBar ? '' : undefined}
        className="mnp-bar lg:hidden"
      >
        <p className="mnp-bar-price" data-atlas-numeric="true">
          {price}
        </p>
        {actionButton('min-h-11')}
      </div>
      {/* Room for the bar, so it never covers the page's last content. */}
      <div aria-hidden className="mnp-bar-space lg:hidden" />
    </article>
  );
}
