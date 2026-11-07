/**
 * One of my support tickets, with its conversation.
 *
 * THE HALF THAT WAS MISSING. A customer could file a ticket and see it in
 * a list, but there was no tenant-facing route to read the thread — so
 * support could answer and the customer would never see it. This page and
 * `GET /support-cases/mine/:caseId` are that half.
 *
 * The reply box is hidden on a CLOSED ticket rather than shown and
 * rejected: the backend returns 409 for a reply to a closed case, and a
 * box that always fails is worse than no box plus an explanation.
 *
 * B5 (UX audit) — the reply has the server's limit
 * (`MAX_SUPPORT_REPLY_BODY_LENGTH`, 5,000) with a counter and is never cut
 * silently; leaving with a typed reply asks first; a failed send is ONE
 * inline message with the real reason (the hook marks its errors inline).
 *
 * B5 (UX audit) V35 — the customer closes their own ticket ("Close
 * ticket", asked first: a closed ticket takes no more replies and can't be
 * reopened from here). It then reads as closed, the reply box gives way to
 * the closed notice, and a failure is one inline message.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter, useUnsavedChanges } from '@hooks';
import { SaveFailedAlert, hasViolationOn, useFailureReason } from '@forms';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MIRROR_IN_RTL, cn } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useConfirmDialog } from '@app/providers';
import { useToast } from '@app/providers/toast/useToast';
import {
  useCloseMySupportCase,
  useMySupportCase,
  useReplyToMySupportCase,
} from '../hooks';
import { getSupportCaseStatusTone } from '../utils/support-status.utils';
import { SupportAttachmentField } from '../components/SupportAttachmentField';
import { SupportAttachmentImage } from '../components/SupportAttachmentImage';
import type { BreadcrumbItem, SupportAttachmentInput } from '@types';

/** Backend `MAX_SUPPORT_REPLY_BODY_LENGTH`. */
export const SUPPORT_REPLY_MAX = 5000;

export default function SupportCaseDetailPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const [reply, setReply] = useState('');
  /** P53 — see `CreateSupportCaseDialog` for why this is local state, not form state. */
  const [attachment, setAttachment] = useState<SupportAttachmentInput>();
  const [replyProblem, setReplyProblem] = useState<'empty' | 'tooLong' | null>(
    null
  );

  const { data, isLoading, error, refetch } = useMySupportCase(caseId ?? '');
  const postReply = useReplyToMySupportCase();
  const closeCase = useCloseMySupportCase();
  const { confirm } = useConfirmDialog();
  const { notifySuccess } = useToast();
  const failureReason = useFailureReason();
  const { markSaved } = useUnsavedChanges({
    isDirty: reply.trim() !== '' || attachment !== undefined,
  });

  const breadcrumbs: readonly BreadcrumbItem[] = [
    { labelKey: 'support:center.title', path: DASHBOARD_ROUTES.support },
    { labelKey: 'support:detail.title' },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    );
  }

  // A ticket belonging to anyone else is a 404 from the backend, so this
  // branch covers "not yours" and "does not exist" identically — which is
  // the point: distinguishing them would confirm the id is real.
  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader titleKey="support:detail.title" breadcrumbs={breadcrumbs} />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const isClosed = data.status === 'closed';

  const handleSend = async () => {
    const body = reply.trim();
    // `postReply.isPending` is the double-submission guard: the button is
    // also disabled, but a keyboard repeat or a double click can fire twice
    // before React re-renders, and sending the same image twice would put
    // two copies in the thread and two objects in storage.
    if (postReply.isPending) return;
    if (!body) return setReplyProblem('empty');
    if (body.length > SUPPORT_REPLY_MAX) return setReplyProblem('tooLong');
    setReplyProblem(null);
    try {
      await postReply.mutateAsync({
        caseId: data.id,
        payload: attachment ? { body, attachment } : { body },
      });
    } catch {
      // Shown below the box, once; the typed reply is kept.
      return;
    }
    // Cleared only after the server accepted it — clearing optimistically
    // would lose the message (and the chosen image) if the request failed.
    markSaved();
    setReply('');
    setAttachment(undefined);
  };

  const handleClose = async () => {
    if (closeCase.isPending) return;
    const confirmed = await confirm({
      titleKey: 'support:detail.closeTicket.title',
      descriptionKey: reply.trim()
        ? 'support:detail.closeTicket.descriptionWithDraft'
        : 'support:detail.closeTicket.description',
      confirmLabelKey: 'support:detail.closeTicket.confirm',
      cancelLabelKey: 'support:detail.closeTicket.cancel',
    });
    if (!confirmed) return;
    try {
      await closeCase.mutateAsync(data.id);
    } catch {
      // Shown above the thread, once.
      return;
    }
    // Nothing left to send on a closed ticket.
    markSaved();
    setReply('');
    setAttachment(undefined);
    notifySuccess('support:detail.closeTicket.closed');
  };

  const replyLength = reply.trim().length;
  const serverBodyError =
    postReply.error && hasViolationOn(postReply.error, { body: 'body' })
      ? failureReason(postReply.error)
      : null;
  const replyError =
    replyProblem === 'empty'
      ? t('support:detail.replyEmpty')
      : replyProblem === 'tooLong'
        ? t('validation:maxLength', {
            field: t('support:detail.replyField'),
            count: SUPPORT_REPLY_MAX,
          })
        : serverBodyError;

  return (
    <PageContainer>
      <PageHeader
        titleKey="support:detail.title"
        title={data.subject}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              labelKey={`support:status.${data.status}`}
              tone={getSupportCaseStatusTone(data.status)}
            />
            {isClosed ? null : (
              <Button
                type="button"
                variant="outline"
                data-testid="close-ticket"
                disabled={closeCase.isPending}
                onClick={() => void handleClose()}
              >
                {closeCase.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden />
                )}
                {t('support:detail.closeTicket.action')}
              </Button>
            )}
          </div>
        }
      />

      {closeCase.error ? (
        <div className="mb-4">
          <SaveFailedAlert
            error={closeCase.error}
            titleKey="support:detail.closeTicket.failed"
            onRetry={() => void handleClose()}
          />
        </div>
      ) : null}

      <div className="space-y-4">
        {data.messages.map((message) => {
          const fromAgent = message.authorRole === 'agent';
          return (
            <Card
              key={message.id}
              data-testid={`support-message-${message.id}`}
              className={cn(
                // Agent replies are visually distinct so a customer can
                // tell at a glance who said what.
                fromAgent ? 'border-primary/40 bg-primary/5' : undefined
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <p className="text-sm font-medium">
                  {fromAgent
                    ? t('support:detail.fromSupport')
                    : (message.authorName ?? t('support:detail.fromYou'))}
                </p>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={message.createdAt}
                >
                  {fmt.dateTime(message.createdAt)}
                </time>
              </CardHeader>
              <CardContent>
                {/* `whitespace-pre-wrap` so the paragraphs a customer typed
                    survive; `dir="auto"` so an Arabic message inside an
                    English page still reads right-to-left. */}
                <p
                  className="whitespace-pre-wrap break-words text-sm"
                  dir="auto"
                >
                  {message.body}
                </p>

                {/* P53 — the image sits UNDER the text it belongs to.
                    `?? []` because a ticket filed before attachments
                    existed has no such field in a cached response. */}
                {(message.attachments ?? []).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.attachments.map((item) => (
                      <SupportAttachmentImage key={item.id} attachment={item} />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isClosed ? (
        <p className="mt-6 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
          {t('support:detail.closedNotice')}
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          <Label htmlFor="support-reply">
            {t('support:detail.replyLabel')}
          </Label>
          <Textarea
            id="support-reply"
            data-testid="support-reply"
            rows={4}
            dir="auto"
            value={reply}
            placeholder={t('support:detail.replyPlaceholder')}
            onChange={(event) => {
              setReply(event.target.value);
              setReplyProblem(null);
              // Editing answers the last refusal: no stale message stays.
              if (postReply.error) postReply.reset();
            }}
            aria-invalid={replyError ? true : undefined}
            aria-describedby="support-reply-count support-reply-error"
          />
          <p
            id="support-reply-count"
            data-testid="support-reply-count"
            className={
              replyLength > SUPPORT_REPLY_MAX
                ? 'text-xs font-medium tabular-nums text-destructive'
                : 'text-xs tabular-nums text-muted-foreground'
            }
          >
            {t('common:form.characterCount', {
              count: replyLength,
              max: SUPPORT_REPLY_MAX,
            })}
          </p>
          {replyError ? (
            <p
              id="support-reply-error"
              role="alert"
              data-testid="support-reply-error"
              className="text-sm text-destructive"
            >
              {replyError}
            </p>
          ) : null}
          <SupportAttachmentField
            value={attachment}
            onChange={setAttachment}
            disabled={postReply.isPending}
          />
          {postReply.error && !serverBodyError ? (
            <SaveFailedAlert
              error={postReply.error}
              titleKey="support:detail.replyNotSent"
              onRetry={() => void handleSend()}
            />
          ) : null}
          <div className="flex justify-end">
            <Button
              data-testid="send-reply"
              disabled={postReply.isPending}
              onClick={() => void handleSend()}
            >
              {postReply.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send
                  className={cn('size-4', MIRROR_IN_RTL)}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              {t('support:detail.send')}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
