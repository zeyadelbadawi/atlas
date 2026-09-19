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
 * NO RECEIPT DOWNLOAD YET, and the page does not pretend otherwise. The
 * order's payment records live behind the course-order payments endpoints
 * and there is no learner-facing receipt document to link to; an
 * enabled-looking button that produced nothing would be worse than its
 * absence.
 */
import { useTranslation } from 'react-i18next';
import { Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { formatMoney } from '@features/billing';
import { LANGUAGES } from '@localization';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerPurchases } from '../hooks';
import type { CourseOrderStatus, LanguageCode } from '@types';

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
  const { orders, isLoading, error, refetch } = useLearnerPurchases();

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

      <ul className="space-y-2" role="list">
        {orders.map((order) => (
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
              {formatMoney(order.snapshot.price, LANGUAGES[language].locale)}
            </span>

            <Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>
              {t(`learning:learnerDashboard.purchases.status.${order.status}`)}
            </Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
