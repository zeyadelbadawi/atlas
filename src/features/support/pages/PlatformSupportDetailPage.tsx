/**
 * Platform Support Operations — Detail Page (Prompt 13).
 *
 * Status transitions and replies are real mutations against
 * `SupportService`. Assignment is display-only — see `support.types.ts`'s
 * doc comment for why no assignment mutation is offered.
 *
 * B8 (UX audit) V19–V21 — "Subject" shows the subject and the requester is
 * its own field; the reply has the server's 5,000 limit with a counter, is
 * never cut, warns before leaving and a failed send is ONE inline message
 * (a `body` violation under the box); Closed asks first; a failed status
 * change is one inline message. The hooks mark their errors inline.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Loader2, Send } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDateFormatter, usePermissions, useUnsavedChanges } from '@hooks';
import { SaveFailedAlert, hasViolationOn, useFailureReason } from '@forms';
import { useConfirmDialog } from '@app/providers/dialog/useConfirmDialog';
import { useToast } from '@app/providers/toast/useToast';
import { SUPPORT_REPLY_MAX } from './SupportCaseDetailPage';
import {
  useSupportCase,
  useUpdateSupportCaseStatus,
  usePostSupportCaseReply,
} from '../hooks';
import {
  getSupportCasePriorityTone,
  getSupportCaseStatusTone,
} from '../utils/support-status.utils';
import { SupportAttachmentImage } from '../components/SupportAttachmentImage';
import type { SupportCaseStatus } from '@types';
import { cn, MIRROR_IN_RTL } from '@utils';

const STATUS_VALUES: readonly SupportCaseStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export default function PlatformSupportDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { caseId } = useParams<{ caseId: string }>();
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirmDialog();
  const { notifySuccess } = useToast();
  const failureReason = useFailureReason();
  const [replyBody, setReplyBody] = useState('');
  const [replyProblem, setReplyProblem] = useState<'empty' | 'tooLong' | null>(
    null
  );
  const { markSaved } = useUnsavedChanges({
    isDirty: replyBody.trim() !== '',
  });

  const {
    data: supportCase,
    isLoading,
    error,
    refetch,
  } = useSupportCase(caseId ?? '');
  const updateStatus = useUpdateSupportCaseStatus();
  const postReply = usePostSupportCaseReply();

  const canManage = hasPermission('platform.support.manage');

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !supportCase) {
    return (
      <PageContainer>
        <PageHeader titleKey="support:detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const handleReply = async () => {
    const body = replyBody.trim();
    if (!body) return setReplyProblem('empty');
    if (body.length > SUPPORT_REPLY_MAX) return setReplyProblem('tooLong');
    setReplyProblem(null);
    try {
      await postReply.mutateAsync({
        caseId: supportCase.id,
        payload: { body },
      });
    } catch {
      // Shown below the box, once; the typed reply is kept.
      return;
    }
    markSaved();
    setReplyBody('');
    notifySuccess('support:detail.replySent');
  };

  const changeStatus = async (status: SupportCaseStatus) => {
    if (status === supportCase.status) return;
    // B8 (UX audit) V21 — closing ends the conversation: ask first.
    if (status === 'closed') {
      const confirmed = await confirm({
        titleKey: 'support:detail.closeConfirm.title',
        descriptionKey: 'support:detail.closeConfirm.description',
        confirmLabelKey: 'support:detail.closeConfirm.confirm',
        intent: 'destructive',
      });
      if (!confirmed) return;
    }
    updateStatus.mutate(
      { caseId: supportCase.id, payload: { status } },
      { onSuccess: () => notifySuccess('support:detail.statusUpdated') }
    );
  };

  const replyLength = replyBody.trim().length;
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
        titleKey="support:detailTitle"
        title={supportCase.subject}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              labelKey={`support:priority.${supportCase.priority}`}
              tone={getSupportCasePriorityTone(supportCase.priority)}
            />
            {canManage ? (
              <Select
                value={supportCase.status}
                onValueChange={(value) =>
                  void changeStatus(value as SupportCaseStatus)
                }
                disabled={updateStatus.isPending}
              >
                <SelectTrigger
                  className="w-40"
                  aria-label={t('support:table.status')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`support:status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <StatusBadge
                labelKey={`support:status.${supportCase.status}`}
                tone={getSupportCaseStatusTone(supportCase.status)}
              />
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {updateStatus.error ? (
          <SaveFailedAlert
            error={updateStatus.error}
            titleKey="support:detail.statusNotChanged"
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('support:overviewTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('support:table.subject')}
              </p>
              <p
                className="break-words text-sm text-foreground"
                dir="auto"
                data-testid="support-case-subject"
              >
                {supportCase.subject}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('support:detail.requester')}
              </p>
              <p className="text-sm text-foreground" dir="auto">
                {supportCase.requesterName}
              </p>
              <p className="break-all text-xs text-muted-foreground" dir="ltr">
                {supportCase.requesterEmail}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('support:table.organization')}
              </p>
              <p className="text-sm text-foreground" dir="auto">
                {supportCase.organizationName ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('support:detail.assignedTo')}
              </p>
              <p className="text-sm text-foreground">
                {supportCase.assignedToName ?? t('support:detail.unassigned')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('support:table.updatedAt')}
              </p>
              <p className="text-sm text-foreground">
                {fmt.dateTime(supportCase.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('support:detail.conversationTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-4">
              {supportCase.messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground" dir="auto">
                      {message.authorName}
                    </span>
                    <time dateTime={message.createdAt}>
                      {fmt.dateTime(message.createdAt)}
                    </time>
                  </div>
                  <p
                    className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground"
                    dir="auto"
                  >
                    {message.body}
                  </p>

                  {/* P53 — the agent sees the customer's screenshot through
                      the SAME authenticated route the customer uses; the
                      `..._platform_select` RLS policy is what grants it. */}
                  {(message.attachments ?? []).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((item) => (
                        <SupportAttachmentImage
                          key={item.id}
                          attachment={item}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            {canManage ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="platform-support-reply">
                  {t('support:detail.replyLabel')}
                </Label>
                <Textarea
                  id="platform-support-reply"
                  data-testid="platform-support-reply"
                  dir="auto"
                  value={replyBody}
                  onChange={(event) => {
                    setReplyBody(event.target.value);
                    setReplyProblem(null);
                    // Editing answers the last refusal: no stale message.
                    if (postReply.error) postReply.reset();
                  }}
                  placeholder={t('support:detail.replyPlaceholder')}
                  rows={3}
                  aria-invalid={replyError ? true : undefined}
                  aria-describedby="platform-support-reply-count platform-support-reply-error"
                />
                <p
                  id="platform-support-reply-count"
                  data-testid="platform-support-reply-count"
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
                    id="platform-support-reply-error"
                    role="alert"
                    data-testid="platform-support-reply-error"
                    className="text-sm text-destructive"
                  >
                    {replyError}
                  </p>
                ) : null}
                {postReply.error && !serverBodyError ? (
                  <SaveFailedAlert
                    error={postReply.error}
                    titleKey="support:detail.replyNotSent"
                    onRetry={() => void handleReply()}
                  />
                ) : null}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void handleReply()}
                    disabled={postReply.isPending}
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
                    {t('support:detail.sendReply')}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
