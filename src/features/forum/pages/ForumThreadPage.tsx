/**
 * Forum Thread Page.
 *
 * Thread detail, its replies, a reply form, and moderation actions
 * (pin/unpin/lock/unlock) gated behind `forum.moderate` — never assumed
 * from role alone, always from the permission check.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Lock, Pin } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useServerValidation } from '@forms';
import { usePermissions } from '@hooks';
import {
  useForumThread,
  useForumReplies,
  useCreateReply,
  usePinThread,
  useUnpinThread,
  useLockThread,
  useUnlockThread,
} from '../hooks';
import {
  createReplySchema,
  type CreateReplyFormData,
} from '../schemas/forum.schemas';

export default function ForumThreadPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, threadId } = useParams<{
    courseId: string;
    threadId: string;
  }>();
  const { hasPermission } = usePermissions();
  const canModerate = hasPermission('forum.moderate');

  const {
    data: thread,
    isLoading: isThreadLoading,
    error: threadError,
    refetch: refetchThread,
  } = useForumThread(courseId ?? '', threadId ?? '');

  const {
    data: repliesData,
    isLoading: isRepliesLoading,
    error: repliesError,
    refetch: refetchReplies,
  } = useForumReplies(courseId ?? '', threadId ?? '');
  const replies = repliesData?.items ?? [];

  const {
    mutateAsync: createReply,
    isPending: isReplying,
    error: replyError,
  } = useCreateReply(courseId ?? '', threadId ?? '');
  const { mutateAsync: pinThread } = usePinThread(courseId ?? '');
  const { mutateAsync: unpinThread } = useUnpinThread(courseId ?? '');
  const { mutateAsync: lockThread } = useLockThread(courseId ?? '');
  const { mutateAsync: unlockThread } = useUnlockThread(courseId ?? '');

  const [isModerating, setIsModerating] = useState(false);

  const form = useForm<CreateReplyFormData>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: '' },
  });

  useServerValidation(form, replyError);

  const goBackToForum = () => {
    navigate(location.pathname.replace(/\/[^/]+$/, ''));
  };

  const onSubmit = async (data: CreateReplyFormData) => {
    try {
      await createReply(data);
      form.reset();
    } catch {
      toast({
        title: t('forum:thread.replyError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleModerate = async (action: () => Promise<unknown>) => {
    if (!threadId) return;
    setIsModerating(true);
    try {
      await action();
    } catch {
      toast({
        title: t('forum:thread.moderationError'),
        variant: 'destructive',
      });
    } finally {
      setIsModerating(false);
    }
  };

  if (isThreadLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
        </div>
      </PageContainer>
    );
  }

  if (threadError || !thread) {
    return (
      <PageContainer>
        <PageHeader titleKey="forum:thread.title" />
        <ErrorState onRetry={() => refetchThread()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button
        variant="ghost"
        size="sm"
        onClick={goBackToForum}
        className="mb-2 -ms-2"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" strokeWidth={2} aria-hidden />
        {t('forum:thread.backToForum')}
      </Button>

      <PageHeader
        title={thread.title}
        titleKey="forum:thread.title"
        actions={
          <div className="flex items-center gap-2">
            {thread.pinned ? (
              <StatusBadge labelKey="forum:thread.pinned" tone="info" />
            ) : null}
            {thread.locked ? (
              <StatusBadge labelKey="forum:thread.locked" tone="neutral" />
            ) : null}
            {canModerate ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isModerating}
                  onClick={() =>
                    handleModerate(() =>
                      thread.pinned
                        ? unpinThread(thread.id)
                        : pinThread(thread.id)
                    )
                  }
                >
                  <Pin className="size-4" strokeWidth={2} aria-hidden />
                  {thread.pinned
                    ? t('forum:thread.unpinAction')
                    : t('forum:thread.pinAction')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isModerating}
                  onClick={() =>
                    handleModerate(() =>
                      thread.locked
                        ? unlockThread(thread.id)
                        : lockThread(thread.id)
                    )
                  }
                >
                  <Lock className="size-4" strokeWidth={2} aria-hidden />
                  {thread.locked
                    ? t('forum:thread.unlockAction')
                    : t('forum:thread.lockAction')}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs text-muted-foreground">
              {t('forum:list.byAuthor', { name: thread.authorName })}
              {' · '}
              {new Date(thread.createdAt).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {thread.body}
            </p>
          </CardContent>
        </Card>

        {isRepliesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : repliesError ? (
          <ErrorState onRetry={() => refetchReplies()} />
        ) : replies.length === 0 ? (
          <EmptyState
            titleKey="forum:thread.noReplies"
            className="py-6"
          />
        ) : (
          <div className="space-y-2">
            {replies.map((reply) => (
              <Card key={reply.id}>
                <CardContent className="space-y-1 pt-4">
                  <p className="text-xs text-muted-foreground">
                    {t('forum:list.byAuthor', { name: reply.authorName })}
                    {' · '}
                    {new Date(reply.createdAt).toLocaleString()}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {reply.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {thread.locked ? (
          <p className="text-sm text-muted-foreground">
            {t('forum:thread.lockedNotice')}
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t('forum:thread.replyPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isReplying}>
                  {isReplying ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('forum:thread.replyButton')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </PageContainer>
  );
}
