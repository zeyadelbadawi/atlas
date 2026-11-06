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
import { PaymentProofDialog } from '@/components/payments/PaymentProofDialog';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
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
import { useAuth, useDateFormatter, usePermissions } from '@hooks';
import { useToast } from '@app/providers/toast/useToast';
import { useConfirmDialog } from '@app/providers/dialog/useConfirmDialog';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { RequiredMark, SaveFailedAlert, useServerValidation } from '@forms';
import type { ApiError } from '@api';
import type { ManualPaymentInstructions, Payment } from '@types';
import { CopyValueButton } from '../components/CopyValueButton';
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
import { formatCheckoutSummary } from '../utils/platform-payment-list.utils';
import {
  approvePaymentSchema,
  rejectPaymentSchema,
  type ApprovePaymentFormData,
  type RejectPaymentFormData,
} from '../schemas/billing.schemas';
import { directionOf } from '@utils';

export default function PlatformPaymentReviewDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { paymentId } = useParams<{ paymentId: string }>();
  const { organization } = useAuth();
  const { hasPermission } = usePermissions();
  const { notifySuccess } = useToast();
  const { confirm } = useConfirmDialog();
  const fmt = useDateFormatter();
  const [isProofOpen, setIsProofOpen] = useState(false);
  // B8 (UX audit) V03 — a 409 means someone else decided first: the page
  // reloads the payment and says so, instead of inviting a second try.
  const [decidedElsewhere, setDecidedElsewhere] = useState(false);

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = usePlatformPaymentDetail(paymentId ?? '');
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();

  const approveForm = useForm<ApprovePaymentFormData>({
    resolver: zodResolver(approvePaymentSchema),
    defaultValues: { notes: '' },
  });
  const rejectForm = useForm<RejectPaymentFormData>({
    resolver: zodResolver(rejectPaymentSchema),
    defaultValues: { notes: '' },
  });
  // A 400 on `notes` marks that field; nothing else is said about it.
  useServerValidation(approveForm, approvePayment.error ?? null);
  useServerValidation(rejectForm, rejectPayment.error ?? null);

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
  // One decision at a time: while either request is in flight BOTH actions
  // are disabled, so an approve and a reject can never race each other.
  const isDeciding = approvePayment.isPending || rejectPayment.isPending;
  const planSummary = formatCheckoutSummary(
    t,
    payment.checkoutSummary,
    directionOf(i18n)
  );

  const organizationName =
    payment.organization?.name ??
    t('payments:platformReview.unknownOrganization');
  const amount = formatMoney(payment.money, i18n.language);

  /** A 409 reloads the payment (it was decided elsewhere); anything else stays on the form. */
  const onDecisionError = (error: ApiError) => {
    if (error.kind === 'conflict') {
      setDecidedElsewhere(true);
      void refetch();
    }
  };

  const onApprove = async (data: ApprovePaymentFormData) => {
    // B8 (UX audit) V01 — approving activates a paid subscription: say
    // what, for whom and for how much before it happens.
    const confirmed = await confirm({
      titleKey: 'payments:platformReview.approveConfirm.title',
      descriptionKey: planSummary
        ? 'payments:platformReview.approveConfirm.descriptionWithPlan'
        : 'payments:platformReview.approveConfirm.description',
      confirmLabelKey: 'payments:platformReview.approveConfirm.confirm',
      values: {
        amount,
        organization: organizationName,
        plan: planSummary ?? '',
      },
    });
    if (!confirmed) return;
    approvePayment.mutate(
      {
        paymentId: payment.id,
        payload: { notes: data.notes || undefined },
      },
      {
        onSuccess: () =>
          notifySuccess(
            'payments:platformReview.approvedToast.title',
            'payments:platformReview.approvedToast.description',
            { amount, organization: organizationName }
          ),
        onError: onDecisionError,
      }
    );
  };

  const onReject = (data: RejectPaymentFormData) => {
    rejectPayment.mutate(
      {
        paymentId: payment.id,
        payload: { notes: data.notes },
      },
      {
        onSuccess: () =>
          notifySuccess(
            'payments:platformReview.rejectedToast.title',
            'payments:platformReview.rejectedToast.description',
            { organization: organizationName }
          ),
        onError: onDecisionError,
      }
    );
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
              <p className="mt-1 text-sm text-muted-foreground">
                {t('payments:platformReview.organization')}:{' '}
                <span className="font-medium text-foreground" dir="auto">
                  {payment.organization?.name ??
                    t('payments:platformReview.unknownOrganization')}
                </span>
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
            {/* B8 (UX audit) V02 — the Checkout ID is the reference the
                customer was told to put on the transfer; the payment id is
                what support quotes. Both copyable, both wrap. */}
            <ReferenceRow
              label={t('payments:platformReview.checkoutId')}
              value={payment.checkoutId}
              testId="payment-review-checkout-id"
            />
            <ReferenceRow
              label={t('payments:platformReview.paymentId')}
              value={payment.id}
              testId="payment-review-payment-id"
            />
            {planSummary ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('payments:platformReview.plan')}
                </span>
                <span className="text-end">{planSummary}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('payments:common.methodType.label')}
              </span>
              <span>
                {t(`payments:common.methodType.${payment.methodType}`)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                {t('payments:payment.createdAt')}
              </span>
              <span className="text-end">
                {fmt.dateTime(payment.createdAt)}
              </span>
            </div>
            {payment.instructions ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {t('payments:platformReview.receivingAccount')}
                </span>
                <span
                  className="min-w-0 break-all text-end font-mono text-xs"
                  dir="ltr"
                  data-testid="payment-review-receiving-account"
                >
                  {receivingAccount(payment.instructions)}
                </span>
              </div>
            ) : null}
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
              <div className="space-y-2 text-sm">
                {payment.proof.payerReference ? (
                  <ReferenceRow
                    label={t('payments:platformReview.payerReference')}
                    value={payment.proof.payerReference}
                    testId="payment-review-payer-reference"
                  />
                ) : null}
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {t('payments:platformReview.uploadedAt')}
                  </span>
                  <span className="text-end">
                    {fmt.dateTime(payment.proof.uploadedAt)}
                  </span>
                </div>
              </div>
              {payment.proof.note ? (
                <p className="text-sm text-muted-foreground" dir="auto">
                  {payment.proof.note}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setIsProofOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
              >
                {t('payments:payment.viewProof')}
                <FileText className="size-3.5" strokeWidth={2} aria-hidden />
              </button>
              <PaymentProofDialog
                open={isProofOpen}
                onOpenChange={setIsProofOpen}
                load={() => platformPaymentService.getProofFile(payment.id)}
                fileName={payment.proof?.fileName}
              />
            </CardContent>
          </Card>
        ) : null}

        {!isPendingReview ? (
          <ReviewedNotice
            payment={payment}
            decidedElsewhere={decidedElsewhere}
          />
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
                      noValidate
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
                      <DecisionFailure
                        error={approvePayment.error ?? null}
                        titleKey="payments:platformReview.approveFailed"
                        onRetry={() =>
                          void approveForm.handleSubmit(onApprove)()
                        }
                      />
                      <Button type="submit" disabled={isDeciding}>
                        {approvePayment.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Check
                            className="size-4"
                            strokeWidth={2}
                            aria-hidden
                          />
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
                      noValidate
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
                              <RequiredMark />
                            </FormLabel>
                            <FormControl>
                              <Textarea rows={3} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DecisionFailure
                        error={rejectPayment.error ?? null}
                        titleKey="payments:platformReview.rejectFailed"
                        onRetry={() => void rejectForm.handleSubmit(onReject)()}
                      />
                      <Button
                        type="submit"
                        variant="destructive"
                        disabled={isDeciding}
                      >
                        {rejectPayment.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
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

/** One reference value: monospace, wraps anywhere, with a copy button. */
function ReferenceRow({
  label,
  value,
  testId,
}: {
  readonly label: string;
  readonly value: string;
  readonly testId: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <span
          className="min-w-0 break-all text-end font-mono text-xs"
          dir="ltr"
          data-testid={testId}
        >
          {value}
        </span>
        <CopyValueButton
          value={value}
          label={t('payments:payment.copyValue', { label })}
        />
      </span>
    </div>
  );
}

/** Where the customer was told to send the money (the payment's own snapshot). */
function receivingAccount(instructions: ManualPaymentInstructions): string {
  switch (instructions.type) {
    case 'manual_bank_transfer':
      return [
        instructions.bankName,
        instructions.iban ?? instructions.accountNumber,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'manual_wallet_transfer':
      return instructions.walletNumber;
    case 'manual_instapay':
      return instructions.instapayAddress;
    default:
      return '';
  }
}

/**
 * B8 (UX audit) V01 — a decided payment says which decision, when, and the
 * reviewer's notes, with the way back to the queue. The API records the
 * reviewer on the review itself but does not return it here, so no name is
 * shown. After a 409 it says the decision was made elsewhere.
 */
function ReviewedNotice({
  payment,
  decidedElsewhere,
}: {
  readonly payment: Payment;
  readonly decidedElsewhere: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const decision =
    payment.reviewStatus === 'approved' || payment.reviewStatus === 'rejected'
      ? payment.reviewStatus
      : null;
  return (
    <Card data-testid="payment-reviewed-notice">
      <CardContent className="space-y-3 p-6 text-sm">
        {decidedElsewhere ? (
          <p className="font-medium text-foreground" role="status">
            {t('payments:platformReview.decidedElsewhere')}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {decision
            ? t(`payments:platformReview.reviewed.${decision}`, {
                date: fmt.dateTime(payment.updatedAt),
              })
            : t('payments:platformReview.reviewed.notRequired')}
        </p>
        {payment.reviewNotes ? (
          <p>
            <span className="text-muted-foreground">
              {t('payments:platformReview.reviewed.notes')}{' '}
            </span>
            <span dir="auto">{payment.reviewNotes}</span>
          </p>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link to={DASHBOARD_ROUTES.platformPayments}>
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('payments:platformReview.backToList')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * B8 (UX audit) V03 — ONE message per failed decision, with the real
 * reason. A violation on `notes` is shown on the field only; a 409 (decided
 * elsewhere) reloads the payment and never offers Try again; anything else
 * is one inline alert. The hooks mark their errors inline, so no toast.
 */
function DecisionFailure({
  error,
  titleKey,
  onRetry,
}: {
  readonly error: ApiError | null;
  readonly titleKey: string;
  readonly onRetry: () => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (!error || error.kind === 'cancelled') return null;
  if (error.violations?.some((violation) => violation.field === 'notes'))
    return null;
  if (error.kind === 'conflict') {
    return (
      <p className="text-sm font-medium" role="status">
        {t('payments:platformReview.decidedElsewhere')}
      </p>
    );
  }
  return (
    <SaveFailedAlert error={error} titleKey={titleKey} onRetry={onRetry} />
  );
}
