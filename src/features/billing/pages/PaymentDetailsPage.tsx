/**
 * Payment Details Page.
 *
 * Provider-agnostic — the SAME page for a manual and a future gateway
 * payment, branching only on `capabilities`/`status`/`nextAction`, never
 * on `methodType` with an if/else per method. This is also where a
 * gateway's `returnUrl`/`cancelUrl` would point: whatever query string the
 * customer's browser carries back is NEVER read as proof of outcome
 * (see `Reports/ARCHITECTURE.md`, Prompt 7, "Never trust redirect
 * parameters") — this page always re-derives truth from
 * `usePaymentDetails`, which re-fetches the backend-authoritative
 * `Payment` and polls while it's still in progress.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, Upload, XCircle } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useFilePicker } from '@hooks';
import {
  usePaymentDetails,
  usePaymentMethods,
  useCancelPayment,
  useSubmitPaymentProof,
} from '../hooks';
import { getPaymentProvider } from '../providers/PaymentProviderRegistry';
import { isManualReviewProvider } from '../providers/PaymentProviderAdapter';
import {
  getManualReviewStatusTone,
  getPaymentStatusTone,
} from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYMENT_PROOF_FILE_SIZE,
} from '../constants/billing.constants';
import { TERMINAL_PAYMENT_STATUSES } from '@types';

export default function PaymentDetailsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { paymentId } = useParams<{ paymentId: string }>();
  const { organization } = useAuth();

  const { data: payment, isLoading, error, refetch } = usePaymentDetails(
    paymentId ?? ''
  );
  const paymentMethodsQuery = usePaymentMethods();
  const submitProof = useSubmitPaymentProof();
  const cancelPayment = useCancelPayment();

  const [note, setNote] = useState('');
  const [fileError, setFileError] = useState<string>();
  const filePicker = useFilePicker({
    accept: ALLOWED_PAYMENT_PROOF_TYPES.join(','),
  });

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;
    if (file.size > MAX_PAYMENT_PROOF_FILE_SIZE) {
      setFileError('payments:payment.proofTooLarge');
      filePicker.clearFiles();
      return;
    }
    if (!ALLOWED_PAYMENT_PROOF_TYPES.includes(file.type)) {
      setFileError('payments:payment.proofInvalidType');
      filePicker.clearFiles();
      return;
    }
    setFileError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !payment || !organization?.id) {
    return (
      <PageContainer>
        <PageHeader titleKey="payments:payment.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const method = paymentMethodsQuery.data?.find(
    (candidate) => candidate.key === payment.methodKey
  );
  const provider = getPaymentProvider(payment.provider);
  const isTerminal = TERMINAL_PAYMENT_STATUSES.includes(payment.status);
  const proofFile = filePicker.files?.[0];

  const handleSubmitProof = () => {
    if (!proofFile || !provider || !isManualReviewProvider(provider)) return;
    submitProof.mutate({
      organizationId: organization.id,
      paymentId: payment.id,
      file: proofFile,
      note: note || undefined,
      provider,
    });
  };

  const handleCancel = () => {
    if (!provider) return;
    cancelPayment.mutate({
      organizationId: organization.id,
      paymentId: payment.id,
      provider,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:payment.title"
        descriptionKey="payments:payment.subtitle"
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
                {t(`payments:common.methodType.${payment.methodType}`)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge
                labelKey={`payments:payment.status.${payment.status}`}
                tone={getPaymentStatusTone(payment.status)}
              />
              {payment.reviewStatus !== 'not_required' ? (
                <StatusBadge
                  labelKey={`payments:payment.reviewStatus.${payment.reviewStatus}`}
                  tone={getManualReviewStatusTone(payment.reviewStatus)}
                />
              ) : null}
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
                {t('payments:payment.createdAt')}
              </span>
              <span>{new Date(payment.createdAt).toLocaleString(i18n.language)}</span>
            </div>
            {payment.failureReason ? (
              <p className="rounded-md bg-destructive-surface p-3 text-destructive">
                {payment.failureReason}
              </p>
            ) : null}
            {payment.reviewStatus === 'rejected' && payment.reviewNotes ? (
              <p className="rounded-md bg-destructive-surface p-3 text-destructive">
                {payment.reviewNotes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {payment.attempts.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('payments:payment.attemptsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payment.attempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {t('payments:payment.attemptLabel', { number: index + 1 })}
                  </span>
                  <div className="flex items-center gap-2">
                    {attempt.failureReason ? (
                      <span className="text-xs text-destructive">
                        {attempt.failureReason}
                      </span>
                    ) : null}
                    <StatusBadge
                      labelKey={`payments:payment.attemptStatus.${attempt.status}`}
                      tone={getPaymentStatusTone(
                        attempt.status === 'initiated' ? 'created' : attempt.status
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {payment.status === 'succeeded' ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <CheckCircle2
                className="size-8 shrink-0 text-success"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm text-foreground">
                {t('payments:payment.succeededMessage')}
              </p>
            </CardContent>
          </Card>
        ) : payment.status === 'failed' ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <XCircle
                className="size-8 shrink-0 text-destructive"
                strokeWidth={1.75}
                aria-hidden
              />
              <p className="text-sm text-foreground">
                {t('payments:payment.failedMessage')}
              </p>
            </CardContent>
          </Card>
        ) : payment.reviewStatus === 'pending' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('payments:payment.awaitingReviewTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('payments:payment.awaitingReviewDescription')}
              </p>
              {payment.proof ? (
                <a
                  href={payment.proof.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {t('payments:payment.viewProof')}
                  <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
                </a>
              ) : null}
            </CardContent>
          </Card>
        ) : method?.capabilities.supportsProof && !payment.proof ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('payments:payment.instructionsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {method.manualInstructions?.type === 'manual_bank_transfer' ? (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.bankName')}</dt>
                    <dd className="font-medium text-foreground">{method.manualInstructions.bankName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.accountName')}</dt>
                    <dd className="font-medium text-foreground">{method.manualInstructions.accountName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.accountNumber')}</dt>
                    <dd className="font-mono text-foreground">{method.manualInstructions.accountNumber}</dd>
                  </div>
                  {method.manualInstructions.iban ? (
                    <div>
                      <dt className="text-muted-foreground">{t('payments:payment.iban')}</dt>
                      <dd className="font-mono text-foreground">{method.manualInstructions.iban}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : method.manualInstructions?.type === 'manual_wallet_transfer' ? (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.walletProvider')}</dt>
                    <dd className="font-medium text-foreground">{method.manualInstructions.walletProvider}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.walletNumber')}</dt>
                    <dd className="font-mono text-foreground">{method.manualInstructions.walletNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('payments:payment.accountName')}</dt>
                    <dd className="font-medium text-foreground">{method.manualInstructions.accountName}</dd>
                  </div>
                </dl>
              ) : null}

              {method.manualInstructions ? (
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">{method.manualInstructions.instructions}</p>
                  <p className="text-muted-foreground">
                    {method.manualInstructions.referenceInstructions}
                  </p>
                </div>
              ) : null}

              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">
                  {t('payments:payment.uploadProofTitle')}
                </p>
                <Button type="button" variant="outline" onClick={filePicker.openFilePicker}>
                  <Upload className="size-4" strokeWidth={2} aria-hidden />
                  {proofFile ? proofFile.name : t('payments:payment.chooseFile')}
                </Button>
                {fileError ? (
                  <p className="text-sm text-destructive">{t(fileError)}</p>
                ) : null}
                <Textarea
                  placeholder={t('payments:payment.proofNotePlaceholder')}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                />
                {submitProof.error ? (
                  <ErrorState onRetry={handleSubmitProof} />
                ) : null}
                <Button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={!proofFile || !!fileError || submitProof.isPending}
                >
                  {submitProof.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t('payments:payment.submittingProof')}
                    </>
                  ) : (
                    t('payments:payment.submitProof')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : payment.nextAction?.type === 'redirect' ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">
                {t('payments:payment.redirectDescription')}
              </p>
              <Button asChild>
                <a href={payment.nextAction.redirectUrl}>
                  {t('payments:payment.continueToProvider')}
                  <ExternalLink className="size-4" strokeWidth={2} aria-hidden />
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : payment.nextAction?.type === 'additional_authentication' ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-foreground">
                {payment.nextAction.description}
              </p>
            </CardContent>
          </Card>
        ) : !isTerminal ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {t('payments:payment.processingMessage')}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!isTerminal ? (
            <Button type="button" variant="outline" onClick={() => refetch()}>
              {t('payments:payment.refreshStatus')}
            </Button>
          ) : null}
          {!isTerminal && method?.capabilities.supportsCancellation ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelPayment.isPending}
            >
              {t('payments:payment.cancelPayment')}
            </Button>
          ) : null}
        </div>
        {cancelPayment.error ? <ErrorState onRetry={handleCancel} /> : null}
      </div>
    </PageContainer>
  );
}
