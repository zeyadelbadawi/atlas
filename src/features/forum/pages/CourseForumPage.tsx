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
import { Pagination, StatusBadge } from '@components/data-display';
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
  FormDescription,
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
import {
  hasViolationOn,
  RequiredMark,
  SaveFailedAlert,
  useServerValidation,
} from '@forms';
import { usePagination, usePermissions } from '@hooks';
import { isolateText } from '@utils';
import { useForum, useForumThreads, useCreateThread } from '../hooks';
import {
  createThreadSchema,
  MAX_THREAD_BODY_LENGTH,
  MAX_THREAD_TITLE_LENGTH,
  type CreateThreadFormData,
} from '../schemas/forum.schemas';

const THREAD_FIELDS = {
  title: 'forum:list.titleLabel',
  body: 'forum:list.bodyLabel',
} as const;

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

  const {
    data: forum,
    error: forumError,
    refetch: refetchForum,
  } = useForum(courseId ?? '');
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

  // B6 (UX audit) V07/V08 — a refusal about a field shows on it; anything
  // else is one alert in the dialog with the real reason. No toast.
  useServerValidation(form, createError ?? null, { labels: THREAD_FIELDS });
  const createFieldFailure = hasViolationOn(createError ?? null, THREAD_FIELDS);
  const titleLength = form.watch('title')?.length ?? 0;
  const bodyLength = form.watch('body')?.length ?? 0;

  const threads = threadsData?.items ?? [];

  const goToThread = (threadId: string) => {
    navigate(`${location.pathname.replace(/\/$/, '')}/${threadId}`);
  };

  const onSubmit = async (data: CreateThreadFormData) => {
    let thread;
    try {
      thread = await createThread(data);
    } catch {
      // Shown once, in the dialog; the typed thread stays.
      return;
    }
    toast({ title: t('forum:list.createSuccess') });
    setDialogOpen(false);
    form.reset();
    goToThread(thread.id);
  };

  if (forumError || threadsError) {
    return (
      <PageContainer>
        <PageHeader titleKey="forum:list.title" />
        <ErrorState
          onRetry={() => (forumError ? refetchForum() : refetchThreads())}
        />
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
          descriptionKey={
            canPost && !isLocked
              ? 'forum:list.emptyDescription'
              : 'forum:list.emptyDescriptionReadOnly'
          }
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
                    <h3
                      dir="auto"
                      className="font-display text-base font-semibold text-foreground"
                    >
                      {thread.title}
                    </h3>
                    {/* B6 (UX audit) V26 — the state in words, not an icon
                        only a sighted reader could see. */}
                    {thread.pinned ? (
                      <span className="inline-flex items-center gap-1">
                        <Pin
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden
                        />
                        <StatusBadge
                          labelKey="forum:thread.pinned"
                          tone="info"
                        />
                      </span>
                    ) : null}
                    {thread.locked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <StatusBadge
                          labelKey="forum:thread.locked"
                          tone="neutral"
                        />
                      </span>
                    ) : null}
                  </div>
                  <p
                    dir="auto"
                    className="line-clamp-1 text-sm text-muted-foreground"
                  >
                    {thread.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('forum:list.byAuthor', {
                      name: isolateText(thread.authorName),
                    })}
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
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('forum:list.titleLabel')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input dir="auto" {...field} />
                    </FormControl>
                    <FormDescription
                      className={
                        titleLength > MAX_THREAD_TITLE_LENGTH
                          ? 'text-xs font-medium tabular-nums text-destructive'
                          : 'text-xs tabular-nums text-muted-foreground'
                      }
                    >
                      {t('forum:characterCount', {
                        count: titleLength,
                        max: MAX_THREAD_TITLE_LENGTH,
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('forum:list.bodyLabel')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={5} dir="auto" {...field} />
                    </FormControl>
                    <FormDescription
                      className={
                        bodyLength > MAX_THREAD_BODY_LENGTH
                          ? 'text-xs font-medium tabular-nums text-destructive'
                          : 'text-xs tabular-nums text-muted-foreground'
                      }
                    >
                      {t('forum:characterCount', {
                        count: bodyLength,
                        max: MAX_THREAD_BODY_LENGTH,
                      })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {createError && !createFieldFailure ? (
                <SaveFailedAlert
                  error={createError}
                  titleKey="forum:list.createError"
                />
              ) : null}

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
