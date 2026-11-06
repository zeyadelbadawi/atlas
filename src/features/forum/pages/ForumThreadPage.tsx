/**
 * Forum Thread Page.
 *
 * Thread detail, its replies, a reply form, and moderation actions
 * (pin/unpin/lock/unlock/delete) gated behind `forum.moderate` — never
 * assumed from role alone, always from the permission check.
 *
 * B6 (UX audit):
 *   V04 a reply of only spaces is refused here, with a message;
 *   V05 moderators can delete the thread (with its replies) or one reply,
 *       each after a confirmation that says it can't be undone;
 *   V07/V08 one message per failure, with the real reason ("this discussion
 *       is locked"): the reply form shows it inline, a moderation action as
 *       one toast;
 *   V11 leaving with a typed reply asks first;
 *   V12 Lock asks first (it closes the thread to every reply); every
 *       moderation action confirms its success;
 *   V15 user text keeps its own direction in Arabic;
 *   V19 the reply box has a label, a counter and a success message.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Lock, Pin, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import {
  hasViolationOn,
  SaveFailedAlert,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import { useDateFormatter, usePermissions, useUnsavedChanges } from '@hooks';
import { apiErrorMessage, isolateText } from '@utils';
import type { ForumReply, ForumThread } from '@types';
import {
  useForumThread,
  useForumReplies,
  useCreateReply,
  usePinThread,
  useUnpinThread,
  useLockThread,
  useUnlockThread,
  useDeleteThread,
  useDeleteReply,
} from '../hooks';
import {
  createReplySchema,
  MAX_REPLY_BODY_LENGTH,
  type CreateReplyFormData,
} from '../schemas/forum.schemas';

const REPLY_FIELDS = { body: 'forum:thread.replyLabel' } as const;

type ModerationAction = 'pin' | 'unpin' | 'lock' | 'unlock';

export default function ForumThreadPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirmDialog();
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
  const { mutateAsync: deleteThread } = useDeleteThread(courseId ?? '');
  const { mutateAsync: deleteReply } = useDeleteReply(
    courseId ?? '',
    threadId ?? ''
  );

  const [isModerating, setIsModerating] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  const form = useForm<CreateReplyFormData>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: '' },
  });
  const replyLength = form.watch('body')?.length ?? 0;

  const labelledReplyError = useLabelledViolations(
    replyError ?? null,
    REPLY_FIELDS
  );
  useServerValidation(form, labelledReplyError);
  const replyFieldFailure = hasViolationOn(labelledReplyError, REPLY_FIELDS);

  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  const forumPath = location.pathname.replace(/\/[^/]+$/, '');
  const goBackToForum = () => {
    navigate(forumPath);
  };

  const failed = (titleKey: string, error: unknown) => {
    toast({
      title: t(titleKey),
      description: apiErrorMessage(t, i18n, error),
      variant: 'destructive',
    });
  };

  const onSubmit = async (data: CreateReplyFormData) => {
    try {
      await createReply(data);
    } catch {
      // Shown once, inline below the reply box (or on the field); the
      // typed reply stays.
      return;
    }
    markSaved();
    form.reset({ body: '' });
    toast({ title: t('forum:thread.replySuccess') });
  };

  const moderate = async (current: ForumThread, action: ModerationAction) => {
    if (action === 'lock') {
      const confirmed = await confirm({
        titleKey: 'forum:thread.lockConfirm.title',
        descriptionKey: 'forum:thread.lockConfirm.description',
        confirmLabelKey: 'forum:thread.lockConfirm.confirmLabel',
        cancelLabelKey: 'forum:thread.lockConfirm.cancelLabel',
        values: { title: isolateText(current.title) },
      });
      if (!confirmed) return;
    }
    const run = {
      pin: pinThread,
      unpin: unpinThread,
      lock: lockThread,
      unlock: unlockThread,
    }[action];
    setIsModerating(true);
    try {
      await run(current.id);
      toast({ title: t(`forum:thread.moderation.${action}.success`) });
    } catch (error) {
      failed(`forum:thread.moderation.${action}.error`, error);
    } finally {
      setIsModerating(false);
    }
  };

  const onDeleteThread = async (current: ForumThread) => {
    const confirmed = await confirm({
      titleKey: 'forum:thread.deleteThread.confirm.title',
      descriptionKey:
        current.replyCount > 0
          ? 'forum:thread.deleteThread.confirm.description'
          : 'forum:thread.deleteThread.confirm.descriptionNoReplies',
      confirmLabelKey: 'forum:thread.deleteThread.confirm.confirmLabel',
      cancelLabelKey: 'forum:thread.deleteThread.confirm.cancelLabel',
      values: {
        title: isolateText(current.title),
        count: current.replyCount,
      },
      intent: 'destructive',
    });
    if (!confirmed) return;
    setIsModerating(true);
    try {
      await deleteThread(current.id);
    } catch (error) {
      failed('forum:thread.deleteThread.error', error);
      setIsModerating(false);
      return;
    }
    toast({ title: t('forum:thread.deleteThread.success') });
    // A typed reply belongs to a thread that no longer exists.
    markSaved();
    navigate(forumPath);
  };

  const onDeleteReply = async (reply: ForumReply) => {
    const confirmed = await confirm({
      titleKey: 'forum:thread.deleteReply.confirm.title',
      descriptionKey: 'forum:thread.deleteReply.confirm.description',
      confirmLabelKey: 'forum:thread.deleteReply.confirm.confirmLabel',
      cancelLabelKey: 'forum:thread.deleteReply.confirm.cancelLabel',
      values: { name: isolateText(reply.authorName) },
      intent: 'destructive',
    });
    if (!confirmed) return;
    setDeletingReplyId(reply.id);
    try {
      await deleteReply(reply.id);
      toast({ title: t('forum:thread.deleteReply.success') });
    } catch (error) {
      failed('forum:thread.deleteReply.error', error);
    } finally {
      setDeletingReplyId(null);
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

  const byline = (name: string, date: string) =>
    `${t('forum:list.byAuthor', { name: isolateText(name) })} · ${fmt.dateTime(date)}`;

  return (
    <PageContainer>
      <Button
        variant="ghost"
        size="sm"
        onClick={goBackToForum}
        className="mb-2 -ms-2"
      >
        <ArrowLeft
          className="size-4 rtl:-scale-x-100"
          strokeWidth={2}
          aria-hidden
        />
        {t('forum:thread.backToForum')}
      </Button>

      <PageHeader
        title={thread.title}
        titleKey="forum:thread.title"
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
                    moderate(thread, thread.pinned ? 'unpin' : 'pin')
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
                    moderate(thread, thread.locked ? 'unlock' : 'lock')
                  }
                >
                  <Lock className="size-4" strokeWidth={2} aria-hidden />
                  {thread.locked
                    ? t('forum:thread.unlockAction')
                    : t('forum:thread.lockAction')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isModerating}
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDeleteThread(thread)}
                >
                  <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                  {t('forum:thread.deleteThread.action')}
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
              {byline(thread.authorName, thread.createdAt)}
            </p>
            <p
              dir="auto"
              className="whitespace-pre-wrap text-sm text-foreground"
            >
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
            descriptionKey={
              thread.locked
                ? 'forum:thread.noRepliesLocked'
                : 'forum:thread.noRepliesDescription'
            }
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">
            {replies.map((reply) => (
              <li key={reply.id}>
                <Card data-testid={`forum-reply-${reply.id}`}>
                  <CardContent className="space-y-1 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {byline(reply.authorName, reply.createdAt)}
                      </p>
                      {canModerate ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          disabled={deletingReplyId === reply.id}
                          aria-label={t('forum:thread.deleteReply.ariaLabel', {
                            name: reply.authorName,
                          })}
                          onClick={() => onDeleteReply(reply)}
                        >
                          {deletingReplyId === reply.id ? (
                            <Loader2
                              className="size-4 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Trash2 className="size-4" aria-hidden />
                          )}
                          {t('forum:thread.deleteReply.action')}
                        </Button>
                      ) : null}
                    </div>
                    <p
                      dir="auto"
                      className="whitespace-pre-wrap text-sm text-foreground"
                    >
                      {reply.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {thread.locked ? (
          <p className="text-sm text-muted-foreground">
            {t('forum:thread.lockedNotice')}
          </p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              noValidate
            >
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forum:thread.replyLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        dir="auto"
                        placeholder={t('forum:thread.replyPlaceholder')}
                        aria-describedby="forum-reply-count"
                        {...field}
                      />
                    </FormControl>
                    <p
                      id="forum-reply-count"
                      data-testid="forum-reply-count"
                      className={
                        replyLength > MAX_REPLY_BODY_LENGTH
                          ? 'text-xs font-medium tabular-nums text-destructive'
                          : 'text-xs tabular-nums text-muted-foreground'
                      }
                    >
                      {t('forum:characterCount', {
                        count: replyLength,
                        max: MAX_REPLY_BODY_LENGTH,
                      })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {labelledReplyError && !replyFieldFailure ? (
                <SaveFailedAlert
                  error={labelledReplyError}
                  titleKey="forum:thread.replyError"
                />
              ) : null}
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
