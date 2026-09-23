/**
 * Course Reviews Moderation Page (P64 Phase 4).
 *
 * The staff surface for course reviews: the course's reviewer (assigned
 * instructor, or the academy's owner/administrator/manager) lists every
 * status, filters by status, and approves / rejects / removes reviews.
 * Authorization is enforced server-side (`assertCanReviewCourse` +
 * `course_reviews_*` RLS); a decision re-flows to the public course page.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { usePagination } from '@hooks';
import { Check, Loader2, Trash2, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { ErrorState, EmptyState } from '@components/feedback';
import { StarRating, Pagination } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCourse } from '../hooks';
import {
  useCourseReviewModeration,
  useModerateReview,
  useRemoveReview,
} from '../hooks/useCourseReviewModeration';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';
import type { BreadcrumbItem, CourseReviewStatus } from '@types';

type StatusFilter = 'all' | CourseReviewStatus;

const STATUS_VARIANT: Record<
  CourseReviewStatus,
  'default' | 'secondary' | 'destructive'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const PAGE_SIZE = 20;

export default function CourseReviewsModerationPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const { confirm } = useConfirmDialog();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({
    totalItems,
    initialPageSize: PAGE_SIZE,
  });

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
    refetch: refetchCourse,
  } = useCourse(academyId ?? '', courseId ?? '');

  const query = {
    pagination: { page: pagination.page, pageSize: pagination.pageSize },
    ...(status !== 'all' ? { status } : {}),
  };
  const {
    data: reviews,
    isLoading,
    error,
    refetch,
  } = useCourseReviewModeration(courseId, query, { enabled: !!courseId });

  useEffect(() => {
    if (reviews) setTotalItems(reviews.pagination.totalItems);
  }, [reviews]);

  const moderate = useModerateReview(courseId ?? '');
  const remove = useRemoveReview(courseId ?? '');

  const onDecision = async (reviewId: string, action: 'approve' | 'reject') => {
    try {
      await moderate.mutateAsync({ reviewId, action });
      toast({
        title: t(`course:reviews.${action}dToast`),
      });
    } catch {
      toast({ title: t('common:states.error.title'), variant: 'destructive' });
    }
  };

  const onRemove = async (reviewId: string) => {
    const confirmed = await confirm({
      titleKey: 'course:reviews.removeConfirmTitle',
      descriptionKey: 'course:reviews.removeConfirmDescription',
      confirmLabelKey: 'course:reviews.removeConfirm',
      intent: 'destructive',
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync({ reviewId });
      toast({ title: t('course:reviews.removedToast') });
    } catch {
      toast({ title: t('common:states.error.title'), variant: 'destructive' });
    }
  };

  if (courseLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </PageContainer>
    );
  }

  if (courseError || !course) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => refetchCourse()} />
      </PageContainer>
    );
  }

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    { labelKey: 'course:reviews.title', label: course.title },
  ];

  const items = reviews?.items ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        titleKey="course:reviews.title"
        descriptionKey="course:reviews.subtitle"
        breadcrumbs={breadcrumbs}
      />

      {academyId && courseId ? (
        <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground" htmlFor="status">
          {t('course:reviews.filterLabel')}
        </label>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            pagination.goToFirstPage();
          }}
        >
          <SelectTrigger id="status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('course:reviews.status.all')}
            </SelectItem>
            <SelectItem value="pending">
              {t('course:reviews.status.pending')}
            </SelectItem>
            <SelectItem value="approved">
              {t('course:reviews.status.approved')}
            </SelectItem>
            <SelectItem value="rejected">
              {t('course:reviews.status.rejected')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          titleKey="course:reviews.emptyTitle"
          descriptionKey="course:reviews.emptyDescription"
        />
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((review) => (
              <li key={review.id}>
                <Card>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">
                          {review.studentName ?? t('course:reviews.anonymous')}
                        </span>
                        <StarRating
                          value={review.rating}
                          size="sm"
                          label={t('course:reviews.ratingLabel', {
                            rating: review.rating,
                          })}
                        />
                      </div>
                      <Badge variant={STATUS_VARIANT[review.status]}>
                        {t(`course:reviews.status.${review.status}`)}
                      </Badge>
                    </div>

                    {review.body ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {review.body}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        {t('course:reviews.noBody')}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {review.status !== 'approved' ? (
                        <Button
                          size="sm"
                          onClick={() => onDecision(review.id, 'approve')}
                          disabled={moderate.isPending}
                        >
                          <Check className="size-4" aria-hidden />
                          {t('course:reviews.approve')}
                        </Button>
                      ) : null}
                      {review.status !== 'rejected' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDecision(review.id, 'reject')}
                          disabled={moderate.isPending}
                        >
                          <X className="size-4" aria-hidden />
                          {t('course:reviews.reject')}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(review.id)}
                        disabled={remove.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {remove.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Trash2 className="size-4" aria-hidden />
                        )}
                        {t('course:reviews.remove')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {pagination.totalPages > 1 ? (
            <div className="mt-6">
              <Pagination pagination={pagination} hidePageSize />
            </div>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
