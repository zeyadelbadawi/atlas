/**
 * Platform Payment Review — Detail Page.
 *
 * Approve/Reject are gated INLINE by `platform.payment.approve`/
 * `platform.payment.reject` (a viewer with only `platform.payment.view`
 * sees a read-only notice instead of a disabled-looking form) — the same
 * "route-level view permission vs. page-level action permission"
 * separation Prompt 5 established for grading. Additionally guards against
 * a reviewer approving/rejecting their OWN organization's payment: a
 * UX-layer check only — the backend remains the actual authority (see
 * `Reports/ARCHITECTURE.md`, Prompt 7, "Tenant Owner cannot approve own
 * payment").
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
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
import { useAuth, usePermissions } from '@hooks';
import { useToast } from '@app/providers/toast/useToast';
import {
  useApprovePayment,
  usePlatformPaymentDetail,
  useRejectPayment,
} from '../hooks';
import { platformPaymentService } from '../services/PlatformPaymentService';
import {
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import {
  approvePaymentSchema,
  rejectPaymentSchema,
  type ApprovePaymentFormData,
  type RejectPaymentFormData,
} from '../schemas/billing.schemas';

export default function PlatformPaymentReviewDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { paymentId } = useParams<{ paymentId: string }>();
  const { organization } = useAuth();
  const { hasPermission } = usePermissions();
  const { notifyError } = useToast();
  const [isOpeningProof, setIsOpeningProof] = useState(false);

  const { data: payment, isLoading, error, refetch } = usePlatformPaymentDetail(
    paymentId ?? ''
  );
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();

  // `payment.proof.fileUrl` is a path relative to the API base, not a
  // usable link `href` on its own — see `PlatformPaymentService.getProofFile`'s
  // doc comment. Fetched as an authenticated Blob, then opened as a local
  // object URL; deliberately not revoked immediately, since the new tab
  // still needs it after this function returns.
  const handleViewProof = async () => {
    if (!payment?.id) return;
    setIsOpeningProof(true);
    try {
      const blob = await platformPaymentService.getProofFile(payment.id);
      window.open(URL.createObjectURL(blob), '_blank', 'noreferrer');
    } catch {
      notifyError('errors:unknown.title', 'payments:payment.proofLoadError');
    } finally {
      setIsOpeningProof(false);
    }
  };

  const approveForm = useForm<ApprovePaymentFormData>({
    resolver: zodResolver(approvePaymentSchema),
    defaultValues: { notes: '' },
  });
  const rejectForm = useForm<RejectPaymentFormData>({
    resolver: zodResolver(rejectPaymentSchema),
    defaultValues: { notes: '' },
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !payment) {
    return (
      <PageContainer>
        <PageHeader titleKey="payments:platformReview.detailTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const isOwnOrganization = payment.organizationId === organization?.id;
  const canApprove = hasPermission('platform.payment.approve');
  const canReject = hasPermission('platform.payment.reject');
  const isPendingReview = payment.reviewStatus === 'pending';

  const onApprove = (data: ApprovePaymentFormData) => {
    approvePayment.mutate({
      paymentId: payment.id,
      payload: { notes: data.notes || undefined },
    });
  };

  const onReject = (data: RejectPaymentFormData) => {
    rejectPayment.mutate({
      paymentId: payment.id,
      payload: { notes: data.notes },
    });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:platformReview.detailTitle"
        descriptionKey="payments:platformReview.detailSubtitle"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle
                className="text-2xl font-semibold"
                data-atlas-numeric="true"
              >
                {formatMoney(payment.money, i18n.language)}
              </CardTitle>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {t('payments:platformReview.organization')}: {payment.organizationId}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
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
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('payments:payment.reference')}
              </span>
              <span className="font-mono text-xs">{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('payments:common.methodType.label')}
              </span>
              <span>{t(`payments:common.methodType.${payment.methodType}`)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('payments:payment.createdAt')}
              </span>
              <span>{new Date(payment.createdAt).toLocaleString(i18n.language)}</span>
            </div>
          </CardContent>
        </Card>

        {payment.proof ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('payments:payment.uploadProofTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payment.proof.note ? (
                <p className="text-sm text-muted-foreground">{payment.proof.note}</p>
              ) : null}
              <button
                type="button"
                onClick={handleViewProof}
                disabled={isOpeningProof}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
              >
                {t('payments:payment.viewProof')}
                {isOpeningProof ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                )}
              </button>
            </CardContent>
          </Card>
        ) : null}

        {!isPendingReview ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('payments:platformReview.alreadyReviewed')}
            </CardContent>
          </Card>
        ) : isOwnOrganization ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-warning"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm text-foreground">
                {t('payments:platformReview.selfReviewBlocked')}
              </p>
            </CardContent>
          </Card>
        ) : !canApprove && !canReject ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('payments:platformReview.readOnlyNotice')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {canApprove ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('payments:platformReview.approveTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...approveForm}>
                    <form
                      onSubmit={approveForm.handleSubmit(onApprove)}
                      className="space-y-3"
                    >
                      <FormField
                        control={approveForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('payments:platformReview.notesOptionalLabel')}
                            </FormLabel>
                            <FormControl>
                              <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {approvePayment.error ? (
                        <ErrorState
                          onRetry={approveForm.handleSubmit(onApprove)}
                        />
                      ) : null}
                      <Button type="submit" disabled={approvePayment.isPending}>
                        {approvePayment.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Check className="size-4" strokeWidth={2} aria-hidden />
                        )}
                        {t('payments:platformReview.approveAction')}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : null}

            {canReject ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('payments:platformReview.rejectTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...rejectForm}>
                    <form
                      onSubmit={rejectForm.handleSubmit(onReject)}
                      className="space-y-3"
                    >
                      <FormField
                        control={rejectForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t('payments:platformReview.notesRequiredLabel')}
                            </FormLabel>
                            <FormControl>
                              <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {rejectPayment.error ? (
                        <ErrorState onRetry={rejectForm.handleSubmit(onReject)} />
                      ) : null}
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={rejectPayment.isPending}
                      >
                        {rejectPayment.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <X className="size-4" strokeWidth={2} aria-hidden />
                        )}
                        {t('payments:platformReview.rejectAction')}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
