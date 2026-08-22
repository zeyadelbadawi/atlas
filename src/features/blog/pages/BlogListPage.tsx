/**
 * Blog List Page.
 *
 * Shows the knowledge posts visible to the current user (published posts,
 * plus their own drafts). Shared between students and instructors — the
 * "New Post" action is gated by permission, not by route, since both
 * roles land on the same list.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge, Pagination } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce, usePagination, usePermissions } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useBlogPosts } from '../hooks';
import type { BlogPostStatus } from '@types';

function getStatusTone(status: BlogPostStatus) {
  switch (status) {
    case 'published':
      return 'success' as const;
    case 'archived':
      return 'destructive' as const;
    case 'draft':
    default:
      return 'neutral' as const;
  }
}

export default function BlogListPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('blog.create');

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useBlogPosts({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedSearch.trim() || undefined,
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const posts = data?.items ?? [];

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="blog:list.title"
          descriptionKey="blog:list.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="blog:list.title"
        descriptionKey="blog:list.subtitle"
        actions={
          canCreate ? (
            <Button
              onClick={() => navigate(DASHBOARD_ROUTES.blogCreate)}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t('blog:list.createButton')}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('blog:list.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            titleKey="blog:list.empty"
            descriptionKey="blog:list.emptyDescription"
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(
                      buildPath(DASHBOARD_ROUTES.blogPost, { postId: post.id })
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(
                        buildPath(DASHBOARD_ROUTES.blogPost, {
                          postId: post.id,
                        })
                      );
                    }
                  }}
                  className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {post.featuredImage ? (
                    <img
                      src={post.featuredImage}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="h-36 w-full bg-muted" />
                  )}
                  <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.category ? (
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {post.category}
                        </span>
                      ) : null}
                      <StatusBadge
                        labelKey={`blog:status.${post.status}`}
                        tone={getStatusTone(post.status)}
                      />
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <p className="mt-auto text-xs text-muted-foreground">
                      {t('blog:list.byAuthor', { name: post.authorName })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Pagination pagination={pagination} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
