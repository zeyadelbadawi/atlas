/**
 * Course Checkout Page (P64 Phase 4).
 *
 * The learner's paid-course purchase flow over the `course-orders` API:
 * open an order, choose a payment method, create the payment, upload a
 * manual-transfer proof for review, then wait for platform approval (which
 * creates the enrollment). Manual review is the only collection mode
 * enabled today; a gateway method would slot in through the same steps.
 *
 * The order is opened once per visit with a fresh idempotency key held in a
 * ref, so a re-render never opens a second order. If the academy has no
 * enabled payment method, or the backend reports the order/payment cannot
 * be created, the page shows clear "not available for purchase yet" copy
 * instead of a broken form (the master plan's "unconfigured" rule).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatMoney } from '@features/billing';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import {
  useCourseOrderPaymentMethods,
  useCreateCourseOrder,
  useCreateCoursePayment,
  useSubmitCourseOrderProof,
} from '../hooks/useCourseCheckout';
import type { CourseOrder, CourseOrderPayment } from '@types';

type Step = 'method' | 'proof' | 'submitted';

export default function CourseCheckoutPage(): JSX.Element {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { buildHref, locale } = useLearnerSurface();
  const intlLocale = locale === 'ar' ? 'ar' : 'en';

  const createOrder = useCreateCourseOrder();
  const idempotencyKeyRef = useRef<string>(
    `checkout-${courseId}-${Math.random().toString(36).slice(2)}`
  );

  const [order, setOrder] = useState<CourseOrder | null>(null);
  const [orderError, setOrderError] = useState(false);
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [payment, setPayment] = useState<CourseOrderPayment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const createPayment = useCreateCoursePayment(order?.id ?? '');
  const submitProof = useSubmitCourseOrderProof(order?.id ?? '');

  // Open the order once, on mount, for this course.
  useEffect(() => {
    if (!courseId || order || createOrder.isPending) return;
    let cancelled = false;
    void createOrder
      .mutateAsync({
        courseId,
        idempotencyKey: idempotencyKeyRef.current,
      })
      .then((created) => {
        if (!cancelled) setOrder(created);
      })
      .catch(() => {
        if (!cancelled) setOrderError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Scoped to THIS order, not the platform catalog: the catalog route is
  // management-surface-only, so asking it as a learner returns 403 and
  // leaves the page permanently in its "not available" state.
  const { data: methods, isLoading: methodsLoading } =
    useCourseOrderPaymentMethods(order?.id);

  const enabledMethods = (methods ?? []).filter((m) => m.enabled);

  const coursesHref = buildHref(LEARNER_ROUTES.courses);
  const purchasesHref = buildHref(LEARNER_ROUTES.purchases);
  const courseProgressHref = courseId
    ? buildHref(buildPath(LEARNER_ROUTES.courseProgress, { courseId }))
    : coursesHref;

  const onContinue = async () => {
    setActionError(null);
    if (!order || !selectedMethod) return;
    try {
      const created = await createPayment.mutateAsync({
        methodKey: selectedMethod,
      });
      setPayment(created);
      setStep('proof');
    } catch {
      setActionError(t('course:checkout.paymentError'));
    }
  };

  const onSubmitProof = async () => {
    setActionError(null);
    if (!payment || !file) {
      setActionError(t('course:checkout.proofRequired'));
      return;
    }
    try {
      await submitProof.mutateAsync({
        paymentId: payment.id,
        file,
        note: note.trim() || undefined,
      });
      setStep('submitted');
    } catch {
      setActionError(t('course:checkout.proofError'));
    }
  };

  const header = (
    <LearnerPageHeader
      section="purchases"
      titleKey="course:checkout.title"
      descriptionKey="course:checkout.subtitle"
    />
  );

  if (methodsLoading || (createOrder.isPending && !order)) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Order could not be opened, or the academy has no enabled method →
  // the course is not purchasable right now. Honest, non-broken copy.
  if (orderError || !order || enabledMethods.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t('course:checkout.unavailableTitle')}</CardTitle>
            <CardDescription>
              {t('course:checkout.unavailableDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <a href={courseProgressHref}>
                {t('course:checkout.backToCourse')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already paid (e.g. an approved order): send them to the course.
  if (order.status === 'paid') {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" aria-hidden />
              {t('course:checkout.alreadyPurchasedTitle')}
            </CardTitle>
            <CardDescription>
              {t('course:checkout.alreadyPurchasedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={courseProgressHref}>{t('course:checkout.goToCourse')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = order.snapshot.price;

  return (
    <div className="space-y-6">
      {header}

      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle as="h2">{t('course:checkout.summaryTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
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
        </CardContent>
      </Card>

      {step === 'submitted' ? (
        <Card>
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
            <CardTitle as="h2">{t('course:checkout.methodTitle')}</CardTitle>
            <CardDescription>
              {t('course:checkout.methodDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={selectedMethod}
              onValueChange={setSelectedMethod}
              className="space-y-2"
            >
              {enabledMethods.map((method) => (
                <label
                  key={method.key}
                  htmlFor={`method-${method.key}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
                >
                  <RadioGroupItem
                    id={`method-${method.key}`}
                    value={method.key}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {method.displayName}
                    </span>
                    {method.description ? (
                      <span className="block text-sm text-muted-foreground">
                        {method.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>

            {actionError ? (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            ) : null}

            <Button
              onClick={onContinue}
              disabled={!selectedMethod || createPayment.isPending}
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
            <div className="space-y-1.5">
              <label
                htmlFor="proof-file"
                className="block text-sm font-medium text-foreground"
              >
                {t('course:checkout.proofFileLabel')}
              </label>
              <input
                id="proof-file"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="proof-note"
                className="block text-sm font-medium text-foreground"
              >
                {t('course:checkout.proofNoteLabel')}
              </label>
              <Textarea
                id="proof-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('course:checkout.proofNotePlaceholder')}
              />
            </div>

            {actionError ? (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            ) : null}

            <Button
              onClick={onSubmitProof}
              disabled={!file || submitProof.isPending}
            >
              {submitProof.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {t('course:checkout.submitProof')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
