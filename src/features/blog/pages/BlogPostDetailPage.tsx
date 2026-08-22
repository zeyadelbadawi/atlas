/**
 * Blog Post Detail Page.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useBlogPost } from '../hooks';

export default function BlogPostDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();

  const { data: post, isLoading, error, refetch } = useBlogPost(postId ?? '');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  if (error || !post) {
    return (
      <PageContainer>
        <PageHeader titleKey="blog:detail.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const isOwner = post.authorId === user?.id;

  return (
    <PageContainer>
      <PageHeader
        title={post.title}
        titleKey="blog:detail.title"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              labelKey={`blog:status.${post.status}`}
              tone={post.status === 'published' ? 'success' : 'neutral'}
            />
            {isOwner ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(buildPath(DASHBOARD_ROUTES.blogEdit, { postId: post.id }))
                }
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
                {t('blog:detail.editAction')}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card>
        {post.featuredImage ? (
          <img
            src={post.featuredImage}
            alt=""
            className="h-64 w-full rounded-t-lg object-cover"
          />
        ) : null}
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs text-muted-foreground">
            {t('blog:list.byAuthor', { name: post.authorName })}
            {post.publishedAt
              ? ` · ${new Date(post.publishedAt).toLocaleDateString()}`
              : ''}
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {post.content}
          </p>
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
