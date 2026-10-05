/**
 * `/my/purchases` — the learner's own orders (§E.1).
 *
 * THEIR ORDERS WITH THIS ACADEMY, never a cross-academy history. The
 * endpoint is scoped to the caller rather than to a host, so the academy
 * filter lives in `useLearnerPurchases` — see that hook for why it is a
 * tenancy requirement and not a tidy-up. A receipt from a competitor
 * academy appearing on this one's branded dashboard is a leak the
 * customer sees before anyone else does.
 *
 * THE SNAPSHOT IS WHAT IS SHOWN, not the live course. An order carries
 * its own copy of the title and the price as they were when it was
 * placed, and a receipt must keep saying what was actually agreed — a
 * course renamed or repriced next month does not get to rewrite last
 * month's receipt.
 *
 * SELF-SERVICE REFUND (backend P13). A paid order inside the refund window
 * offers "Request refund"; the dialog (`RequestRefundDialog`) states that
 * course access ends before the learner confirms. Whether the action is
 * OFFERED is computed here from `paidAt`; whether it SUCCEEDS is the
 * server's decision, and its refusal is shown in the dialog. A refunded
 * order shows its refund's amount, date and status.
 *
 * NO RECEIPT DOWNLOAD YET, and the page does not pretend otherwise. The
 * order's payment records live behind the course-order payments endpoints
 * and there is no learner-facing receipt document to link to; an
 * enabled-looking button that produced nothing would be worse than its
 * absence.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Receipt, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { formatMoney } from '@features/billing';
import { LANGUAGES } from '@localization';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { RefundDetails, RequestRefundDialog } from '../components/CourseRefund';
import { useLearnerPurchases, useRequestCourseOrderRefund } from '../hooks';
import { refundEligibility } from '../utils/course-refund.utils';
import { hasMessageKey } from '@utils';
import type { CourseOrder, CourseOrderStatus, LanguageCode } from '@types';

/** One refund attempt: the order and the key every retry of it reuses. */
interface RefundAttempt {
  readonly order: CourseOrder;
  readonly idempotencyKey: string;
}

/** Server answers after which the list itself is stale and is re-read. */
const STALE_ORDER_MESSAGE_KEYS = [
  'errors.courseOrder.refundNotEligible',
  'errors.courseOrder.refundWindowElapsed',
] as const;

/** Paid is the only success; everything else is either waiting or over. */
const STATUS_VARIANT: Readonly<
  Record<CourseOrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'>
> = {
  draft: 'outline',
  pending_payment: 'secondary',
  paid: 'default',
  expired: 'outline',
  cancelled: 'outline',
  refunded: 'destructive',
};

export default function LearnerPurchasesPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  /*
   * The active language is read from i18next rather than from
   * `useLanguage`, for the same reason `useDateFormatter` reads it there:
   * i18next's instance is what every `t()` on this page already follows,
   * and taking the locale from a second source is how a page ends up
   * rendering Arabic copy beside an `en-US` currency format.
   */
  const language = i18n.language as LanguageCode;
  const locale = LANGUAGES[language].locale;
  const { orders, isLoading, error, refetch } = useLearnerPurchases();
  const requestRefund = useRequestCourseOrderRefund();
  const [attempt, setAttempt] = useState<RefundAttempt | null>(null);
  const [reason, setReason] = useState('');
  const [completedCourse, setCompletedCourse] = useState<string | null>(null);

  const openRefund = (order: CourseOrder): void => {
    requestRefund.reset();
    setReason('');
    setCompletedCourse(null);
    // A new attempt gets a new key; every confirm while this dialog stays
    // open reuses it, so a retry can never become a second refund.
    setAttempt({ order, idempotencyKey: crypto.randomUUID() });
  };

  const closeRefund = (): void => {
    setAttempt(null);
    requestRefund.reset();
  };

  const confirmRefund = (): void => {
    if (!attempt) return;
    const trimmed = reason.trim();
    requestRefund.mutate(
      {
        orderId: attempt.order.id,
        idempotencyKey: attempt.idempotencyKey,
        ...(trimmed ? { reason: trimmed } : {}),
      },
      {
        onSuccess: () => {
          setCompletedCourse(attempt.order.snapshot.course.title);
          setAttempt(null);
        },
        onError: (mutationError) => {
          if (
            STALE_ORDER_MESSAGE_KEYS.some((key) =>
              hasMessageKey(mutationError, key)
            )
          ) {
            refetch();
          }
        },
      }
    );
  };

  const header = (
    <LearnerPageHeader
      section="purchases"
      titleKey="learning:learnerDashboard.purchases.title"
      descriptionKey="learning:learnerDashboard.purchases.subtitle"
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState onRetry={refetch} />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        {header}
        <div className="space-y-2" role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.purchases.loading')}
          </span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </>
    );
  }

  if (orders.length === 0) {
    return (
      <>
        {header}
        <LearnerSectionPlaceholder
          icon={Receipt}
          titleKey="learning:learnerDashboard.purchases.empty.title"
          descriptionKey="learning:learnerDashboard.purchases.empty.description"
        />
      </>
    );
  }

  return (
    <>
      {header}

      {/* Announced once, after the dialog closes on success. */}
      <div role="status" aria-live="polite">
        {completedCourse ? (
          <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden
            />
            <span>
              {t('learning:learnerDashboard.purchases.refund.done', {
                course: completedCourse,
              })}
            </span>
          </p>
        ) : null}
      </div>

      <ul className="space-y-2" role="list">
        {orders.map((order) => {
          const eligibility = refundEligibility(order);
          return (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Receipt
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {order.snapshot.course.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('learning:learnerDashboard.purchases.placedOn', {
                    when: fmt.date(order.createdAt),
                  })}
                </p>
              </div>

              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                {formatMoney(order.snapshot.price, locale)}
              </span>

              <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>
                {t(
                  `learning:learnerDashboard.purchases.status.${order.status}`
                )}
              </Badge>

              {eligibility.kind === 'eligible' ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-2 ps-7">
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'learning:learnerDashboard.purchases.refund.eligibleUntil',
                      {
                        when: fmt.date(eligibility.deadline),
                      }
                    )}
                  </p>
                  {/* 44 px tall on touch widths, 36 px where a pointer is the norm. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 sm:h-9"
                    aria-label={t(
                      'learning:learnerDashboard.purchases.refund.actionFor',
                      { course: order.snapshot.course.title }
                    )}
                    onClick={() => openRefund(order)}
                  >
                    <Undo2 className="size-4" aria-hidden />
                    {t('learning:learnerDashboard.purchases.refund.action')}
                  </Button>
                </div>
              ) : eligibility.kind === 'windowClosed' ? (
                <p className="w-full ps-7 text-xs text-muted-foreground">
                  {t(
                    'learning:learnerDashboard.purchases.refund.windowClosed',
                    {
                      when: fmt.date(eligibility.deadline),
                    }
                  )}
                </p>
              ) : eligibility.kind === 'contactAcademy' ? (
                <p className="w-full ps-7 text-xs text-muted-foreground">
                  {t(
                    'learning:learnerDashboard.purchases.refund.contactAcademy'
                  )}
                </p>
              ) : order.status === 'refunded' ? (
                <div className="w-full ps-7">
                  <RefundDetails orderId={order.id} locale={locale} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <RequestRefundDialog
        order={attempt?.order ?? null}
        locale={locale}
        reason={reason}
        onReasonChange={setReason}
        isPending={requestRefund.isPending}
        error={requestRefund.error ?? null}
        onConfirm={confirmRefund}
        onClose={closeRefund}
      />
    </>
  );
}
