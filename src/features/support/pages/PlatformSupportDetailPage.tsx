/**
 * Platform Support Operations — Detail Page (Prompt 13).
 *
 * Status transitions and replies are real mutations against
 * `SupportService`. Assignment is display-only — see `support.types.ts`'s
 * doc comment for why no assignment mutation is offered.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
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
import { usePermissions } from '@hooks';
import { useSupportCase, useUpdateSupportCaseStatus, usePostSupportCaseReply } from '../hooks';
import { getSupportCasePriorityTone, getSupportCaseStatusTone } from '../utils/support-status.utils';
import type { SupportCaseStatus } from '@types';

const STATUS_VALUES: readonly SupportCaseStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export default function PlatformSupportDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const { hasPermission } = usePermissions();
  const [replyBody, setReplyBody] = useState('');

  const { data: supportCase, isLoading, error, refetch } = useSupportCase(caseId ?? '');
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

  const handleReply = () => {
    if (!replyBody.trim()) return;
    postReply.mutate(
      { caseId: supportCase.id, payload: { body: replyBody.trim() } },
      { onSuccess: () => setReplyBody('') }
    );
  };

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
                  updateStatus.mutate({
                    caseId: supportCase.id,
                    payload: { status: value as SupportCaseStatus },
                  })
                }
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-40" aria-label={t('support:table.status')}>
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
        {updateStatus.error ? <ErrorState onRetry={() => updateStatus.reset()} /> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('support:overviewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('support:table.subject')}</p>
              <p className="text-sm text-foreground">{supportCase.requesterName}</p>
              <p className="text-xs text-muted-foreground">{supportCase.requesterEmail}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('support:table.organization')}</p>
              <p className="text-sm text-foreground">{supportCase.organizationName ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('support:detail.assignedTo')}</p>
              <p className="text-sm text-foreground">{supportCase.assignedToName ?? t('support:detail.unassigned')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('support:table.updatedAt')}</p>
              <p className="text-sm text-foreground">
                {new Date(supportCase.updatedAt).toLocaleString(i18n.language)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('support:detail.conversationTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-4">
              {supportCase.messages.map((message) => (
                <li key={message.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{message.authorName}</span>
                    <span>{new Date(message.createdAt).toLocaleString(i18n.language)}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{message.body}</p>
                </li>
              ))}
            </ul>

            {canManage ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder={t('support:detail.replyPlaceholder')}
                  rows={3}
                  aria-label={t('support:detail.replyPlaceholder')}
                />
                {postReply.error ? <ErrorState onRetry={handleReply} /> : null}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleReply}
                    disabled={postReply.isPending || !replyBody.trim()}
                  >
                    <Send className="size-4" strokeWidth={2} aria-hidden />
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
