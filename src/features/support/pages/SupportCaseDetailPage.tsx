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
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Loader2, Send } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useMySupportCase, useReplyToMySupportCase } from '../hooks';
import { getSupportCaseStatusTone } from '../utils/support-status.utils';
import type { BreadcrumbItem } from '@types';

export default function SupportCaseDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { caseId } = useParams<{ caseId: string }>();
  const [reply, setReply] = useState('');

  const { data, isLoading, error, refetch } = useMySupportCase(caseId ?? '');
  const postReply = useReplyToMySupportCase();

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
    if (!body || postReply.isPending) return;
    await postReply.mutateAsync({ caseId: data.id, payload: { body } });
    // Cleared only after the server accepted it — clearing optimistically
    // would lose the message if the request failed.
    setReply('');
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="support:detail.title"
        title={data.subject}
        breadcrumbs={breadcrumbs}
        actions={
          <StatusBadge
            labelKey={`support:status.${data.status}`}
            tone={getSupportCaseStatusTone(data.status)}
          />
        }
      />

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
                  {new Date(message.createdAt).toLocaleString()}
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
            maxLength={5000}
            placeholder={t('support:detail.replyPlaceholder')}
            onChange={(event) => setReply(event.target.value)}
          />
          {postReply.error ? (
            <p className="text-sm text-destructive">
              {t('support:detail.replyFailed')}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              data-testid="send-reply"
              disabled={!reply.trim() || postReply.isPending}
              onClick={() => void handleSend()}
            >
              {postReply.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" strokeWidth={2} aria-hidden />
              )}
              {t('support:detail.send')}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
