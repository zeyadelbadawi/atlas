/**
 * One Customer Request, as its requester sees it
 * (`/dashboard/academy/:academyId/requests/:requestId` — also where the
 * request's emails and notifications link).
 *
 * What it is (summary + the original brief), where it stands and what
 * happens next (copy per status — "the team needs your reply" is the one
 * that matters most), and its history. The reply box and "Cancel request"
 * follow the server's own `canReply`/`canCancel`, so a closed request
 * shows an explanation instead of a box that would answer 409.
 *
 * The academy API only ever returns customer-visible events; internal
 * team notes never reach this page (and are filtered again defensively).
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Info, Loader2, Send, ShieldAlert, XCircle } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { MIRROR_IN_RTL, cn } from '@utils';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  CR_NS,
  CUSTOMER_REQUEST_MESSAGE_MAX,
} from '../constants/customer-request.constants';
import {
  useCancelCustomerRequest,
  useCustomerRequest,
  useCustomerRequestAccess,
  useReplyToCustomerRequest,
} from '../hooks';
import {
  customerRequestErrorKey,
  customerRequestNextStepKey,
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
} from '../utils/customer-request.utils';
import { CustomerRequestSummary } from '../components/CustomerRequestSummary';
import { CustomerRequestBrief } from '../components/CustomerRequestBrief';
import { CustomerRequestTimeline } from '../components/CustomerRequestTimeline';

export default function AcademyRequestDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { notify, notifySuccess } = useToast();
  const { requestId } = useParams<{ requestId: string }>();
  const { academyId, canRequest, isResolving } = useCustomerRequestAccess();
  const replyId = useId();
  const [reply, setReply] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const detailQuery = useCustomerRequest(
    canRequest ? academyId : undefined,
    requestId
  );
  const postReply = useReplyToCustomerRequest();
  const cancelRequest = useCancelCustomerRequest();

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      path: academyId
        ? buildPath(DASHBOARD_ROUTES.academyOverview, { academyId })
        : DASHBOARD_ROUTES.academy,
    },
    {
      labelKey: 'navigation:items.academyRequests',
      path: academyId
        ? buildPath(DASHBOARD_ROUTES.academyRequests, { academyId })
        : undefined,
    },
    { labelKey: `${CR_NS}:detail.breadcrumb` },
  ];

  const failWith = (titleKey: string, error: unknown) => {
    const reasonKey = customerRequestErrorKey(error);
    notify({
      intent: 'error',
      titleKey,
      ...(reasonKey ? { descriptionKey: reasonKey } : {}),
    });
  };

  if (isResolving || (canRequest && detailQuery.isLoading)) {
    return (
      <PageContainer>
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!canRequest) {
    return (
      <PageContainer>
        <PageHeader titleKey={`${CR_NS}:title`} breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={ShieldAlert}
          titleKey={`${CR_NS}:detail.notAllowed.title`}
          descriptionKey={`${CR_NS}:detail.notAllowed.description`}
          headingLevel="h2"
        />
      </PageContainer>
    );
  }

  const request = detailQuery.data;
  // "Not yours" and "does not exist" are the same 404 on purpose.
  if (detailQuery.error || !request || !academyId) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${CR_NS}:detail.breadcrumb`}
          breadcrumbs={breadcrumbs}
        />
        <ErrorState
          kind={detailQuery.error?.kind}
          descriptionKey={
            detailQuery.error?.kind === 'notFound'
              ? `${CR_NS}:detail.notFound`
              : undefined
          }
          onRetry={() => void detailQuery.refetch()}
          headingLevel="h2"
        />
      </PageContainer>
    );
  }

  const waitingForCustomer = request.status === 'waiting_for_customer';

  const handleSend = async () => {
    const body = reply.trim();
    if (!body || postReply.isPending) return;
    try {
      await postReply.mutateAsync({
        academyId,
        requestId: request.id,
        body,
      });
      // Cleared only once the server accepted it.
      setReply('');
      notifySuccess(`${CR_NS}:detail.replySent`);
    } catch (error) {
      failWith(`${CR_NS}:detail.replyFailed`, error);
    }
  };

  const handleCancel = () => {
    if (cancelRequest.isPending) return;
    cancelRequest.mutate(
      { academyId, requestId: request.id },
      {
        onSuccess: () => {
          setConfirmCancel(false);
          notifySuccess(`${CR_NS}:detail.cancelled`);
        },
        onError: (error) => {
          setConfirmCancel(false);
          failWith(`${CR_NS}:detail.cancelFailed`, error);
        },
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${CR_NS}:detail.breadcrumb`}
        title={request.title}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <StatusBadge
              labelKey={customerRequestStatusLabelKey(request.status)}
              tone={customerRequestStatusTone(request.status)}
            />
            {request.canCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                data-testid="cancel-customer-request"
              >
                <XCircle className="size-4" strokeWidth={2} aria-hidden />
                {t(`${CR_NS}:detail.cancel`)}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="min-w-0 space-y-6">
          <Alert
            data-testid="customer-request-next-step"
            className={cn(
              waitingForCustomer && 'border-warning/50 bg-warning-surface'
            )}
          >
            <Info className="size-4" aria-hidden />
            <AlertTitle>{t(`${CR_NS}:nextStep.title`)}</AlertTitle>
            <AlertDescription>
              {t(customerRequestNextStepKey(request.status))}
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-6">
              <CustomerRequestBrief
                type={request.type}
                description={request.description}
                details={request.details}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                {t(`${CR_NS}:detail.timeline`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CustomerRequestTimeline events={request.events} />

              {request.canReply ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <Label htmlFor={replyId}>
                    {t(`${CR_NS}:detail.replyLabel`)}
                  </Label>
                  <Textarea
                    id={replyId}
                    data-testid="customer-request-reply"
                    rows={4}
                    dir="auto"
                    value={reply}
                    maxLength={CUSTOMER_REQUEST_MESSAGE_MAX}
                    placeholder={t(`${CR_NS}:detail.replyPlaceholder`)}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      data-testid="send-customer-request-reply"
                      disabled={!reply.trim() || postReply.isPending}
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
                      {t(`${CR_NS}:detail.send`)}
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground"
                  data-testid="customer-request-closed-notice"
                >
                  {t(`${CR_NS}:detail.closedNotice`)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-base">
                {t(`${CR_NS}:detail.summary`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerRequestSummary request={request} />
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={confirmCancel}
        onOpenChange={(open) => {
          if (!open && !cancelRequest.isPending) setConfirmCancel(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(`${CR_NS}:detail.cancelDialog.title`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(`${CR_NS}:detail.cancelDialog.description`, {
                title: request.title,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelRequest.isPending}>
              {t(`${CR_NS}:detail.cancelDialog.keep`)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelRequest.isPending}
              data-testid="confirm-cancel-customer-request"
              onClick={(event) => {
                // Keep the dialog open until the request settles.
                event.preventDefault();
                handleCancel();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelRequest.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t(`${CR_NS}:detail.cancelDialog.confirm`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
