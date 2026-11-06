/**
 * Course Checkout Page (P64 Phase 4).
 *
 * The learner's paid-course purchase flow over the `course-orders` API:
 * open an order, choose a payment method, create the payment, upload a
 * manual-transfer proof for review, then wait for the academy's approval
 * (which creates the enrollment). Manual review is the only collection mode
 * enabled today; a gateway method would slot in through the same steps.
 *
 * B7 (UX audit) — EVERY FAILURE SAYS WHAT IS TRUE. Opening the order used
 * to end in "Not available for purchase yet — payments aren't set up" for
 * a 500, a dropped connection, an already-enrolled learner and a free
 * course alike. Now:
 *   - already enrolled (409 `alreadyEnrolled`) → "You're already enrolled"
 *     with a link to the course;
 *   - a free course (409 `courseNotPaid`) → it is free, enroll from its page;
 *   - the academy not set up for payments (or no enabled method) → "Not
 *     available for purchase yet", with the server's own reason;
 *   - anything else (5xx, connection, timeout) → "We couldn't start your
 *     order" with the real reason and Try again (the same idempotency key,
 *     so a retry never opens a second order).
 * Each hook marks its errors inline, so no toast repeats the message.
 *
 * THE ORDER IS RESUMED, NEVER DUPLICATED. The server answers "open an order"
 * with the learner's open order for this course when there is one, and
 * "choose a method" with the open proof-less payment for that method. The
 * page remembers, for this tab, which order, payment and method it reached
 * (`sessionStorage`), so a reload or "Continue payment" lands back on the
 * proof step of the SAME payment instead of starting again. The order and
 * payment references are shown so the learner can quote them.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  CopyValueButton,
  ManualPaymentBrandChip,
  ManualPaymentInstructionsPanel,
  formatMoney,
  MANUAL_METHOD_ICONS,
} from '@features/billing';
import { SaveFailedAlert } from '@forms';
import { useDateFormatter } from '@hooks';
import { apiErrorMessage, hasMessageKey } from '@utils';
import { normalizeUnknownError, type ApiError } from '@api';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { CheckoutProofForm } from '../components/CheckoutProofForm';
import type { CheckoutProofValues } from '../components/CheckoutProofForm';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import {
  useCourseOrderPaymentMethods,
  useCreateCourseOrder,
  useCreateCoursePayment,
  useSubmitCourseOrderProof,
} from '../hooks/useCourseCheckout';
import { courseOrderService } from '../services/CourseOrderService';
import { shortReference } from '../utils/learner-payment.utils';
import type { CourseOrder, CourseOrderPayment } from '@types';

/** The academy rejected this learner's registration (fix round, 20 Oct 2026). */
const REJECTED_KEY = 'errors.academy.registrationRejected';

/** Refusals that mean "this course can't be bought here right now". */
const NOT_PURCHASABLE_KEYS = new Set([
  'errors.courseOrder.paymentSetupIncomplete',
  'errors.courseOrder.pricingUnavailable',
  'errors.courseOrder.notAcceptingEnrollments',
  'errors.notFound',
]);

type Step = 'method' | 'proof' | 'submitted';

/** What opening the order ended in, when it did not give an order. */
export type OrderFailure =
  | { readonly kind: 'notAdmitted' }
  | { readonly kind: 'alreadyEnrolled' }
  | { readonly kind: 'free' }
  | { readonly kind: 'notPurchasable'; readonly error: ApiError }
  | { readonly kind: 'failed'; readonly error: ApiError };

/** Exported so the classification can be asserted directly. */
export function classifyOrderFailure(raw: unknown): OrderFailure {
  const error = normalizeUnknownError(raw);
  if (hasMessageKey(error, REJECTED_KEY)) return { kind: 'notAdmitted' };
  if (hasMessageKey(error, 'errors.courseOrder.alreadyEnrolled')) {
    return { kind: 'alreadyEnrolled' };
  }
  if (hasMessageKey(error, 'errors.courseOrder.courseNotPaid')) {
    return { kind: 'free' };
  }
  if (
    (error.messageKey && NOT_PURCHASABLE_KEYS.has(error.messageKey)) ||
    error.kind === 'notFound' ||
    error.kind === 'forbidden'
  ) {
    return { kind: 'notPurchasable', error };
  }
  return { kind: 'failed', error };
}

/* ---------- the step this tab reached, kept across a reload ---------- */

interface SavedCheckout {
  readonly orderId: string;
  readonly paymentId: string;
  readonly methodKey: string;
}

const storageKey = (courseId: string) => `atlas.learner.checkout.${courseId}`;

function readSaved(courseId: string): SavedCheckout | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCheckout>;
    return typeof parsed.orderId === 'string' &&
      typeof parsed.paymentId === 'string' &&
      typeof parsed.methodKey === 'string'
      ? (parsed as SavedCheckout)
      : null;
  } catch {
    return null;
  }
}

function writeSaved(courseId: string, saved: SavedCheckout | null): void {
  try {
    if (saved) {
      window.sessionStorage.setItem(
        storageKey(courseId),
        JSON.stringify(saved)
      );
    } else {
      window.sessionStorage.removeItem(storageKey(courseId));
    }
  } catch {
    // Storage unavailable (private mode): the step simply isn't kept.
  }
}

/** A payment the learner can still upload a proof to. */
function awaitsProof(payment: CourseOrderPayment): boolean {
  return (
    !payment.proof &&
    payment.reviewStatus !== 'pending' &&
    (payment.status === 'pending' ||
      payment.status === 'created' ||
      payment.status === 'requires_action')
  );
}

function ReferenceLine({
  labelKey,
  id,
  testId,
}: {
  readonly labelKey: string;
  readonly id: string;
  readonly testId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const reference = shortReference(id);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{t(labelKey)}</span>
      <span className="flex items-center gap-1">
        <span
          className="font-mono text-foreground"
          dir="ltr"
          data-testid={testId}
          title={id}
        >
          {reference}
        </span>
        <CopyValueButton
          value={reference}
          label={t('payments:payment.copyValue', { label: t(labelKey) })}
        />
      </span>
    </div>
  );
}

export default function CourseCheckoutPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { buildHref, locale } = useLearnerSurface();
  const intlLocale = locale === 'ar' ? 'ar' : 'en';

  const createOrder = useCreateCourseOrder();
  const idempotencyKeyRef = useRef<string>(
    `checkout-${courseId}-${Math.random().toString(36).slice(2)}`
  );

  const [order, setOrder] = useState<CourseOrder | null>(null);
  const [orderFailure, setOrderFailure] = useState<OrderFailure | null>(null);
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodError, setMethodError] = useState<string | null>(null);
  const [payment, setPayment] = useState<CourseOrderPayment | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<ApiError | null>(null);
  const [underReview, setUnderReview] = useState(false);
  const [resuming, setResuming] = useState(false);

  const createPayment = useCreateCoursePayment(order?.id ?? '');
  const submitProof = useSubmitCourseOrderProof(order?.id ?? '');

  const openOrder = useCallback(() => {
    if (!courseId) return;
    setOrderFailure(null);
    createOrder
      .mutateAsync({ courseId, idempotencyKey: idempotencyKeyRef.current })
      .then(setOrder)
      .catch((error: unknown) => setOrderFailure(classifyOrderFailure(error)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Open (or resume) the order once, on mount, for this course.
  useEffect(() => {
    if (!courseId || order) return;
    openOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  /*
   * Back on the proof step after a reload or "Continue payment": the server
   * returned the same open order; the payment this tab created for it is
   * read again and, while it still waits for a proof, shown as it was.
   */
  const resumedOrderRef = useRef<string | null>(null);
  const orderId = order?.id;
  useEffect(() => {
    if (!orderId || resumedOrderRef.current === orderId) return;
    resumedOrderRef.current = orderId;
    const saved = readSaved(courseId);
    if (!saved || saved.orderId !== orderId) return;
    let cancelled = false;
    setResuming(true);
    courseOrderService
      .getPayment(orderId, saved.paymentId)
      .then((found) => {
        if (cancelled) return;
        if (found.reviewStatus === 'pending') {
          setUnderReview(true);
          return;
        }
        if (awaitsProof(found)) {
          setSelectedMethod(saved.methodKey);
          setPayment(found);
          setStep('proof');
          return;
        }
        writeSaved(courseId, null);
      })
      .catch(() => {
        // Not readable any more: start from the method step, as before.
        if (!cancelled) writeSaved(courseId, null);
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });
    return () => {
      // Interrupted (unmount, Strict Mode's second run): the next run may
      // try again.
      cancelled = true;
      resumedOrderRef.current = null;
    };
  }, [orderId, courseId]);

  // Scoped to THIS order, not the platform catalog: the catalog route is
  // management-surface-only, so asking it as a learner returns 403.
  const methodsQuery = useCourseOrderPaymentMethods(order?.id);
  const enabledMethods = (methodsQuery.data ?? []).filter((m) => m.enabled);

  const coursesHref = buildHref(LEARNER_ROUTES.courses);
  const purchasesHref = buildHref(LEARNER_ROUTES.purchases);
  const paymentsHref = buildHref(LEARNER_ROUTES.payments);
  const courseProgressHref = courseId
    ? buildHref(buildPath(LEARNER_ROUTES.courseProgress, { courseId }))
    : coursesHref;
  // The academy's own course page — where a free course is enrolled in.
  const coursePageHref = buildHref(`/courses/${courseId}`);

  const onContinue = async () => {
    setPaymentFailure(null);
    setMethodError(null);
    if (!order) return;
    // B7 — never a greyed button without a reason: say what is missing.
    if (!selectedMethod) {
      setMethodError(t('course:checkout.chooseMethod'));
      return;
    }
    try {
      const created = await createPayment.mutateAsync({
        methodKey: selectedMethod,
      });
      setPayment(created);
      writeSaved(courseId, {
        orderId: order.id,
        paymentId: created.id,
        methodKey: selectedMethod,
      });
      setStep('proof');
    } catch (error) {
      // Academy Manual Payments — a proof for this order is already with
      // the academy: the learner waits for that decision.
      if (hasMessageKey(error, 'errors.courseOrder.paymentUnderReview')) {
        setUnderReview(true);
        return;
      }
      if (hasMessageKey(error, REJECTED_KEY)) {
        setOrderFailure({ kind: 'notAdmitted' });
        return;
      }
      setPaymentFailure(normalizeUnknownError(error));
    }
  };

  const onSubmitProof = async (values: CheckoutProofValues) => {
    if (!payment) return;
    try {
      await submitProof.mutateAsync({ paymentId: payment.id, ...values });
      writeSaved(courseId, null);
      setStep('submitted');
    } catch (error) {
      if (
        hasMessageKey(error, 'errors.payment.alreadyUnderReview') ||
        hasMessageKey(error, 'errors.courseOrder.paymentUnderReview')
      ) {
        writeSaved(courseId, null);
        setUnderReview(true);
        return;
      }
      if (hasMessageKey(error, REJECTED_KEY)) {
        setOrderFailure({ kind: 'notAdmitted' });
      }
      // Anything else is shown by the form, once, from `submitProof.error`.
    }
  };

  const courseTitle = order?.snapshot.course.title;
  const header = (
    <LearnerPageHeader
      // B7 (UX audit, V23) — the checkout lives under My courses (the
      // sidebar's highlight), and the trail says so: Courses › course ›
      // Checkout.
      section="courses"
      titleKey="course:checkout.title"
      descriptionKey="course:checkout.subtitle"
      ancestors={
        courseTitle
          ? [{ labelKey: '', label: courseTitle, path: coursePageHref }]
          : []
      }
      trailing={{ labelKey: 'course:checkout.title' }}
    />
  );

  const card = (
    title: string,
    description: string,
    actions: JSX.Element,
    testId: string,
    icon?: JSX.Element
  ) => (
    <div className="space-y-6">
      {header}
      <Card data-testid={testId}>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">{actions}</CardContent>
      </Card>
    </div>
  );

  if (orderFailure?.kind === 'notAdmitted') {
    return card(
      t('course:checkout.notAdmittedTitle'),
      t('errors:academy.registrationRejected'),
      <Button variant="outline" asChild>
        <a href={coursesHref}>{t('course:checkout.browseCourses')}</a>
      </Button>,
      'checkout-not-admitted'
    );
  }

  if (orderFailure?.kind === 'alreadyEnrolled') {
    return card(
      t('course:checkout.alreadyEnrolledTitle'),
      t('course:checkout.alreadyEnrolledDescription'),
      <Button asChild className="min-h-11 sm:min-h-9">
        <a href={courseProgressHref}>{t('course:checkout.goToCourse')}</a>
      </Button>,
      'checkout-already-enrolled',
      <CheckCircle2 className="size-5 text-success" aria-hidden />
    );
  }

  if (orderFailure?.kind === 'free') {
    return card(
      t('course:checkout.freeTitle'),
      t('errors:courseOrder.courseNotPaid'),
      <Button asChild className="min-h-11 sm:min-h-9">
        <a href={coursePageHref}>{t('course:checkout.openCoursePage')}</a>
      </Button>,
      'checkout-free',
      <Info className="size-5 text-muted-foreground" aria-hidden />
    );
  }

  if (orderFailure?.kind === 'notPurchasable') {
    return card(
      t('course:checkout.unavailableTitle'),
      apiErrorMessage(t, i18n, orderFailure.error, {
        fallbackKey: 'course:checkout.unavailableDescription',
      }),
      <Button variant="outline" asChild>
        <a href={coursePageHref}>{t('course:checkout.backToCourse')}</a>
      </Button>,
      'checkout-unavailable'
    );
  }

  if (orderFailure?.kind === 'failed') {
    return (
      <div className="space-y-6">
        {header}
        <div data-testid="checkout-order-failed" className="space-y-3">
          <SaveFailedAlert
            error={orderFailure.error}
            titleKey="course:checkout.orderFailedTitle"
            onRetry={openOrder}
          />
          <Button variant="outline" asChild>
            <a href={coursePageHref}>{t('course:checkout.backToCourse')}</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!order || methodsQuery.isLoading || resuming) {
    return (
      <div className="space-y-6">
        {header}
        <div role="status" aria-busy="true">
          <span className="sr-only">{t('course:checkout.loading')}</span>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // The methods could not be read: a failure, not "not set up".
  if (methodsQuery.error) {
    return (
      <div className="space-y-6">
        {header}
        <div data-testid="checkout-methods-failed">
          <SaveFailedAlert
            error={methodsQuery.error}
            titleKey="course:checkout.methodsFailedTitle"
            onRetry={() => void methodsQuery.refetch()}
          />
        </div>
      </div>
    );
  }

  // Already paid (e.g. an approved order): send them to the course.
  if (order.status === 'paid') {
    return card(
      t('course:checkout.alreadyPurchasedTitle'),
      t('course:checkout.alreadyPurchasedDescription'),
      <Button asChild>
        <a href={courseProgressHref}>{t('course:checkout.goToCourse')}</a>
      </Button>,
      'checkout-paid',
      <CheckCircle2 className="size-5 text-success" aria-hidden />
    );
  }

  if (underReview) {
    return card(
      t('course:checkout.underReviewTitle'),
      t('course:checkout.underReviewDescription'),
      <Button asChild className="min-h-11 sm:min-h-9">
        <a href={paymentsHref}>{t('course:checkout.viewPayments')}</a>
      </Button>,
      'checkout-under-review',
      <Clock className="size-5 text-warning" aria-hidden />
    );
  }

  // The real "not configured" case: an order, but nothing to pay it with.
  if (enabledMethods.length === 0 && step === 'method') {
    return card(
      t('course:checkout.unavailableTitle'),
      t('course:checkout.unavailableDescription'),
      <Button variant="outline" asChild>
        <a href={coursePageHref}>{t('course:checkout.backToCourse')}</a>
      </Button>,
      'checkout-unavailable'
    );
  }

  const price = order.snapshot.price;
  const selected = enabledMethods.find((m) => m.key === selectedMethod);
  const instructions =
    payment?.instructions ?? selected?.manualInstructions ?? undefined;

  return (
    <div className="space-y-6">
      {header}

      {/* Order summary, with the references the academy sees. */}
      <Card data-testid="checkout-order-summary">
        <CardHeader>
          <CardTitle as="h2">{t('course:checkout.summaryTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span dir="auto" className="min-w-0 text-muted-foreground">
              {order.snapshot.course.title}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoney(price, intlLocale)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="font-medium text-foreground">
              {t('course:checkout.total')}
            </span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(price, intlLocale)}
            </span>
          </div>
          <div className="space-y-1 border-t border-border pt-2">
            <ReferenceLine
              labelKey="course:checkout.orderReference"
              id={order.id}
              testId="checkout-order-reference"
            />
            {payment ? (
              <ReferenceLine
                labelKey="course:checkout.paymentReference"
                id={payment.id}
                testId="checkout-payment-reference"
              />
            ) : null}
            {step !== 'submitted' && order.expiresAt ? (
              <p className="text-xs text-muted-foreground">
                {t('course:checkout.payBefore', {
                  when: fmt.dateTime(payment?.expiresAt ?? order.expiresAt),
                })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {step === 'submitted' ? (
        <Card data-testid="checkout-submitted">
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" aria-hidden />
              {t('course:checkout.submittedTitle')}
            </CardTitle>
            <CardDescription>
              {t('course:checkout.submittedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={paymentsHref}>{t('course:checkout.viewPayments')}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={purchasesHref}>{t('course:checkout.viewPurchases')}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={coursesHref}>{t('course:checkout.browseCourses')}</a>
            </Button>
          </CardContent>
        </Card>
      ) : step === 'method' ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2" id="checkout-method-title">
              {t('course:checkout.methodTitle')}
            </CardTitle>
            <CardDescription>
              {t('course:checkout.methodDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedMethod}
              onValueChange={(value) => {
                setSelectedMethod(value);
                setMethodError(null);
              }}
              className="space-y-2"
              aria-labelledby="checkout-method-title"
              aria-describedby={
                methodError ? 'checkout-method-error' : undefined
              }
            >
              {enabledMethods.map((method) => {
                const Icon = MANUAL_METHOD_ICONS[method.type];
                const isAcademyMethod = method.provider === 'academy_manual';
                return (
                  <label
                    key={method.key}
                    htmlFor={`method-${method.key}`}
                    className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 has-[[data-state=checked]]:border-primary"
                    data-testid={`checkout-method-${method.type}`}
                  >
                    <RadioGroupItem
                      id={`method-${method.key}`}
                      value={method.key}
                      className="mt-0.5"
                    />
                    {Icon ? (
                      <Icon
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 space-y-1">
                      <span className="block font-medium text-foreground">
                        {isAcademyMethod
                          ? t(`payments:common.methodType.${method.type}`)
                          : method.displayName}
                      </span>
                      {method.description ? (
                        <span
                          dir="auto"
                          className="block text-sm text-muted-foreground"
                        >
                          {method.description}
                        </span>
                      ) : null}
                      <ManualPaymentBrandChip
                        instructions={method.manualInstructions}
                      />
                    </span>
                  </label>
                );
              })}
            </RadioGroup>

            {methodError ? (
              <p
                id="checkout-method-error"
                role="alert"
                className="text-sm text-destructive"
                data-testid="checkout-method-error"
              >
                {methodError}
              </p>
            ) : null}
            {paymentFailure ? (
              <SaveFailedAlert
                error={paymentFailure}
                titleKey="course:checkout.paymentFailedTitle"
                onRetry={() => void onContinue()}
              />
            ) : null}

            <Button
              onClick={() => void onContinue()}
              disabled={createPayment.isPending}
              className="min-h-11 sm:min-h-9"
              data-testid="checkout-continue"
            >
              {createPayment.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('course:checkout.continue')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t('course:checkout.proofTitle')}</CardTitle>
            <CardDescription>
              {t('course:checkout.proofDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructions ? (
              <section
                aria-labelledby="checkout-instructions-title"
                className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                data-testid="checkout-instructions"
              >
                <h3
                  id="checkout-instructions-title"
                  className="text-sm font-semibold text-foreground"
                >
                  {t('course:checkout.instructionsTitle')}
                </h3>
                <p className="text-sm text-foreground">
                  {t('course:checkout.sendExactly')}{' '}
                  <span
                    className="font-semibold tabular-nums"
                    data-atlas-numeric="true"
                    data-testid="checkout-amount-to-send"
                  >
                    {formatMoney(payment?.money ?? price, intlLocale)}
                  </span>
                </p>
                <ManualPaymentInstructionsPanel instructions={instructions} />
              </section>
            ) : null}

            <Alert>
              <AlertTitle>{t('course:checkout.afterTransferTitle')}</AlertTitle>
              <AlertDescription>
                {t('course:checkout.afterTransferDescription')}
              </AlertDescription>
            </Alert>

            <CheckoutProofForm
              isPending={submitProof.isPending}
              error={submitProof.error ?? null}
              onSubmit={(values) => void onSubmitProof(values)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
