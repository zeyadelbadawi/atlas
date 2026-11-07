/**
 * B0-BIL-06 — the Platform Owner's audited subscription remedies on the
 * organization detail page: Extend, Grant days and Change plan.
 *
 * Every action needs a written reason (10+ characters), which the server
 * stores in the audit log with the change. The server is the authority on
 * who may act and on every rule (which statuses can be extended, archived
 * plans, a scheduled change needing a running paid period); this dialog
 * only checks the shape so the common mistakes are caught before a round
 * trip, and shows the server's own message for everything else.
 *
 * Change plan takes a typed plan key because hidden plans (founding
 * locks) are not in the public catalog; the catalog keys are offered as
 * suggestions.
 *
 * B8 (UX audit) V05/V12 — every field is required and marked; a wrong
 * value is said under its field (empty days, the 1–365 range, a short
 * reason, no plan), and so is the server's refusal of a field (400, and
 * the 409 "archived plan" on `planKey`); anything else is ONE inline
 * alert. Change plan shows the current plan and price and says what the
 * change does (no charge, no email). Closing with typed input asks first.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { formatCurrency, toErrorsNamespaceKey } from '@utils';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  RequiredMark,
  SaveFailedAlert,
  hasViolationOn,
  useServerValidation,
} from '@forms';
import {
  planCyclePrice,
  resolvePlanName,
  usePlanCatalog,
} from '@features/tenant';
import type { LanguageCode, TenantSubscription } from '@types';
import { useSubscriptionAdjustment } from '../hooks';

type Mode = 'extend' | 'grant-days' | 'change-plan';

const REASON_MIN = 10;
const REASON_MAX = 500;
const DAYS_MAX = 365;

const DAYS_RANGE = 'errors:platform.subscriptionAdjustment.daysRange';
const REASON_SHORT = 'errors:platform.subscriptionAdjustment.reasonTooShort';
const PLAN_REQUIRED = 'errors:platform.subscriptionAdjustment.planRequired';

/** The dialog's fields; `days` or `planKey` is checked by mode. */
function adjustmentSchema(mode: Mode) {
  return z.object({
    days:
      mode === 'change-plan'
        ? z.string()
        : z
            .string()
            .trim()
            .min(1, DAYS_RANGE)
            .refine((value) => /^\d+$/.test(value), DAYS_RANGE)
            .refine(
              (value) => Number(value) >= 1 && Number(value) <= DAYS_MAX,
              DAYS_RANGE
            ),
    planKey:
      mode === 'change-plan'
        ? z.string().trim().min(1, PLAN_REQUIRED)
        : z.string(),
    applyAt: z.enum(['now', 'period_end']),
    reason: z.string().trim().min(REASON_MIN, REASON_SHORT).max(REASON_MAX),
  });
}

type AdjustmentFormValues = z.infer<ReturnType<typeof adjustmentSchema>>;

/** Field labels, for messages that name their field (`{{field}}`). */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  days: 'platform:organizations.adjust.days',
  planKey: 'platform:organizations.adjust.planKey',
  reason: 'platform:organizations.adjust.reason',
};

const TITLE_KEY: Record<Mode, string> = {
  extend: 'platform:organizations.adjust.extendTitle',
  'grant-days': 'platform:organizations.adjust.grantTitle',
  'change-plan': 'platform:organizations.adjust.changePlanTitle',
};

const DESCRIPTION_KEY: Record<Mode, string> = {
  extend: 'platform:organizations.adjust.extendDescription',
  'grant-days': 'platform:organizations.adjust.grantDescription',
  'change-plan': 'platform:organizations.adjust.changePlanDescription',
};

export interface SubscriptionAdjustmentsCardProps {
  readonly organizationId: string;
  /** The subscription the remedies act on (current plan, price, period). */
  readonly subscription?: TenantSubscription;
}

export function SubscriptionAdjustmentsCard({
  organizationId,
  subscription,
}: SubscriptionAdjustmentsCardProps): JSX.Element {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <Card data-testid="subscription-adjustments">
      <CardHeader>
        <CardTitle className="text-base">
          {t('platform:organizations.adjust.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('platform:organizations.adjust.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('extend')}
          >
            {t('platform:organizations.adjust.extend')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('grant-days')}
          >
            {t('platform:organizations.adjust.grantDays')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('change-plan')}
          >
            {t('platform:organizations.adjust.changePlan')}
          </Button>
        </div>
      </CardContent>
      {mode ? (
        <AdjustmentDialog
          key={mode}
          organizationId={organizationId}
          subscription={subscription}
          mode={mode}
          onClose={() => setMode(null)}
        />
      ) : null}
    </Card>
  );
}

function AdjustmentDialog({
  organizationId,
  subscription,
  mode,
  onClose,
}: {
  readonly organizationId: string;
  readonly subscription?: TenantSubscription;
  readonly mode: Mode;
  readonly onClose: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { notifySuccess } = useToast();
  const adjust = useSubscriptionAdjustment(organizationId);
  const catalog = usePlanCatalog();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema(mode)),
    defaultValues: { days: '', planKey: '', applyAt: 'now', reason: '' },
  });
  const guard = useDirtyGuard(form.formState.isDirty);

  // The server's refusal of a field lands on that field, named by its
  // label in the page's language (a 400 through `useServerValidation`).
  const error = adjust.error ?? null;
  useServerValidation(form, error, { labels: FIELD_LABELS });
  // The archived-plan refusal is a 409 carrying a `planKey` violation;
  // `useServerValidation` applies 400s only, so it is placed here.
  const { setError } = form;
  useEffect(() => {
    if (error?.kind !== 'conflict') return;
    const onPlan = error.violations?.find((v) => v.field === 'planKey');
    if (onPlan)
      setError('planKey', {
        type: 'server',
        message: toErrorsNamespaceKey(onPlan.messageKey),
      });
  }, [error, setError]);

  const submit = form.handleSubmit((values) => {
    const reason = values.reason.trim();
    const input =
      mode === 'change-plan'
        ? ({
            kind: mode,
            planKey: values.planKey.trim(),
            applyAt: values.applyAt,
            reason,
          } as const)
        : ({ kind: mode, days: Number(values.days.trim()), reason } as const);
    adjust.mutate(input, {
      onSuccess: () => {
        notifySuccess('platform:organizations.adjust.success');
        onClose();
      },
    });
  });

  const requestClose = () => {
    if (adjust.isPending) return;
    void guard.requestClose(onClose);
  };

  const planKeys = (catalog.data ?? []).map((plan) => plan.key);
  // A refusal no field shows (409 not extendable, no paid period, 5xx…).
  const showFailure =
    adjust.error &&
    adjust.error.kind !== 'cancelled' &&
    !hasViolationOn(adjust.error, FIELD_LABELS);

  const currentPlan = subscription?.plan;
  const cycle =
    subscription?.billingCycle ?? currentPlan?.pricing?.billingCycle;
  const price =
    currentPlan && cycle
      ? planCyclePrice(currentPlan.pricing, cycle)
      : undefined;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(TITLE_KEY[mode])}</DialogTitle>
          <DialogDescription>{t(DESCRIPTION_KEY[mode])}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="subscription-adjustment-form"
            className="space-y-4"
            onSubmit={(event) => void submit(event)}
            noValidate
          >
            {mode === 'change-plan' ? (
              <>
                {currentPlan ? (
                  <div
                    className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                    data-testid="adjust-current-plan"
                  >
                    <p className="text-xs text-muted-foreground">
                      {t('platform:organizations.adjust.currentPlan')}
                    </p>
                    <p className="font-medium text-foreground" dir="auto">
                      {resolvePlanName(currentPlan, language)}
                      {price !== undefined && currentPlan.pricing?.currency ? (
                        <>
                          {' · '}
                          <span dir="ltr" data-atlas-numeric="true">
                            {formatCurrency(
                              price,
                              language,
                              currentPlan.pricing.currency
                            )}
                          </span>{' '}
                          {t(`platform:organizations.adjust.per.${cycle}`)}
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : null}
                <FormField
                  control={form.control}
                  name="planKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('platform:organizations.adjust.planKey')}
                        <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          dir="ltr"
                          autoComplete="off"
                          list="adjust-plan-keys"
                        />
                      </FormControl>
                      <datalist id="adjust-plan-keys">
                        {planKeys.map((key) => (
                          <option key={key} value={key} />
                        ))}
                      </datalist>
                      <FormDescription>
                        {t('platform:organizations.adjust.planKeyHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applyAt"
                  render={({ field }) => (
                    <fieldset className="space-y-1.5">
                      <legend className="text-sm font-medium">
                        {t('platform:organizations.adjust.applyAt')}
                      </legend>
                      {(['now', 'period_end'] as const).map((value) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name="adjust-apply-at"
                            value={value}
                            checked={field.value === value}
                            onChange={() => field.onChange(value)}
                          />
                          {t(
                            value === 'now'
                              ? 'platform:organizations.adjust.applyNow'
                              : 'platform:organizations.adjust.applyPeriodEnd'
                          )}
                        </label>
                      ))}
                    </fieldset>
                  )}
                />
                {/* What the change does — and does not do. */}
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="adjust-plan-effect"
                >
                  {t(
                    form.watch('applyAt') === 'now'
                      ? 'platform:organizations.adjust.effectNow'
                      : 'platform:organizations.adjust.effectPeriodEnd'
                  )}
                </p>
              </>
            ) : (
              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('platform:organizations.adjust.days')}
                      <RequiredMark />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        dir="ltr"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('platform:organizations.adjust.daysHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('platform:organizations.adjust.reason')}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} dir="auto" maxLength={REASON_MAX} />
                  </FormControl>
                  <FormDescription>
                    {t('platform:organizations.adjust.reasonHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showFailure && adjust.error ? (
              <SaveFailedAlert
                error={adjust.error}
                titleKey="platform:organizations.adjust.failed"
              />
            ) : null}
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={requestClose}
            disabled={adjust.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="subscription-adjustment-form"
            disabled={adjust.isPending}
          >
            {adjust.isPending ? (
              <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {t('platform:organizations.adjust.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
