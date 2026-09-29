/**
 * Theme 1 course card (plan §C.1 #4). It's image-led:
 * - 16:9 media: the course thumbnail, or the brand-tinted
 *   `course-fallback-pattern` with the course's initial;
 * - then category, title, a two-line summary and level / lessons / rating;
 * - the instructor and price are pinned to the bottom edge, so a row of
 *   cards stays aligned.
 * On the public site the whole card is one link.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Star, UserRound } from 'lucide-react';
import { cn } from '@utils';
import { formatCoursePricing } from '@features/course';
import type { Course } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

/** A thumbnail-less course's media: brand-tinted dot pattern + its initial. */
export function CourseFallbackPattern({
  title,
  className,
}: {
  readonly title: string;
  readonly className?: string;
}): JSX.Element {
  const patternId = `t1-dots-${useId().replace(/:/g, '')}`;
  return (
    <div
      aria-hidden
      className={cn(
        'relative flex size-full items-center justify-center overflow-hidden bg-[var(--website-icon-tile)]',
        className
      )}
    >
      <svg className="absolute inset-0 size-full text-[var(--website-shape)]">
        <defs>
          <pattern
            id={patternId}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <span
        className="relative flex size-20 items-center justify-center rounded-3xl bg-[var(--website-background)] font-display text-4xl font-bold text-[var(--website-icon-fg)] shadow-[var(--t1-shadow-rest)]"
        dir="auto"
      >
        {title.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function CardBody({
  course,
  showPrice,
  showInstructor,
}: {
  readonly course: Course;
  readonly showPrice: boolean;
  readonly showInstructor: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const stats = course.stats;
  const lessons = stats?.totalLessons ?? 0;
  const reviews = stats?.totalReviews ?? 0;
  const rating = stats?.averageRating ?? 0;
  const instructor = showInstructor ? course.instructors[0]?.name : undefined;

  return (
    <>
      <div className="t1-card-media relative aspect-video shrink-0 rounded-t-[calc(var(--t1-radius-card)-1px)]">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <CourseFallbackPattern title={course.title} />
        )}
        {stats?.hasPreview ? (
          <span className="absolute start-3 top-3 inline-flex min-h-7 items-center gap-1.5 rounded-full bg-[var(--website-background)] px-2.5 text-xs font-semibold text-[var(--website-foreground)] shadow-sm">
            <PlayCircle className="size-3.5" aria-hidden />
            {t('website:renderer.courseDetails.previewBadge')}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {course.category?.name ? (
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--website-link)]"
            dir="auto"
          >
            {course.category.name}
          </p>
        ) : null}
        <h3
          className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--website-foreground)]"
          dir="auto"
        >
          {course.title}
        </h3>
        {course.shortDescription ? (
          <p
            className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--website-foreground-muted)]"
            dir="auto"
          >
            {course.shortDescription}
          </p>
        ) : null}
        {course.level || lessons > 0 || reviews > 0 ? (
          <div
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--website-foreground-muted)]"
            data-atlas-numeric="true"
          >
            {course.level ? (
              <span className="inline-flex min-h-6 items-center rounded-full bg-[var(--website-surface)] px-2.5 text-xs font-semibold text-[var(--website-foreground)]">
                {t(`website:renderer.courseDetails.level.${course.level}`)}
              </span>
            ) : null}
            {lessons > 0 ? (
              <span>
                {t('website:renderer.courseDetails.lessonCount', {
                  count: lessons,
                })}
              </span>
            ) : null}
            {reviews > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star
                  className="size-4 fill-[var(--website-warning)] text-[var(--website-warning)]"
                  aria-hidden
                />
                <span
                  className="font-semibold text-[var(--website-foreground)]"
                  aria-hidden
                >
                  {rating.toFixed(1)}
                </span>
                <span aria-hidden>({reviews})</span>
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
          </div>
        ) : null}
        {instructor || showPrice ? (
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between gap-3 border-t border-[var(--website-border)] pt-4 text-sm">
              {instructor ? (
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 text-[var(--website-foreground-muted)]"
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
              {showPrice ? (
                <span
                  className="shrink-0 text-base font-bold text-[var(--website-foreground)]"
                  data-atlas-numeric="true"
                >
                  {formatCoursePricing(course.pricing, t)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function T1CourseCard({
  course,
  linkRenderer,
  showPrice = true,
  showInstructor = true,
}: {
  readonly course: Course;
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly showPrice?: boolean;
  readonly showInstructor?: boolean;
}): JSX.Element {
  const body = (
    <CardBody
      course={course}
      showPrice={showPrice}
      showInstructor={showInstructor}
    />
  );
  if (linkRenderer) {
    return (
      <div className="t1-card h-full">
        {linkRenderer({
          href: `/courses/${course.id}`,
          external: false,
          className: 't1-card-link text-start',
          children: body,
        })}
      </div>
    );
  }
  return <article className="t1-card flex h-full flex-col">{body}</article>;
}

/** Mirrors the card's shape, so swapping it for content moves nothing. */
export function T1CourseCardSkeleton(): JSX.Element {
  return (
    <div aria-hidden className="t1-card flex h-full flex-col overflow-hidden">
      <div className="aspect-video animate-pulse bg-[var(--website-surface-muted)] motion-reduce:animate-none" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-1/4 rounded bg-[var(--website-surface-muted)]" />
        <div className="h-5 w-4/5 rounded bg-[var(--website-surface-muted)]" />
        <div className="h-4 w-full rounded bg-[var(--website-surface-muted)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--website-surface-muted)]" />
      </div>
    </div>
  );
}
