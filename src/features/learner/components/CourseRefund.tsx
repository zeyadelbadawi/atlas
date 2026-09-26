/**
 * Self-service course refund — the confirmation dialog and the refunded
 * row's details (backend P13, `course-orders/:id/refund`).
 *
 * THE DIALOG STATES THE CONSEQUENCE BEFORE THE MONEY. The backend refunds in
 * full with no review step and, in the same transaction, revokes the
 * learner's enrollment (`status: 'unavailable'`, `revokeReason: 'refund'`)
 * while keeping the enrollment row, so progress stays on record. A learner
 * who clicks "refund" is also clicking "lose access now", and the dialog
 * says so in those words, in a list, before the destructive button.
 *
 * ONE IDEMPOTENCY KEY PER ATTEMPT. The key is created by the caller when the
 * dialog opens and stays the same for every confirm pressed while it is open
 * — so "Try again" after a network failure replays the SAME attempt and the
 * server can never refund twice. Closing and reopening is a new attempt with
 * a new key. (The server also returns the existing refund for an order that
 * already has one, whatever the key.)
 *
 * The dialog cannot be dismissed while the request is in flight: closing it
 * then would hide the outcome of a financial action.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter } from '@hooks';
import { apiErrorMessage } from '@utils';
import { formatMoney } from '@features/billing';
import type { ApiError } from '@api';
import type { CourseOrder } from '@types';
import { useCourseOrderRefund } from '../hooks';

/** The backend's `RequestCourseOrderRefundDto.reason` limit. */
export const REFUND_REASON_MAX_LENGTH = 1000;

export interface RequestRefundDialogProps {
  /** The order being refunded; `null` keeps the dialog closed. */
  readonly order: CourseOrder | null;
  readonly locale: string;
  readonly reason: string;
  readonly onReasonChange: (reason: string) => void;
  readonly isPending: boolean;
  readonly error: ApiError | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

export function RequestRefundDialog({
  order,
  locale,
  reason,
  onReasonChange,
  isPending,
  error,
  onConfirm,
  onClose,
}: RequestRefundDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const reasonId = useId();
  const hintId = useId();

  const course = order?.snapshot.course.title ?? '';
  const amount = order ? formatMoney(order.snapshot.price, locale) : '';

  const errorMessage = !error
    ? null
    : error.kind === 'notFound'
      ? t('learning:learnerDashboard.purchases.refund.errors.notFound')
      : apiErrorMessage(t, i18n, error, {
          fallbackKey:
            'learning:learnerDashboard.purchases.refund.errors.fallback',
        });

  return (
    <AlertDialog
      open={!!order}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('learning:learnerDashboard.purchases.refund.dialog.title', {
              course,
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'learning:learnerDashboard.purchases.refund.dialog.description',
              {
                amount,
              }
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {t(
              'learning:learnerDashboard.purchases.refund.dialog.consequencesTitle'
            )}
          </p>
          <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
            <li className="font-medium text-foreground">
              {t(
                'learning:learnerDashboard.purchases.refund.dialog.accessEnds'
              )}
            </li>
            <li>
              {t(
                'learning:learnerDashboard.purchases.refund.dialog.progressKept'
              )}
            </li>
            <li>
              {t(
                'learning:learnerDashboard.purchases.refund.dialog.moneyNote',
                { amount }
              )}
            </li>
            <li>
              {t('learning:learnerDashboard.purchases.refund.dialog.final')}
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor={reasonId}>
            {t('learning:learnerDashboard.purchases.refund.dialog.reasonLabel')}
          </Label>
          <Textarea
            id={reasonId}
            rows={3}
            dir="auto"
            maxLength={REFUND_REASON_MAX_LENGTH}
            value={reason}
            disabled={isPending}
            aria-describedby={hintId}
            onChange={(event) => onReasonChange(event.target.value)}
          />
          <p id={hintId} className="text-xs text-muted-foreground">
            {t('learning:learnerDashboard.purchases.refund.dialog.reasonHint', {
              max: REFUND_REASON_MAX_LENGTH,
            })}
          </p>
        </div>

        {/* A failure is said here, where the learner is looking, and the
            dialog stays open so confirming again retries the SAME attempt. */}
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('common:actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={isPending}
            aria-busy={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {isPending
              ? t('learning:learnerDashboard.purchases.refund.dialog.pending')
              : t('learning:learnerDashboard.purchases.refund.dialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface RefundDetailsProps {
  readonly orderId: string;
  readonly locale: string;
}

/**
 * What a refunded row says about its refund: amount, date and status.
 * Read only for `refunded` orders. `null` from the server (no refund row,
 * e.g. an order refunded by some other path) shows nothing extra — the
 * order's own "Refunded" badge already says what is known.
 */
export function RefundDetails({
  orderId,
  locale,
}: RefundDetailsProps): JSX.Element | null {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { data, isLoading, error, refetch } = useCourseOrderRefund(orderId);

  if (isLoading) {
    return (
      <span role="status" className="inline-flex items-center">
        <span className="sr-only">
          {t('learning:learnerDashboard.purchases.refund.loading')}
        </span>
        <Skeleton className="h-4 w-40" />
      </span>
    );
  }

  if (error) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t('learning:learnerDashboard.purchases.refund.loadFailed')}
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => void refetch()}
        >
          {t('learning:learnerDashboard.purchases.refund.retry')}
        </Button>
      </span>
    );
  }

  if (!data) return null;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        {t('learning:learnerDashboard.purchases.refund.refundedOn', {
          amount: formatMoney(data.money, locale),
          when: fmt.date(data.processedAt ?? data.requestedAt),
        })}
      </span>
      <span aria-hidden>·</span>
      <span className="font-medium text-foreground">
        {t(`learning:learnerDashboard.purchases.refund.status.${data.status}`)}
      </span>
    </span>
  );
}
