/**
 * One entry in Atelier's course index (catalog, related courses): its
 * number, a small plate (the course thumbnail, or Atelier's
 * `course-fallback` photograph), the category in small caps, the title in
 * the display face, a two-line summary, the level / lessons / rating line
 * (rating only with real reviews), the instructor and the price. On the
 * public site the whole row is one link to the course.
 */
import { useTranslation } from 'react-i18next';
import { formatCoursePricing } from '@features/course';
import type { Course } from '@types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import { AtelierArrow, AtelierMedia } from '../atelier-parts';

const COURSE_FALLBACK = 'theme-asset:atelier/course-fallback';

function RowBody({
  course,
  index,
}: {
  readonly course: Course;
  readonly index: string;
}): JSX.Element {
  const { t } = useTranslation();
  const stats = course.stats;
  const lessons = stats?.totalLessons ?? 0;
  const quizzes = stats?.totalQuizzes ?? 0;
  const reviews = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const instructor = course.instructors[0]?.name;
  const meta = [
    course.level
      ? t(`website:renderer.courseDetails.level.${course.level}`)
      : null,
    lessons > 0
      ? t('website:renderer.courseDetails.lessonCount', { count: lessons })
      : null,
    // A quiz-only course has no lessons; say what it does contain.
    quizzes > 0
      ? t('website:renderer.courseDetails.quizCount', { count: quizzes })
      : null,
  ].filter((item): item is string => !!item);

  return (
    <>
      <span aria-hidden className="atp-row-no">
        {index}
      </span>
      <div aria-hidden className="atp-row-plate">
        <AtelierMedia
          value={course.thumbnail || COURSE_FALLBACK}
          alt=""
          sizes="(min-width: 1024px) 160px, 120px"
          className="aspect-[3/2] w-full"
        />
      </div>
      <div className="min-w-0 space-y-2">
        {course.category?.name ? (
          <p className="at-label at-label-brand" dir="auto">
            {course.category.name}
          </p>
        ) : null}
        <h3 className="atp-row-title" dir="auto">
          {course.title}
        </h3>
        {course.shortDescription ? (
          <p
            className="line-clamp-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--atelier-text-muted)]"
            dir="auto"
          >
            {course.shortDescription}
          </p>
        ) : null}
        {meta.length > 0 || reviews > 0 ? (
          <p className="at-label atp-meta" data-atlas-numeric="true">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
            {reviews > 0 ? (
              <span>
                <span aria-hidden>
                  {rating.toFixed(1)} / 5 ({reviews})
                </span>
                <span className="sr-only">
                  {t('website:renderer.courseDetails.ratingLabel', {
                    rating: rating.toFixed(1),
                  })}
                  ,{' '}
                  {t('website:renderer.courseDetails.reviewCount', {
                    count: reviews,
                  })}
                </span>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="atp-row-end">
        {instructor ? (
          <span className="text-sm text-[var(--atelier-text-muted)]" dir="auto">
            {t('website:atelier.pages.catalog.by', { name: instructor })}
          </span>
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-3">
          <span className="atp-price" data-atlas-numeric="true">
            {formatCoursePricing(course.pricing, t)}
          </span>
          <AtelierArrow />
        </span>
      </div>
    </>
  );
}

export function AtelierCourseRow({
  course,
  index,
  linkRenderer,
}: {
  readonly course: Course;
  /** The row's printed number (already formatted for the locale). */
  readonly index: string;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const body = <RowBody course={course} index={index} />;
  if (linkRenderer) {
    return linkRenderer({
      href: `/courses/${course.id}`,
      external: false,
      className: 'atp-row',
      children: body,
    });
  }
  return <article className="atp-row">{body}</article>;
}

/** Mirrors a row's shape, so swapping it for content moves nothing. */
export function AtelierCourseRowSkeleton(): JSX.Element {
  return (
    <div aria-hidden className="atp-row">
      <span className="atp-skeleton block h-5 w-6" />
      <span className="atp-row-plate">
        <span className="atp-skeleton block aspect-[3/2] w-full" />
      </span>
      <span className="block space-y-3">
        <span className="atp-skeleton block h-3 w-1/5" />
        <span className="atp-skeleton block h-7 w-3/4" />
        <span className="atp-skeleton block h-4 w-1/2" />
      </span>
      <span className="atp-row-end">
        <span className="atp-skeleton block h-6 w-16" />
      </span>
    </div>
  );
}
