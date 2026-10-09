/**
 * Platform Course Payments — Detail Page.
 *
 * Mirrors `PlatformPaymentReviewDetailPage` (subscription review): payment
 * summary, the submitted proof opened as an authenticated Blob, then
 * Approve / Reject forms. Differences, each deliberate:
 *
 *   - Every decision is CONFIRMED first. Approving grants a learner paid
 *     course access and records the academy's revenue; rejecting tells the
 *     learner their payment failed. Neither is undoable from here.
 *   - No self-review check in the UI. A course-order payment carries no
 *     `organizationId` in its contract, so the frontend cannot know; the
 *     backend enforces it (403 `errors.payment.cannotReviewOwnOrganization`)
 *     and that message is rendered verbatim through `apiErrorMessage`.
 *   - No per-permission gate: the backend authorizes this route tree by
 *     `PlatformOwnerGuard` alone, and the route is already Platform-Owner
 *     only. Showing a control the server would refuse is avoided by the
 *     route guard, not by an invented permission string.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PaymentProofDialog } from '@/components/payments/PaymentProofDialog';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog, useToast } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { apiErrorMessage } from '@utils';
import {
  formatMoney,
  getCourseOrderStatusTone,
  getManualReviewStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
} from '@features/billing';
import {
  useApproveCourseOrderPayment,
  useCourseOrderPayment,
  useRejectCourseOrderPayment,
} from '../hooks';
import { platformCourseOrderPaymentService } from '../services/PlatformCourseOrderPaymentService';
import { formatBasisPoints } from '../utils/commission.utils';
import {
  approveCourseOrderPaymentSchema,
  rejectCourseOrderPaymentSchema,
  type ApproveCourseOrderPaymentFormData,
  type RejectCourseOrderPaymentFormData,
} from '../schemas/platform-commerce.schemas';

/** How long a proof's object URL stays alive for the tab that opened it. */

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all sm:text-end">{children}</dd>
    </div>
  );
}

export default function PlatformCoursePaymentDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { paymentId } = useParams<{ paymentId: string }>();
  const { notifyError, notifySuccess } = useToast();
  const { confirm } = useConfirmDialog();
  const [isProofOpen, setIsProofOpen] = useState(false);

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useCourseOrderPayment(paymentId ?? '');
  const approvePayment = useApproveCourseOrderPayment();
  const rejectPayment = useRejectCourseOrderPayment();

  const approveForm = useForm<ApproveCourseOrderPaymentFormData>({
    resolver: zodResolver(approveCourseOrderPaymentSchema),
    defaultValues: { notes: '' },
  });
  const rejectForm = useForm<RejectCourseOrderPaymentFormData>({
    resolver: zodResolver(rejectCourseOrderPaymentSchema),
    defaultValues: { notes: '' },
  });

  const breadcrumbs = [
    {
      labelKey: 'platformCommerce:coursePayments.title',
      path: DASHBOARD_ROUTES.platformCoursePayments,
    },
    { labelKey: 'platformCommerce:coursePayments.detailTitle' },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !payment) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="platformCommerce:coursePayments.detailTitle"
          breadcrumbs={breadcrumbs}
        />
        <ErrorState onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const isPendingReview = payment.reviewStatus === 'pending';
  const isDeciding = approvePayment.isPending || rejectPayment.isPending;
  const amount = formatMoney(payment.money, i18n.language);

  const onApprove = async (data: ApproveCourseOrderPaymentFormData) => {
    const confirmed = await confirm({
      titleKey: 'platformCommerce:coursePayments.confirmApprove.title',
      descriptionKey:
        'platformCommerce:coursePayments.confirmApprove.description',
      confirmLabelKey: 'platformCommerce:coursePayments.confirmApprove.confirm',
      values: { amount },
    });
    if (!confirmed) return;
    const notes = data.notes.trim();
    approvePayment.mutate(
      { paymentId: payment.id, payload: { notes: notes || undefined } },
      {
        onSuccess: () =>
          notifySuccess('platformCommerce:coursePayments.approvedToast'),
      }
    );
  };

  const onReject = async (data: RejectCourseOrderPaymentFormData) => {
    const confirmed = await confirm({
      titleKey: 'platformCommerce:coursePayments.confirmReject.title',
      descriptionKey:
        'platformCommerce:coursePayments.confirmReject.description',
      confirmLabelKey: 'platformCommerce:coursePayments.confirmReject.confirm',
      intent: 'destructive',
      values: { amount },
    });
    if (!confirmed) return;
    rejectPayment.mutate(
      { paymentId: payment.id, payload: { notes: data.notes.trim() } },
      {
        onSuccess: () =>
          notifySuccess('platformCommerce:coursePayments.rejectedToast'),
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformCommerce:coursePayments.detailTitle"
        descriptionKey="platformCommerce:coursePayments.detailSubtitle"
        breadcrumbs={breadcrumbs}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle
              className="text-2xl font-semibold"
              data-atlas-numeric="true"
            >
              {amount}
            </CardTitle>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              <StatusBadge
                labelKey={`payments:payment.status.${payment.status}`}
                tone={getPaymentStatusTone(payment.status)}
              />
              <StatusBadge
                labelKey={`payments:payment.reviewStatus.${payment.reviewStatus}`}
                tone={getManualReviewStatusTone(payment.reviewStatus)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <DetailRow label={t('platformCommerce:coursePayments.reference')}>
                <span className="font-mono text-xs" dir="ltr" data-ltr-content>
                  {payment.id}
                </span>
              </DetailRow>
              <DetailRow
                label={t('platformCommerce:coursePayments.courseOrder')}
              >
                <span className="font-mono text-xs" dir="ltr" data-ltr-content>
                  {payment.courseOrderId}
                </span>
              </DetailRow>
              <DetailRow label={t('platformCommerce:coursePayments.academy')}>
                <Link
                  to={buildPath(DASHBOARD_ROUTES.platformAcademyDetail, {
                    academyId: payment.payeeAcademyId,
                  })}
                  className={
                    payment.academy
                      ? 'text-primary hover:underline'
                      : 'font-mono text-xs text-primary hover:underline'
                  }
                  dir={payment.academy ? 'auto' : 'ltr'}
                >
                  {payment.academy?.name ?? payment.payeeAcademyId}
                </Link>
              </DetailRow>
              {payment.course ? (
                <DetailRow label={t('platformCommerce:coursePayments.course')}>
                  <span dir="auto">{payment.course.title}</span>
                </DetailRow>
              ) : null}
              {payment.courseOrderStatus ? (
                <DetailRow
                  label={t('platformCommerce:coursePayments.orderStatus')}
                >
                  <StatusBadge
                    labelKey={`payments:courseOrder.status.${payment.courseOrderStatus}`}
                    tone={getCourseOrderStatusTone(payment.courseOrderStatus)}
                  />
                </DetailRow>
              ) : null}
              {payment.refundStatus ? (
                <DetailRow
                  label={t('platformCommerce:coursePayments.refundStatus')}
                >
                  <StatusBadge
                    labelKey={`payments:refund.status.${payment.refundStatus}`}
                    tone={getRefundStatusTone(payment.refundStatus)}
                  />
                </DetailRow>
              ) : null}
              <DetailRow label={t('platformCommerce:coursePayments.learner')}>
                <Link
                  to={buildPath(DASHBOARD_ROUTES.platformUserDetail, {
                    userId: payment.payerUserId,
                  })}
                  className="font-mono text-xs text-primary hover:underline"
                  dir="ltr"
                  data-ltr-content
                >
                  {payment.payerUserId}
                </Link>
              </DetailRow>
              <DetailRow label={t('payments:common.methodType.label')}>
                {t(`payments:common.methodType.${payment.methodType}`)}
              </DetailRow>
              {payment.commission ? (
                <DetailRow
                  label={t('platformCommerce:coursePayments.commission')}
                >
                  <span data-atlas-numeric="true">
                    {t('platformCommerce:coursePayments.commissionValue', {
                      amount: formatMoney(
                        {
                          amountMinorUnits: payment.commission.amountMinorUnits,
                          currency: payment.money.currency,
                        },
                        i18n.language
                      ),
                      rate: formatBasisPoints(
                        payment.commission.rateBasisPoints,
                        i18n.language
                      ),
                    })}
                  </span>
                </DetailRow>
              ) : null}
              <DetailRow
                label={t('platformCommerce:coursePayments.submittedAt')}
              >
                {new Date(payment.createdAt).toLocaleString(i18n.language)}
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platformCommerce:coursePayments.proofTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payment.proof ? (
              <>
                {payment.proof.note ? (
                  <p className="text-sm text-muted-foreground" dir="auto">
                    {payment.proof.note}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setIsProofOpen(true)}
                >
                  {t('platformCommerce:coursePayments.viewProof')}
                  <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                </Button>
                <PaymentProofDialog
                  open={isProofOpen}
                  onOpenChange={setIsProofOpen}
                  load={() =>
                    platformCourseOrderPaymentService.getProofFile(payment.id)
                  }
                  fileName={payment.proof?.fileName}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('platformCommerce:coursePayments.noProof')}
              </p>
            )}
          </CardContent>
        </Card>

        {payment.reviewNotes || payment.failureReason ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('platformCommerce:coursePayments.reviewNotesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground" dir="auto">
                {payment.reviewNotes ?? payment.failureReason}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!isPendingReview ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('platformCommerce:coursePayments.alreadyReviewed')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('platformCommerce:coursePayments.approveTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...approveForm}>
                  <form
                    onSubmit={approveForm.handleSubmit(onApprove)}
                    className="space-y-3"
                    noValidate
                  >
                    <FormField
                      control={approveForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('platformCommerce:coursePayments.notesOptional')}
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={3} dir="auto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {approvePayment.error ? (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>
                          {apiErrorMessage(t, i18n, approvePayment.error)}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <Button type="submit" disabled={isDeciding}>
                      {approvePayment.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="size-4" strokeWidth={2} aria-hidden />
                      )}
                      {t('platformCommerce:coursePayments.approveAction')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('platformCommerce:coursePayments.rejectTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...rejectForm}>
                  <form
                    onSubmit={rejectForm.handleSubmit(onReject)}
                    className="space-y-3"
                    noValidate
                  >
                    <FormField
                      control={rejectForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('platformCommerce:coursePayments.notesRequired')}
                          </FormLabel>
                          <FormControl>
                            <Textarea rows={3} dir="auto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {rejectPayment.error ? (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>
                          {apiErrorMessage(t, i18n, rejectPayment.error)}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isDeciding}
                    >
                      {rejectPayment.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <X className="size-4" strokeWidth={2} aria-hidden />
                      )}
                      {t('platformCommerce:coursePayments.rejectAction')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
