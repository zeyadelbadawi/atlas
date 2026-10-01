/**
 * CourseReviews — the public rating summary + approved review list for the
 * Course Details page (P64 Phase 4). Display only: it reads the public,
 * unauthenticated `usePublicCourseRating` + `usePublicCourseReviews`
 * (approved-only by contract). Authoring lives in the authenticated
 * learner flow, not here. Renders nothing (returns `null`) when the course
 * has no approved reviews, so a brand-new course shows no empty rating
 * scaffold on its marketing page.
 */
import { useTranslation } from 'react-i18next';
import { StarRating } from '@components/data-display';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCourseRating, usePublicCourseReviews } from '@hooks';
import type { PublicWebsiteLocale } from '@types';

export interface CourseReviewsProps {
  readonly academyId: string;
  readonly courseId: string;
  readonly locale?: PublicWebsiteLocale;
}

const STAR_ROWS = ['5', '4', '3', '2', '1'] as const;

export function CourseReviews({
  academyId,
  courseId,
  locale = 'en',
}: CourseReviewsProps): JSX.Element | null {
  const { t } = useTranslation();
  const { data: rating, isLoading: ratingLoading } = usePublicCourseRating(
    academyId,
    courseId
  );
  const { data: reviews, isLoading: reviewsLoading } = usePublicCourseReviews(
    academyId,
    courseId
  );

  if (ratingLoading || reviewsLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  // No approved reviews yet → show nothing on the public page.
  if (!rating || rating.totalReviews === 0) {
    return null;
  }

  // UTC, so the date is the same wherever the page is rendered (the
  // server or the visitor's browser) — reviews carry a UTC timestamp.
  const dateFmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const maxCount = Math.max(
    1,
    ...STAR_ROWS.map((s) => rating.distribution[s] ?? 0)
  );

  return (
    <section className="space-y-6" aria-labelledby="course-reviews-heading">
      <h2
        id="course-reviews-heading"
        className="text-lg font-semibold text-foreground"
      >
        {t('website:renderer.courseDetails.reviewsTitle')}
      </h2>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        {/* Aggregate score */}
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-6 py-4 text-center">
          <span className="text-4xl font-semibold tabular-nums text-foreground">
            {rating.averageRating.toFixed(1)}
          </span>
          <StarRating
            value={rating.averageRating}
            size="sm"
            label={t('website:renderer.courseDetails.ratingLabel', {
              rating: rating.averageRating.toFixed(1),
            })}
          />
          <span className="text-sm text-muted-foreground">
            {t('website:renderer.courseDetails.reviewCount', {
              count: rating.totalReviews,
            })}
          </span>
        </div>

        {/* Histogram */}
        <div className="space-y-1.5" aria-hidden>
          {STAR_ROWS.map((star) => {
            const count = rating.distribution[star] ?? 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-end tabular-nums text-muted-foreground">
                  {star}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-amber-500"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-end tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approved reviews */}
      {reviews && reviews.items.length > 0 ? (
        <ul className="space-y-4">
          {reviews.items.map((review) => (
            <li
              key={review.id}
              className="space-y-2 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {review.studentName ??
                    t('website:renderer.courseDetails.anonymousReviewer')}
                </span>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={review.createdAt}
                >
                  {dateFmt.format(new Date(review.createdAt))}
                </time>
              </div>
              <StarRating
                value={review.rating}
                size="sm"
                label={t('website:renderer.courseDetails.ratingLabel', {
                  rating: review.rating,
                })}
              />
              {review.body ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
