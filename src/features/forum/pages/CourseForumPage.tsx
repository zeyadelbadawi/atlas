/**
 * Course Forum Page.
 *
 * Thread list for one course's discussion forum. Mounted at both the
 * student route (`.../learning/courses/:courseId/discussions`) and the
 * instructor route (`.../instructor/courses/:courseId/discussions`) — the
 * component itself is role-agnostic; the backend enforces who may read,
 * post, and moderate. Thread links are built relative to the current
 * location so the same component works under either route prefix without
 * hardcoding which one is active.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Pin, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Pagination } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { usePagination, usePermissions } from '@hooks';
import { useForum, useForumThreads, useCreateThread } from '../hooks';
import {
  createThreadSchema,
  type CreateThreadFormData,
} from '../schemas/forum.schemas';

export default function CourseForumPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams<{ courseId: string }>();
  const { hasPermission } = usePermissions();
  const canPost = hasPermission('forum.thread.create');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data: forum, error: forumError, refetch: refetchForum } = useForum(
    courseId ?? ''
  );
  const {
    data: threadsData,
    isLoading,
    error: threadsError,
    refetch: refetchThreads,
  } = useForumThreads(courseId ?? '', {
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (threadsData) setTotalItems(threadsData.pagination.totalItems);
  }, [threadsData]);

  const {
    mutateAsync: createThread,
    isPending,
    error: createError,
  } = useCreateThread(courseId ?? '');

  const form = useForm<CreateThreadFormData>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: { title: '', body: '' },
  });

  useServerValidation(form, createError);

  const threads = threadsData?.items ?? [];

  const goToThread = (threadId: string) => {
    navigate(`${location.pathname.replace(/\/$/, '')}/${threadId}`);
  };

  const onSubmit = async (data: CreateThreadFormData) => {
    try {
      const thread = await createThread(data);
      toast({ title: t('forum:list.createSuccess') });
      setDialogOpen(false);
      form.reset();
      goToThread(thread.id);
    } catch {
      toast({
        title: t('forum:list.createError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  if (forumError || threadsError) {
    return (
      <PageContainer>
        <PageHeader titleKey="forum:list.title" />
        <ErrorState onRetry={() => (forumError ? refetchForum() : refetchThreads())} />
      </PageContainer>
    );
  }

  const isLocked = forum?.status === 'locked' || forum?.status === 'archived';

  return (
    <PageContainer>
      <PageHeader
        title={forum?.title}
        titleKey="forum:list.title"
        descriptionKey="forum:list.subtitle"
        actions={
          canPost && !isLocked ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t('forum:list.newThreadButton')}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : threads.length === 0 ? (
        <EmptyState
          titleKey="forum:list.empty"
          descriptionKey="forum:list.emptyDescription"
        />
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              role="button"
              tabIndex={0}
              onClick={() => goToThread(thread.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') goToThread(thread.id);
              }}
              className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.pinned ? (
                      <Pin className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : null}
                    {thread.locked ? (
                      <Lock
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {thread.title}
                    </h3>
                  </div>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {thread.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('forum:list.byAuthor', { name: thread.authorName })}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {t('forum:list.replyCount', { count: thread.replyCount })}
                </span>
              </CardContent>
            </Card>
          ))}
          <Pagination pagination={pagination} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('forum:list.newThreadTitle')}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forum:list.titleLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forum:list.bodyLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  {t('forum:list.cancelButton')}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('forum:list.postButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
