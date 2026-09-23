/**
 * MyCourseReviewForm — the authenticated, enrolled learner's own review
 * authoring on the Course Details page (P64 Phase 4). Renders only when
 * the caller can review (signed in + enrolled). Shows the current review
 * with its moderation status and edit/delete, or a "write a review" form.
 * Every submit re-enters moderation, so the copy says "submitted for
 * review", never "published".
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@components/data-display';
import {
  useDeleteMyReview,
  useMyCourseReview,
  useSubmitMyReview,
} from '@features/learning';
import { MAX_COURSE_REVIEW_BODY_LENGTH } from '@types';
import type { CourseReviewStatus } from '@types';

export interface MyCourseReviewFormProps {
  readonly academyId: string;
  readonly courseId: string;
  /** Signed in AND enrolled — the backend's own precondition for authoring. */
  readonly canReview: boolean;
}

const STATUS_VARIANT: Record<
  CourseReviewStatus,
  'default' | 'secondary' | 'destructive'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export function MyCourseReviewForm({
  academyId,
  courseId,
  canReview,
}: MyCourseReviewFormProps): JSX.Element | null {
  const { t } = useTranslation();
  const { data: existing, isLoading } = useMyCourseReview(courseId, {
    enabled: canReview,
  });
  const submit = useSubmitMyReview(courseId, academyId);
  const remove = useDeleteMyReview(courseId, academyId);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate the form from an existing review when it loads / changes.
  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setBody(existing.body ?? '');
    }
  }, [existing]);

  if (!canReview || isLoading) {
    return null;
  }

  const hasReview = !!existing;
  const showForm = !hasReview || editing;

  const onSubmit = async () => {
    setError(null);
    if (rating < 1) {
      setError(t('website:renderer.courseDetails.ratingRequired'));
      return;
    }
    try {
      await submit.mutateAsync({
        create: !hasReview,
        payload: { rating, body: body.trim() || undefined },
      });
      setEditing(false);
    } catch {
      setError(t('website:renderer.courseDetails.reviewError'));
    }
  };

  const onDelete = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
      setRating(0);
      setBody('');
      setEditing(false);
    } catch {
      setError(t('website:renderer.courseDetails.reviewError'));
    }
  };

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      aria-labelledby="my-review-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="my-review-heading" className="font-semibold text-foreground">
          {hasReview
            ? t('website:renderer.courseDetails.yourReviewTitle')
            : t('website:renderer.courseDetails.writeReviewTitle')}
        </h3>
        {hasReview ? (
          <Badge variant={STATUS_VARIANT[existing.status]}>
            {t(
              `website:renderer.courseDetails.reviewStatus.${existing.status}`
            )}
          </Badge>
        ) : null}
      </div>

      {hasReview && existing.status === 'pending' ? (
        <p className="text-sm text-muted-foreground">
          {t('website:renderer.courseDetails.reviewSubmittedNote')}
        </p>
      ) : null}

      {showForm ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="block text-sm font-medium text-foreground"
              id="my-review-rating-label"
            >
              {t('website:renderer.courseDetails.yourRatingLabel')}
            </label>
            <StarRating
              value={rating}
              onChange={setRating}
              size="lg"
              label={t('website:renderer.courseDetails.yourRatingLabel')}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="my-review-body"
              className="block text-sm font-medium text-foreground"
            >
              {t('website:renderer.courseDetails.reviewBodyLabel')}
            </label>
            <Textarea
              id="my-review-body"
              rows={4}
              maxLength={MAX_COURSE_REVIEW_BODY_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t(
                'website:renderer.courseDetails.reviewBodyPlaceholder'
              )}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onSubmit} disabled={submit.isPending}>
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {hasReview
                ? t('website:renderer.courseDetails.updateReview')
                : t('website:renderer.courseDetails.submitReview')}
            </Button>
            {hasReview ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setRating(existing.rating);
                  setBody(existing.body ?? '');
                  setError(null);
                }}
                disabled={submit.isPending}
              >
                {t('website:renderer.courseDetails.cancelReview')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <StarRating
            value={existing.rating}
            size="md"
            label={t('website:renderer.courseDetails.ratingLabel', {
              rating: existing.rating,
            })}
          />
          {existing.body ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {existing.body}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setEditing(true)}>
              {t('website:renderer.courseDetails.editReview')}
            </Button>
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={remove.isPending}
              className="text-destructive hover:text-destructive"
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              {t('website:renderer.courseDetails.deleteReview')}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
