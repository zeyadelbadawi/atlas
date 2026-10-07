/**
 * Riwaq Course Details — the dossier (plan §4, inner pages): the same
 * course data and enrolment behaviour as every theme (`useCourseDetails`),
 * set as a programme's file.
 *
 * - **Title block:** the trail, the department, the title as the page's
 *   h1, the summary and a facts table (level, duration, lessons, quizzes,
 *   language, certificate — only what the course really has; the rating
 *   only with real reviews; the faculty) beside the course's photograph
 *   (its thumbnail, else Riwaq's `course-fallback`), loaded eagerly.
 * - **Body:** an *on this page* index (from 1280px) that marks the section
 *   being read (one IntersectionObserver), then Overview · Outcomes ·
 *   Syllabus (sections → lessons, free previews playable) · Requirements ·
 *   Faculty · Reviews — the shared review components, in the same
 *   conditions as every theme.
 * - **Enrolment:** a ruled card sticky beside the body from 1024px; on
 *   phones and tablets a bar fixed to the bottom (above the mobile
 *   navigation, inside the safe area) with the price and the one action.
 * - **Related programmes** as sheets, when there are any.
 *
 * An unknown course renders Riwaq's "page not found"; a failed load says so
 * with a retry.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, FileText, Loader2, PlayCircle } from 'lucide-react';
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
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type { ThemeCourseDetailsProps } from '@/features/website/theme-packs/theme-pack.types';
import type { Course } from '@types';
import {
  RIWAQ_COURSE_FALLBACK,
  RiwaqBand,
  RiwaqLink,
  RiwaqMonogram,
  RiwaqWindow,
  formatRiwaqIndex,
} from '../riwaq-parts';
import { RiwaqCourseSheet } from './RiwaqCourseSheet';
import { RiwaqStatement } from './RiwaqCourseCatalog';
import { RiwaqNotFound } from './RiwaqSystemPages';
import '../riwaq-pages.css';

const CONTENT_TYPE_ICON = {
  video: PlayCircle,
  file: FileText,
  text: BookOpen,
} as const;

/** One section of the dossier, anchored for the index. */
function Part({
  id,
  index,
  title,
  children,
}: {
  readonly id: string;
  readonly index: number;
  readonly title: string;
  readonly children: ReactNode;
}): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="rwp-part" data-dossier-part="">
      <h2 id={`${id}-title`} className="rwp-part-title">
        <span aria-hidden className="rw-label rw-num">
          {formatRiwaqIndex(index, locale)}
        </span>
        <span className="rw-subtitle">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** Marks the index entry of the section being read (one observer for all). */
function useReadingPosition(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join('|');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => !!element);
    if (elements.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // `key` stands for the ids list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

function RelatedProgrammes({
  academyId,
  courseId,
  linkRenderer,
}: {
  readonly academyId: string;
  readonly courseId: string;
  readonly linkRenderer?: ThemeCourseDetailsProps['linkRenderer'];
}): JSX.Element | null {
  const { t } = useTranslation();
  const { data } = usePublicCourseRecommendations(academyId, courseId);
  if (!data || data.length === 0) return null;
  return (
    <RiwaqBand ground="stone" labelledBy="rw-dossier-related">
      <h2 id="rw-dossier-related" className="rw-title rwp-related-title">
        {t('website:renderer.courseDetails.relatedTitle')}
      </h2>
      <ul className="rwp-sheets">
        {data.slice(0, 3).map((related) => (
          <li key={related.id} className="min-w-0">
            <RiwaqCourseSheet course={related as Course} linkRenderer={linkRenderer} />
          </li>
        ))}
      </ul>
    </RiwaqBand>
  );
}

export function RiwaqCourseDetails({
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

  const parts: { id: string; title: string }[] = [];
  if (course?.description) parts.push({ id: 'rw-dossier-overview', title: t('website:riwaq.pages.courseDetails.overview') });
  if (course?.outcomes?.length) parts.push({ id: 'rw-dossier-outcomes', title: t('website:renderer.courseDetails.outcomesTitle') });
  if (curriculum?.length) parts.push({ id: 'rw-dossier-syllabus', title: t('website:riwaq.home.spotlight.syllabus') });
  if (course?.requirements?.length) parts.push({ id: 'rw-dossier-requirements', title: t('website:renderer.courseDetails.requirementsTitle') });
  if (course?.instructors.length) parts.push({ id: 'rw-dossier-faculty', title: t('website:riwaq.pages.courseDetails.faculty') });
  parts.push({ id: 'reviews', title: t('website:renderer.courseDetails.reviewsTitle') });
  const active = useReadingPosition(parts.map((part) => part.id));

  if (isLoading) {
    // A full viewport while loading, so the loaded course moves nothing.
    return (
      <div aria-busy="true" className="min-h-[100svh]">
        <RiwaqBand as="div">
          <div className="rw-grid">
            <div className="rwp-dossier-head grid gap-5">
              <span className="rw-skeleton h-4 w-1/4" />
              <span className="rw-skeleton h-16 w-4/5" />
              <span className="rw-skeleton h-5 w-full" />
              <span className="rw-skeleton h-40 w-full" />
            </div>
            <span className="rw-skeleton rwp-dossier-window aspect-[3/2]" />
          </div>
        </RiwaqBand>
      </div>
    );
  }

  // No such course here — unknown, unpublished or not public.
  if (!error && !course) {
    return <RiwaqNotFound pages={pages} linkRenderer={linkRenderer} />;
  }

  if (error || !course) {
    return (
      <RiwaqBand label={t('website:riwaq.pages.courseDetails.errorTitle')}>
        <RiwaqStatement
          marker={{ 'data-course-error': '' }}
          title={t('website:riwaq.pages.courseDetails.errorTitle')}
          description={t('website:riwaq.pages.courseDetails.errorDescription')}
          action={
            <button type="button" className="rw-btn rw-btn-line" onClick={() => void refetch()}>
              {t('website:riwaq.pages.courseDetails.retry')}
            </button>
          }
        />
      </RiwaqBand>
    );
  }

  const stats = course.stats;
  const reviews = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const lessons = stats?.totalLessons ?? 0;
  const quizzes = stats?.totalQuizzes ?? 0;
  const assignments = stats?.totalAssignments ?? 0;
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
      className={cn('rw-btn rw-btn-lg', className)}
      data-course-action={action.kind}
    >
      {action.busy ? (
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : action.kind === 'completed' ? (
        <CheckCircle2 className="size-4" aria-hidden />
      ) : null}
      {t(action.labelKey)}
    </button>
  );

  const facts = [
    course.level
      ? { key: 'level', term: t('website:riwaq.home.courses.facts.level'), value: t(`website:renderer.courseDetails.level.${course.level}`) }
      : null,
    duration ? { key: 'duration', term: t('website:riwaq.home.courses.facts.duration'), value: duration } : null,
    lessons > 0
      ? { key: 'lessons', term: t('website:riwaq.home.courses.facts.lessons'), value: t('website:renderer.courseDetails.lessonCount', { count: lessons }) }
      : null,
    quizzes > 0 || assignments > 0
      ? {
          key: 'assessments',
          term: t('website:riwaq.pages.courseDetails.assessments'),
          value: [
            quizzes > 0 ? t('website:renderer.courseDetails.quizCount', { count: quizzes }) : null,
            assignments > 0 ? t('website:renderer.courseDetails.assignmentCount', { count: assignments }) : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
    course.language
      ? { key: 'language', term: t('website:riwaq.pages.courseDetails.language'), value: course.language.toUpperCase() }
      : null,
    course.certificatesEnabled
      ? { key: 'certificate', term: t('website:riwaq.home.courses.facts.certificate'), value: t('website:riwaq.home.courses.facts.certificateIncluded') }
      : null,
    course.instructors.length > 0
      ? { key: 'faculty', term: t('website:riwaq.home.courses.facts.faculty'), value: course.instructors.map((instructor) => instructor.name).join(', ') }
      : null,
  ].filter((fact): fact is { key: string; term: string; value: string } => !!fact);

  const curriculumSummary = [
    t('website:renderer.courseDetails.sectionCount', { count: curriculum?.length ?? 0 }),
    // Lessons from the curriculum; quizzes and assignments from the course's
    // own counts, so a quiz-only course never reads "0 lessons".
    curriculumLessons > 0 ? t('website:renderer.courseDetails.lessonCount', { count: curriculumLessons }) : null,
    quizzes > 0 ? t('website:renderer.courseDetails.quizCount', { count: quizzes }) : null,
    assignments > 0 ? t('website:renderer.courseDetails.assignmentCount', { count: assignments }) : null,
    duration,
  ]
    .filter(Boolean)
    .join(' · ');

  let partIndex = 0;
  const nextIndex = () => partIndex++;

  return (
    <article data-riwaq-course-details="">
      {/* The title block. */}
      <RiwaqBand as="header" className="rwp-dossier-band">
        <div className="rw-grid">
          <div className="rwp-dossier-head">
            <nav aria-label={t('website:riwaq.pages.courseDetails.breadcrumb')}>
              <ol className="rwp-trail">
                <li>
                  <RiwaqLink href={catalogHref} linkRenderer={linkRenderer} className="rwp-trail-link">
                    {t('website:riwaq.pages.courseDetails.allCourses')}
                  </RiwaqLink>
                </li>
                {course.category ? (
                  <li>
                    <RiwaqLink href={categoryHref} linkRenderer={linkRenderer} className="rwp-trail-link">
                      <span dir="auto">{course.category.name}</span>
                    </RiwaqLink>
                  </li>
                ) : null}
              </ol>
            </nav>
            <h1 className="rw-display rwp-dossier-title" dir="auto">
              {course.title}
            </h1>
            {course.shortDescription ? (
              <p className="rw-lead" dir="auto">
                {course.shortDescription}
              </p>
            ) : null}
            {reviews > 0 ? (
              <a href="#reviews" className="rw-link rw-num">
                <span aria-hidden>{rating.toFixed(1)} / 5 · </span>
                <span className="rw-sr-only">
                  {t('website:renderer.courseDetails.ratingLabel', { rating: rating.toFixed(1) })},{' '}
                </span>
                {t('website:renderer.courseDetails.reviewCount', { count: reviews })}
              </a>
            ) : null}
          </div>
          <div className="rwp-dossier-aside">
            <RiwaqWindow
              priority
              value={course.thumbnail || RIWAQ_COURSE_FALLBACK}
              alt=""
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="rwp-dossier-window aspect-[3/2]"
            />
            {facts.length > 0 ? (
              <dl className="rw-facts rwp-dossier-facts" data-riwaq-facts="">
                {facts.map((fact) => (
                  <div key={fact.key} className="contents">
                    <dt>{fact.term}</dt>
                    <dd dir="auto">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </RiwaqBand>

      <div className="rw-container">
        <div className="rw-grid rwp-dossier-body">
          {parts.length > 1 ? (
            <nav aria-label={t('website:riwaq.pages.courseDetails.onThisPage')} className="rwp-index">
              <p className="rw-label" data-mark="">
                {t('website:riwaq.pages.courseDetails.onThisPage')}
              </p>
              <ol>
                {parts.map((part) => (
                  <li key={part.id}>
                    <a href={`#${part.id}`} aria-current={active === part.id ? 'true' : undefined} className="rwp-index-link">
                      {part.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="rwp-dossier-main">
            {course.description ? (
              <Part id="rw-dossier-overview" index={nextIndex()} title={t('website:riwaq.pages.courseDetails.overview')}>
                <p className="rw-body whitespace-pre-line" dir="auto">
                  {course.description}
                </p>
              </Part>
            ) : null}

            {course.outcomes && course.outcomes.length > 0 ? (
              <Part id="rw-dossier-outcomes" index={nextIndex()} title={t('website:renderer.courseDetails.outcomesTitle')}>
                <ul className="rwsp-outcomes">
                  {course.outcomes.map((outcome, index) => (
                    <li key={index} dir="auto">
                      {outcome}
                    </li>
                  ))}
                </ul>
              </Part>
            ) : null}

            {curriculum && curriculum.length > 0 ? (
              <Part id="rw-dossier-syllabus" index={nextIndex()} title={t('website:riwaq.home.spotlight.syllabus')}>
                <p className="rw-label rw-num mb-4">{curriculumSummary}</p>
                <ol className="rwp-syllabus" aria-label={t('website:riwaq.pages.courseDetails.contents')}>
                  {curriculum.map((section, index) => (
                    <li key={section.id} className="rwp-syllabus-section">
                      <h3 className="rwp-syllabus-head">
                        <span aria-hidden className="rw-label rw-num">
                          {formatRiwaqIndex(index, locale)}
                        </span>
                        <span className="rw-sr-only">
                          {t('website:riwaq.pages.courseDetails.sectionLabel', {
                            index: formatRiwaqIndex(index, locale),
                          })}{' '}
                        </span>
                        <span className="rwp-syllabus-title" dir="auto">
                          {section.title}
                        </span>
                        {section.lessons.length > 0 ? (
                          <span className="rw-label rw-num">
                            {t('website:renderer.courseDetails.lessonCount', { count: section.lessons.length })}
                          </span>
                        ) : null}
                      </h3>
                      {section.lessons.length > 0 ? (
                        <ul className="rwp-lessons">
                          {section.lessons.map((lesson) => {
                            const Icon = CONTENT_TYPE_ICON[lesson.contentType];
                            return (
                              <li key={lesson.id}>
                                <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                                <span className="min-w-0 flex-1" dir="auto">
                                  {lesson.title}
                                </span>
                                {lesson.isPreview ? (
                                  <button
                                    type="button"
                                    className="rw-link text-sm"
                                    onClick={() => setPreviewLesson({ id: lesson.id, title: lesson.title })}
                                    aria-label={t('website:renderer.courseDetails.previewActionLabel', { title: lesson.title })}
                                  >
                                    <PlayCircle className="size-4" strokeWidth={1.75} aria-hidden />
                                    {t('website:renderer.courseDetails.previewAction')}
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
              </Part>
            ) : isLoadingCurriculum ? (
              <div aria-hidden className="rwp-part">
                <span className="rw-skeleton block h-40 w-full" />
              </div>
            ) : null}

            {course.requirements && course.requirements.length > 0 ? (
              <Part id="rw-dossier-requirements" index={nextIndex()} title={t('website:renderer.courseDetails.requirementsTitle')}>
                <ul className="rwsp-outcomes">
                  {course.requirements.map((requirement, index) => (
                    <li key={index} dir="auto">
                      {requirement}
                    </li>
                  ))}
                </ul>
              </Part>
            ) : null}

            {course.instructors.length > 0 ? (
              <Part id="rw-dossier-faculty" index={nextIndex()} title={t('website:riwaq.pages.courseDetails.faculty')}>
                <ul className="rw-ledger rwl-faculty">
                  {course.instructors.map((instructor) => (
                    <li key={instructor.id} className="rwl-plate-body">
                      {instructor.avatar ? (
                        <img src={instructor.avatar} alt="" loading="lazy" decoding="async" className="rwl-plate-photo" />
                      ) : (
                        <RiwaqMonogram name={instructor.name} />
                      )}
                      <p className="rw-subtitle rwl-plate-name" dir="auto">
                        {instructor.name}
                      </p>
                    </li>
                  ))}
                </ul>
              </Part>
            ) : null}

            <div id="reviews" className="rwp-part rwp-reviews" data-dossier-part="">
              <MyCourseReviewForm academyId={academyId} courseId={courseId} canReview={isAuthenticated && isEnrolled} />
              <CourseReviews academyId={academyId} courseId={courseId} locale={locale} />
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

          {/* The enrolment card: sticky beside the body on desktop. */}
          <aside aria-label={t('website:riwaq.pages.courseDetails.enrol')} className="rwp-enrol">
            <div className="rw-cell rwp-enrol-card" data-tick="" data-riwaq-panel="">
              <p className="rw-label">{t('website:riwaq.pages.courseDetails.enrol')}</p>
              <p className="rwp-enrol-price rw-num">{price}</p>
              {actionButton('w-full')}
              {enrollError ? (
                <p role="alert" className="rwp-error">
                  {t('website:renderer.courseDetails.enrollError')}
                </p>
              ) : null}
              {stats?.hasPreview ? (
                <p className="rw-label">{t('website:riwaq.pages.courseDetails.hasPreview')}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <RelatedProgrammes academyId={academyId} courseId={courseId} linkRenderer={linkRenderer} />

      {/* Phones and tablets: the price and the action stay one tap away. */}
      <div data-riwaq-purchase-bar="" data-above-nav={showBar ? '' : undefined} className="rwp-bar" data-ground="porcelain">
        <p className="rwp-bar-price rw-num">{price}</p>
        {actionButton('rwp-bar-action')}
      </div>
      {/* Room for the bar, so it never covers the page's last content. */}
      <div aria-hidden className="rwp-bar-space" />
    </article>
  );
}
