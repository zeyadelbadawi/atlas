/**
 * One learner payment to the academy, in a side sheet over the review list
 * (Academy Manual Payments): who paid, for which course, how much, by which
 * method, the reference and proof they sent, and — while it waits for
 * review — Approve and Reject.
 *
 *   - The proof is shown inline when it is an image and opened in a new tab
 *     when it is a PDF; both come from the authenticated API as a Blob.
 *   - Approve asks for confirmation (it gives the learner access and emails
 *     them). Reject takes an optional reason, shown to the learner and sent
 *     in their email, and also asks for confirmation.
 *   - The server decides: a payment someone else already reviewed answers
 *     409, shown here as "already reviewed" with the list refreshed.
 *   - Learner text (note, reference) is rendered as text, never markup.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@components/data-display';
import { useConfirmDialog, useToast } from '@app/providers';
import { useDateFormatter } from '@hooks';
import { hasMessageKey } from '@utils';
import {
  MAX_PAYMENT_REVIEW_NOTES_LENGTH,
  ManualPaymentInstructionsPanel,
  formatMoney,
  getManualReviewStatusTone,
} from '@features/billing';
import {
  useAcademyCoursePayment,
  useApproveAcademyCoursePayment,
  useRejectAcademyCoursePayment,
} from '../hooks';
import { useAcademyPaymentProof } from '../hooks/useAcademyPaymentProof';
import { academyPaymentMethodMeta } from './academy-payment-method.meta';

const K = 'payments:academyReview';

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground sm:text-end">
        {children}
      </dd>
    </div>
  );
}

export interface AcademyPaymentReviewSheetProps {
  readonly academyId: string;
  readonly paymentId: string | null;
  readonly locale: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function AcademyPaymentReviewSheet({
  academyId,
  paymentId,
  locale,
  onOpenChange,
}: AcademyPaymentReviewSheetProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { confirm } = useConfirmDialog();
  const { notifySuccess, notifyError } = useToast();
  const open = paymentId !== null;
  const detail = useAcademyCoursePayment(academyId, paymentId ?? undefined);
  const payment = detail.data;
  const approve = useApproveAcademyCoursePayment(academyId);
  const reject = useRejectAcademyCoursePayment(academyId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const isImage = payment?.proof?.mimeType.startsWith('image/') ?? false;
  const proof = useAcademyPaymentProof(
    academyId,
    payment?.id,
    open && !!payment?.proof
  );

  const isPending = payment?.reviewStatus === 'pending';
  const deciding = approve.isPending || reject.isPending;
  const amount = payment ? formatMoney(payment.money, locale) : '';
  const meta = payment
    ? academyPaymentMethodMeta(payment.methodType)
    : undefined;
  const MethodIcon = meta?.icon;

  const resetLocal = () => {
    setRejecting(false);
    setReason('');
    setAlreadyReviewed(false);
  };

  const onConflict = (error: unknown): boolean => {
    if (hasMessageKey(error, 'errors.payment.notPendingReview')) {
      setAlreadyReviewed(true);
      void detail.refetch();
      return true;
    }
    return false;
  };

  const onApprove = async () => {
    if (!payment) return;
    const confirmed = await confirm({
      titleKey: `${K}.confirmApprove.title`,
      descriptionKey: `${K}.confirmApprove.description`,
      confirmLabelKey: `${K}.confirmApprove.confirm`,
      values: {
        amount,
        learner: payment.learner.name,
        course: payment.course.title,
      },
    });
    if (!confirmed) return;
    approve.mutate(
      { paymentId: payment.id, payload: {} },
      {
        onSuccess: () => {
          notifySuccess(`${K}.approvedToast`, undefined, {
            learner: payment.learner.name,
          });
          resetLocal();
        },
        onError: (error) => {
          if (!onConflict(error)) notifyError(`${K}.decisionError`);
        },
      }
    );
  };

  const onReject = async () => {
    if (!payment) return;
    const confirmed = await confirm({
      titleKey: `${K}.confirmReject.title`,
      descriptionKey: `${K}.confirmReject.description`,
      confirmLabelKey: `${K}.confirmReject.confirm`,
      intent: 'destructive',
      values: { amount, learner: payment.learner.name },
    });
    if (!confirmed) return;
    const trimmed = reason.trim();
    reject.mutate(
      {
        paymentId: payment.id,
        payload: trimmed ? { reason: trimmed } : {},
      },
      {
        onSuccess: () => {
          notifySuccess(`${K}.rejectedToast`, undefined, {
            learner: payment.learner.name,
          });
          resetLocal();
        },
        onError: (error) => {
          if (!onConflict(error)) notifyError(`${K}.decisionError`);
        },
      }
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) resetLocal();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl"
        data-testid="academy-payment-sheet"
      >
        <SheetHeader className="space-y-1 text-start">
          <SheetTitle>{t(`${K}.sheetTitle`)}</SheetTitle>
          <SheetDescription>
            {payment
              ? t(`${K}.sheetDescription`, {
                  learner: payment.learner.name,
                  course: payment.course.title,
                })
              : t(`${K}.loading`)}
          </SheetDescription>
        </SheetHeader>

        {detail.isLoading || !payment ? (
          detail.error ? (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription>{t(`${K}.loadError`)}</AlertDescription>
            </Alert>
          ) : (
            <div className="mt-6 space-y-3" aria-busy="true">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-40 w-full" />
            </div>
          )
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                labelKey={`${K}.status.${payment.reviewStatus}`}
                tone={getManualReviewStatusTone(payment.reviewStatus)}
              />
              <span
                className="text-xl font-semibold tabular-nums text-foreground"
                data-atlas-numeric="true"
                data-testid="academy-payment-amount"
              >
                {amount}
              </span>
            </div>

            {alreadyReviewed ? (
              <Alert role="status">
                <AlertDescription>{t(`${K}.alreadyReviewed`)}</AlertDescription>
              </Alert>
            ) : null}

            <dl className="space-y-2 text-sm">
              <Row label={t(`${K}.fields.learner`)}>
                <span className="block font-medium" dir="auto">
                  {payment.learner.name}
                </span>
                <span
                  className="block text-xs text-muted-foreground"
                  dir="ltr"
                  data-ltr-content
                >
                  {payment.learner.maskedEmail}
                </span>
              </Row>
              <Row label={t(`${K}.fields.course`)}>
                <span dir="auto">{payment.course.title}</span>
              </Row>
              <Row label={t(`${K}.fields.method`)}>
                <span className="inline-flex items-center gap-1.5">
                  {MethodIcon ? (
                    <MethodIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                  {t(`payments:common.methodType.${payment.methodType}`)}
                </span>
              </Row>
              <Row label={t(`${K}.fields.submittedAt`)}>
                {payment.proof
                  ? fmt.dateTime(payment.proof.uploadedAt)
                  : fmt.dateTime(payment.createdAt)}
              </Row>
              <Row label={t(`${K}.fields.reference`)}>
                {payment.proof?.payerReference ? (
                  <span
                    className="font-mono"
                    dir="ltr"
                    data-ltr-content
                    data-testid="academy-payment-reference"
                  >
                    {payment.proof.payerReference}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t(`${K}.none`)}
                  </span>
                )}
              </Row>
              {payment.proof?.note ? (
                <Row label={t(`${K}.fields.note`)}>
                  <span className="whitespace-pre-wrap" dir="auto">
                    {payment.proof.note}
                  </span>
                </Row>
              ) : null}
              <Row label={t(`${K}.fields.paymentId`)}>
                <span className="font-mono text-xs" dir="ltr" data-ltr-content>
                  {payment.id}
                </span>
              </Row>
            </dl>

            <Separator />

            <section
              aria-labelledby="academy-payment-proof-title"
              className="space-y-3"
            >
              <h3
                id="academy-payment-proof-title"
                className="text-sm font-semibold"
              >
                {t(`${K}.proofTitle`)}
              </h3>
              {!payment.proof ? (
                <p className="text-sm text-muted-foreground">
                  {t(`${K}.noProof`)}
                </p>
              ) : proof.isLoading ? (
                <Skeleton
                  className="h-48 w-full"
                  aria-label={t(`${K}.proofLoading`)}
                />
              ) : proof.error || !proof.url ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-destructive" role="alert">
                    {t(`${K}.proofError`)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={proof.reload}
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    {t('common:actions.retry')}
                  </Button>
                </div>
              ) : isImage ? (
                <div className="space-y-2">
                  <a
                    href={proof.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-border bg-muted"
                  >
                    <img
                      src={proof.url}
                      alt={t(`${K}.proofAlt`, {
                        learner: payment.learner.name,
                      })}
                      className="mx-auto max-h-96 w-auto object-contain"
                      data-testid="academy-payment-proof-image"
                    />
                  </a>
                  <p className="text-xs text-muted-foreground" dir="auto">
                    {payment.proof.fileName}
                  </p>
                </div>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="min-h-11 sm:min-h-9"
                >
                  <a
                    href={proof.url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="academy-payment-proof-open"
                  >
                    <FileText className="size-4" aria-hidden />
                    {t(`${K}.openPdf`, { file: payment.proof.fileName })}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </Button>
              )}
            </section>

            {payment.instructions ? (
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {t(`${K}.instructionsTitle`)}
                </summary>
                <div className="mt-3">
                  <ManualPaymentInstructionsPanel
                    instructions={payment.instructions}
                  />
                </div>
              </details>
            ) : null}

            {payment.reviews.length > 0 ? (
              <section
                aria-labelledby="academy-payment-history-title"
                className="space-y-2"
              >
                <h3
                  id="academy-payment-history-title"
                  className="text-sm font-semibold"
                >
                  {t(`${K}.historyTitle`)}
                </h3>
                <ul className="space-y-2 text-sm" role="list">
                  {payment.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-md bg-muted px-3 py-2"
                    >
                      <p className="text-foreground">
                        {t(`${K}.historyEntry.${review.status}`, {
                          reviewer: review.reviewerName ?? t(`${K}.someone`),
                          when: fmt.dateTime(review.reviewedAt),
                        })}
                      </p>
                      {review.notes ? (
                        <p
                          className="mt-1 whitespace-pre-wrap text-muted-foreground"
                          dir="auto"
                        >
                          {review.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {isPending ? (
              <section
                aria-label={t(`${K}.decisionLabel`)}
                className="space-y-3 border-t border-border pt-4"
              >
                <p className="text-sm text-muted-foreground">
                  {t(`${K}.decisionHint`)}
                </p>
                {rejecting ? (
                  <div className="space-y-2">
                    <Label htmlFor="academy-payment-reject-reason">
                      {t(`${K}.reasonLabel`)}
                    </Label>
                    <Textarea
                      id="academy-payment-reject-reason"
                      rows={3}
                      value={reason}
                      maxLength={MAX_PAYMENT_REVIEW_NOTES_LENGTH}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={t(`${K}.reasonPlaceholder`)}
                      aria-describedby="academy-payment-reject-help"
                      dir="auto"
                      data-testid="academy-payment-reject-reason"
                    />
                    <p
                      id="academy-payment-reject-help"
                      className="text-xs text-muted-foreground"
                    >
                      {t(`${K}.reasonHelp`)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-11 sm:min-h-9"
                        disabled={deciding}
                        onClick={() => void onReject()}
                        data-testid="academy-payment-reject-confirm"
                      >
                        {reject.isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <X className="size-4" aria-hidden />
                        )}
                        {t(`${K}.reject`)}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 sm:min-h-9"
                        disabled={deciding}
                        onClick={() => setRejecting(false)}
                      >
                        {t('common:actions.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="min-h-11 sm:min-h-9"
                      disabled={deciding}
                      onClick={() => void onApprove()}
                      data-testid="academy-payment-approve"
                    >
                      {approve.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="size-4" aria-hidden />
                      )}
                      {t(`${K}.approve`)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 border-destructive/50 text-destructive hover:bg-destructive/10 sm:min-h-9"
                      disabled={deciding}
                      onClick={() => setRejecting(true)}
                      data-testid="academy-payment-reject"
                    >
                      <X className="size-4" aria-hidden />
                      {t(`${K}.rejectEllipsis`)}
                    </Button>
                  </div>
                )}
              </section>
            ) : payment.reviewStatus === 'rejected' && payment.reviewNotes ? (
              <Alert>
                <AlertDescription>
                  <span className="font-medium">
                    {t(`${K}.rejectionReason`)}
                  </span>{' '}
                  <span className="whitespace-pre-wrap" dir="auto">
                    {payment.reviewNotes}
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
