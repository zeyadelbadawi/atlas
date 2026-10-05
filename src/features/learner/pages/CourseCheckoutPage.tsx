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
import { CheckCircle2, Clock, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYMENT_PROOF_FILE_SIZE,
  MAX_PAYMENT_PROOF_NOTE_LENGTH,
  ManualPaymentBrandChip,
  ManualPaymentInstructionsPanel,
  formatMoney,
  MANUAL_METHOD_ICONS,
} from '@features/billing';
import { hasMessageKey } from '@utils';
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
  const [fileError, setFileError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [payerReference, setPayerReference] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [underReview, setUnderReview] = useState(false);

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
  const paymentsHref = buildHref(LEARNER_ROUTES.payments);
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
    } catch (error) {
      // Academy Manual Payments — a proof for this order is already with
      // the academy: the learner waits for that decision.
      if (hasMessageKey(error, 'errors.courseOrder.paymentUnderReview')) {
        setUnderReview(true);
        return;
      }
      setActionError(t('course:checkout.paymentError'));
    }
  };

  // Checked before upload, with the same limits the server enforces.
  const onFileChange = (next: File | null) => {
    setFileError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (
      !(ALLOWED_PAYMENT_PROOF_TYPES as readonly string[]).includes(next.type)
    ) {
      setFile(null);
      setFileError(t('payments:payment.proofInvalidType'));
      return;
    }
    if (next.size > MAX_PAYMENT_PROOF_FILE_SIZE) {
      setFile(null);
      setFileError(t('payments:payment.proofTooLarge'));
      return;
    }
    setFile(next);
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
        payerReference: payerReference.trim() || undefined,
      });
      setStep('submitted');
    } catch (error) {
      if (
        hasMessageKey(error, 'errors.payment.alreadyUnderReview') ||
        hasMessageKey(error, 'errors.courseOrder.paymentUnderReview')
      ) {
        setUnderReview(true);
        return;
      }
      setActionError(
        hasMessageKey(error, 'errors.payment.unsupportedProofFileType')
          ? t('payments:payment.proofInvalidType')
          : t('course:checkout.proofError')
      );
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
            <CardTitle as="h2">
              {t('course:checkout.unavailableTitle')}
            </CardTitle>
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
  const selected = enabledMethods.find((m) => m.key === selectedMethod);
  const instructions =
    payment?.instructions ?? selected?.manualInstructions ?? undefined;

  if (underReview) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Clock className="size-5 text-warning" aria-hidden />
              {t('course:checkout.underReviewTitle')}
            </CardTitle>
            <CardDescription>
              {t('course:checkout.underReviewDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="min-h-11 sm:min-h-9">
              <a href={paymentsHref}>{t('course:checkout.viewPayments')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                        <span className="block text-sm text-muted-foreground">
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

            <div className="space-y-1.5">
              <label
                htmlFor="proof-reference"
                className="block text-sm font-medium text-foreground"
              >
                {t('course:checkout.referenceLabel')}
              </label>
              <Input
                id="proof-reference"
                value={payerReference}
                onChange={(e) => setPayerReference(e.target.value)}
                maxLength={120}
                dir="ltr"
                autoComplete="off"
                aria-describedby="proof-reference-help"
                data-testid="checkout-reference"
              />
              <p
                id="proof-reference-help"
                className="text-xs text-muted-foreground"
              >
                {t('course:checkout.referenceHelp')}
              </p>
            </div>

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
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                aria-describedby="proof-file-help"
                aria-invalid={fileError ? true : undefined}
                data-testid="checkout-proof-file"
                className="block w-full text-sm text-muted-foreground file:me-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 sm:file:min-h-0"
              />
              <p id="proof-file-help" className="text-xs text-muted-foreground">
                {t('course:checkout.proofFileHelp')}
              </p>
              {fileError ? (
                <p role="alert" className="text-sm text-destructive">
                  {fileError}
                </p>
              ) : null}
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
                maxLength={MAX_PAYMENT_PROOF_NOTE_LENGTH}
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
              className="min-h-11 sm:min-h-9"
              data-testid="checkout-submit-proof"
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
