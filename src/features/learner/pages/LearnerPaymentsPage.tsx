/**
 * `/my/payments` — every payment the learner made to THIS academy, newest
 * first, with where it stands (Academy Manual Payments).
 *
 *   - THIS ACADEMY ONLY: the list is filtered server-side by the academy
 *     whose portal is open; a payment to another academy never shows here.
 *   - Each entry: course, amount, method, date, the reference and proof the
 *     learner sent, and a status carried by icon AND text (never colour
 *     alone): waiting for your proof, under review, approved, rejected.
 *   - A rejected payment shows the academy's reason and — when it is the
 *     newest payment of an order that is still open — "Submit a new
 *     payment", which reopens the checkout for that course.
 *   - The learner can re-open their own proof; it is fetched through the
 *     authenticated API, never linked by URL.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { PaymentProofDialog } from '@/components/payments/PaymentProofDialog';
import { useAuth, useDateFormatter } from '@hooks';
import { formatMoney } from '@features/billing';
import { LANGUAGES } from '@localization';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { cn } from '@utils';
import type { LanguageCode, LearnerCoursePayment } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useLearnerPayments } from '../hooks/useCourseCheckout';
import {
  learnerPaymentState,
  type LearnerPaymentDisplayState,
} from '../utils/learner-payment.utils';
import { courseOrderService } from '../services/CourseOrderService';

const K = 'learning:learnerDashboard.payments';

const STATE_STYLE: Record<
  LearnerPaymentDisplayState,
  { readonly icon: LucideIcon; readonly className: string }
> = {
  awaitingProof: {
    icon: Hourglass,
    className: 'bg-info-surface text-info',
  },
  underReview: { icon: Clock, className: 'bg-warning-surface text-warning' },
  approved: {
    icon: CheckCircle2,
    className: 'bg-success-surface text-success',
  },
  rejected: {
    icon: XCircle,
    className: 'bg-destructive-surface text-destructive',
  },
  closed: { icon: XCircle, className: 'bg-muted text-muted-foreground' },
};

export default function LearnerPaymentsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { user } = useAuth();
  const { academyId, buildHref } = useLearnerSurface();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;
  const payments = useLearnerPayments(user?.id, academyId);
  // The payment whose proof is open in the dialog (`PaymentProofDialog`:
  // opened on the tap itself, never as a popup after a download).
  const [proofPayment, setProofPayment] = useState<LearnerCoursePayment | null>(
    null
  );

  const header = (
    <LearnerPageHeader
      section="payments"
      titleKey={`${K}.title`}
      descriptionKey={`${K}.subtitle`}
    />
  );

  if (payments.error) {
    return (
      <>
        {header}
        <ErrorState onRetry={() => void payments.refetch()} />
      </>
    );
  }

  if (payments.isLoading || !payments.data) {
    return (
      <>
        {header}
        <div className="space-y-2" role="status" aria-live="polite">
          <span className="sr-only">{t(`${K}.loading`)}</span>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </>
    );
  }

  const items = payments.data.items;
  if (items.length === 0) {
    return (
      <>
        {header}
        <LearnerSectionPlaceholder
          icon={Wallet}
          titleKey={`${K}.empty.title`}
          descriptionKey={`${K}.empty.description`}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <ul className="space-y-3" role="list" data-testid="learner-payments">
        {items.map((payment) => {
          const state = learnerPaymentState(payment);
          const style = STATE_STYLE[state];
          const StateIcon = style.icon;
          const checkoutHref = buildHref(
            buildPath(LEARNER_ROUTES.courseCheckout, {
              courseId: payment.course.id,
            })
          );
          return (
            <li
              key={payment.id}
              className="rounded-lg border border-border bg-card p-4"
              data-testid={`learner-payment-${payment.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p
                    className="text-sm font-semibold text-foreground"
                    dir="auto"
                  >
                    {payment.course.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`${K}.meta`, {
                      method: t(
                        `payments:common.methodType.${payment.methodType}`
                      ),
                      when: fmt.date(payment.createdAt),
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground"
                    data-atlas-numeric="true"
                  >
                    {formatMoney(payment.money, locale)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium',
                      style.className
                    )}
                    data-testid="learner-payment-status"
                  >
                    <StateIcon className="size-3.5" aria-hidden />
                    {t(`${K}.status.${state}`)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {t(`${K}.explain.${state}`)}
              </p>

              {payment.proof ? (
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {payment.proof.payerReference ? (
                    <div>
                      <dt className="text-muted-foreground">
                        {t(`${K}.reference`)}
                      </dt>
                      <dd className="font-mono text-foreground" dir="ltr">
                        {payment.proof.payerReference}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">
                      {t(`${K}.proofSent`)}
                    </dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      <span dir="auto" className="text-foreground">
                        {fmt.date(payment.proof.uploadedAt)}
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto min-h-11 p-0 sm:min-h-0"
                        onClick={() => setProofPayment(payment)}
                        aria-label={t(`${K}.viewProofFor`, {
                          course: payment.course.title,
                        })}
                      >
                        <FileText className="size-4" aria-hidden />
                        {t(`${K}.viewProof`)}
                      </Button>
                    </dd>
                  </div>
                </dl>
              ) : null}

              {state === 'rejected' ? (
                <Alert variant="destructive" className="mt-3">
                  <XCircle className="size-4" aria-hidden />
                  <AlertTitle>{t(`${K}.rejectedTitle`)}</AlertTitle>
                  <AlertDescription>
                    {payment.rejectionReason ? (
                      <span className="whitespace-pre-wrap" dir="auto">
                        {payment.rejectionReason}
                      </span>
                    ) : (
                      t(`${K}.noReason`)
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {payment.canSubmitNewPayment || state === 'awaitingProof' ? (
                <div className="mt-3">
                  <Button asChild className="min-h-11 sm:min-h-9">
                    <a href={checkoutHref} data-testid="learner-payment-retry">
                      {t(
                        payment.canSubmitNewPayment
                          ? `${K}.submitNew`
                          : `${K}.continuePayment`
                      )}
                    </a>
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <PaymentProofDialog
        open={proofPayment !== null}
        onOpenChange={(open) => {
          if (!open) setProofPayment(null);
        }}
        load={() =>
          proofPayment
            ? courseOrderService.getProofFile(
                proofPayment.courseOrderId,
                proofPayment.id
              )
            : Promise.reject(new Error('No payment selected'))
        }
        fileName={proofPayment?.proof?.fileName}
        subject={proofPayment?.course.title}
      />
    </>
  );
}
