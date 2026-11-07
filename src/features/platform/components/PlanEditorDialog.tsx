/**
 * Plan editor — Platform Owner (P57).
 *
 * THREE THINGS THIS DIALOG IS CAREFUL ABOUT.
 *
 * 1. CONCURRENCY. `expectedVersion` is sent from the plan the dialog was
 *    opened with. A colleague who saved first wins, and this dialog surfaces
 *    the 409 as "reload" rather than retrying blindly — the same contract
 *    the website page editor established.
 *
 * 2. LIMIT REDUCTIONS. Lowering a limit below what customers already use is
 *    allowed, but never silently: the dialog asks the server who would be
 *    over the proposed limits and shows them BEFORE saving. Nothing is
 *    deleted or disabled either way — Atlas's entitlement enforcement is
 *    create-path-only, so an over-limit organization keeps everything it
 *    has and is simply refused its next create. The warning exists so that
 *    consequence is a decision rather than a surprise.
 *
 * 3. PRICING IS CATALOG PRICING. Editing it never rewrites a past charge:
 *    `Payment` snapshots its own amount. The dialog says so, because the
 *    natural fear when changing a price is that history moves with it.
 *    A monthly plan may also carry an optional whole-year price
 *    (`pricing.yearlyAmount`, 2 Oct 2026): only when it is set can a
 *    customer choose yearly billing, and they are charged exactly it.
 *
 * B8 (UX audit) — the form checks every value as the server does
 * (`planEditorSchema`) and says what is wrong under the field, named by its
 * label in the page's language; a server refusal lands on the same field
 * (`useServerValidation`, its paths mapped onto the form's); a limit is a
 * number or the Unlimited switch; Escape, the X and Cancel ask before
 * discarding edits; a save says what happened.
 *
 * PLAN MANAGEMENT (atlas-backend#112) — a Visibility section: "Show to
 * customers" plus the plan's position in the customer list
 * (`displayOrder`; hidden = 0, still buyable by key). It is sent only when
 * it changed. The server refuses to hide the last listed plan (409
 * `errors.plan.lastListedPlan`), shown as the one save-failed alert. An
 * archived plan says so at the top; it is brought back with Restore.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Archive, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useBidiIsolation, useDateFormatter } from '@hooks';
import { useConfirmDialog, useToast } from '@app/providers';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  FormErrorSummary,
  SaveFailedAlert,
  fieldErrorText,
  useServerValidation,
} from '@forms';
import { formatCurrency, formatNumber } from '@utils';
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  STORAGE_LIMIT_KEYS,
} from '@features/tenant';
import type { ApiError } from '@api';
import {
  usePreviewLimitImpact,
  usePreviewPlanNotice,
  useUpdatePlan,
} from '../hooks/usePlatformPlans';
import {
  UNLIMITED,
  draftToLimits,
  withUneditedLimits,
  findReducedLimitKeys,
} from '../utils/plan-limit-changes.utils';
import type { LimitDraft } from '../utils/plan-limit-changes.utils';
import {
  DEFAULT_MONTHLY_EMAILS,
  withMonthlyEmails,
} from '../utils/monthly-emails.utils';
import {
  giftedDaysInputToPayload,
  giftedDaysToInput,
} from '../utils/gifted-days.utils';
import { PLAN_ERROR_KEYS } from '../utils/plan-management.utils';
import { PlanField } from './PlanField';
import {
  PLAN_POSITION_MAX,
  numberText,
  planEditorSchema,
  wholeNumber,
  type PlanEditorValues,
} from '../schemas/plan-editor.schema';
import type {
  LanguageCode,
  Plan,
  PlanFeatures,
  PlanLimitImpact,
  PlanLimitKey,
} from '@types';

/**
 * Only the current feature keys, each a real boolean. A plan row (or a
 * cached response) may still carry legacy, never-enforced keys; they are
 * neither shown as switches nor sent back on save.
 */
function pickPlanFeatures(raw: unknown): PlanFeatures {
  const source =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => [key, source[key] === true])
  ) as unknown as PlanFeatures;
}

/** The form's starting values: the saved plan's own. */
function toFormValues(plan: Plan | null): PlanEditorValues {
  const limits: Record<string, string> = {};
  const unlimited: Record<string, boolean> = {};
  for (const key of PLAN_LIMIT_KEYS) {
    const value = plan?.limits[key];
    unlimited[key] = value === UNLIMITED;
    limits[key] = value === UNLIMITED ? '' : String(value ?? 0);
  }
  const emails = plan?.limits.monthlyEmails;
  return {
    amount:
      plan?.pricing?.amount !== undefined ? String(plan.pricing.amount) : '',
    currency: plan?.pricing?.currency ?? 'EGP',
    yearlyAmount:
      plan?.pricing?.yearlyAmount !== undefined
        ? String(plan.pricing.yearlyAmount)
        : '',
    trialEligible: plan?.trialEligible ?? false,
    trialDays: plan?.trialDurationDays ? String(plan.trialDurationDays) : '',
    giftedMonthly: giftedDaysToInput(plan?.giftedDaysMonthly),
    giftedYearly: giftedDaysToInput(plan?.giftedDaysYearly),
    limits,
    unlimited,
    monthlyEmails:
      emails === undefined || emails === UNLIMITED ? '' : String(emails),
    monthlyEmailsUnlimited: emails === UNLIMITED,
    features: pickPlanFeatures(plan?.features) as unknown as Record<
      string,
      boolean
    >,
    listed: (plan?.displayOrder ?? 0) > 0,
    position:
      (plan?.displayOrder ?? 0) > 0 ? String(plan?.displayOrder ?? '') : '',
  };
}

/** The editor's limits as the draft the reduction check reads. */
function toLimitDraft(values: PlanEditorValues): LimitDraft {
  const draft: LimitDraft = {};
  for (const key of PLAN_LIMIT_KEYS) {
    draft[key] = values.unlimited[key]
      ? UNLIMITED
      : numberText(values.limits[key]);
  }
  return draft;
}

/** The API's field paths → the form's (`useServerValidation` aliases). */
const SERVER_FIELD_ALIASES: Readonly<Record<string, Path<PlanEditorValues>>> = {
  'pricing.amount': 'amount',
  'pricing.currency': 'currency',
  'pricing.yearlyAmount': 'yearlyAmount',
  trialDurationDays: 'trialDays',
  giftedDaysMonthly: 'giftedMonthly',
  giftedDaysYearly: 'giftedYearly',
  'limits.monthlyEmails': 'monthlyEmails',
  displayOrder: 'position',
};

/** Label keys by the API's field path, so a server message names the field. */
const SERVER_FIELD_LABELS: Readonly<Record<string, string>> = {
  'pricing.amount': 'platform:planAdmin.editor.amount',
  'pricing.currency': 'platform:planAdmin.editor.currency',
  'pricing.yearlyAmount': 'platform:planAdmin.editor.yearlyAmount',
  trialDurationDays: 'platform:planAdmin.editor.trialDays',
  giftedDaysMonthly: 'platform:planAdmin.editor.giftMonthly',
  giftedDaysYearly: 'platform:planAdmin.editor.giftYearly',
  'limits.monthlyEmails': 'platform:planAdmin.editor.monthlyEmails',
  displayOrder: 'platform:planAdmin.editor.position',
  ...Object.fromEntries(
    PLAN_LIMIT_KEYS.map((key) => [
      `limits.${key}`,
      `tenant:common.limits.${key}`,
    ])
  ),
};

/** Label keys by the FORM's field path, for the error summary. */
const FORM_FIELD_LABELS: Readonly<Record<string, string>> = {
  amount: 'platform:planAdmin.editor.amount',
  currency: 'platform:planAdmin.editor.currency',
  yearlyAmount: 'platform:planAdmin.editor.yearlyAmount',
  trialDays: 'platform:planAdmin.editor.trialDays',
  giftedMonthly: 'platform:planAdmin.editor.giftMonthly',
  giftedYearly: 'platform:planAdmin.editor.giftYearly',
  monthlyEmails: 'platform:planAdmin.editor.monthlyEmails',
  position: 'platform:planAdmin.editor.position',
  ...Object.fromEntries(
    PLAN_LIMIT_KEYS.map((key) => [
      `limits.${key}`,
      `tenant:common.limits.${key}`,
    ])
  ),
};

/** A violation on one of the form's fields (by its API path). */
function isOnField(field: string): boolean {
  return field in SERVER_FIELD_ALIASES || field in SERVER_FIELD_LABELS;
}

/** Server values (`{ min: 1, max: 1000000 }`) as the page writes numbers. */
function useLocalizedViolations(
  error: ApiError | null,
  language: LanguageCode
): ApiError | null {
  return useMemo(() => {
    if (!error?.violations?.length) return error;
    const violations = error.violations.map((violation) =>
      violation.values
        ? {
            ...violation,
            values: Object.fromEntries(
              Object.entries(violation.values).map(([key, value]) => [
                key,
                typeof value === 'number'
                  ? formatNumber(value, language)
                  : value,
              ])
            ),
          }
        : violation
    );
    return Object.assign(
      Object.create(Object.getPrototypeOf(error) as object) as ApiError,
      error,
      { violations }
    );
  }, [error, language]);
}

export interface PlanEditorDialogProps {
  readonly plan: Plan | null;
  readonly onOpenChange: (open: boolean) => void;
  /**
   * The position offered when a hidden plan is switched to "Show to
   * customers" (the page passes the last listed position + 1).
   */
  readonly nextListedPosition?: number;
}

export function PlanEditorDialog({
  plan,
  onOpenChange,
  nextListedPosition,
}: PlanEditorDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { isolate } = useBidiIsolation();
  const fmt = useDateFormatter();
  const { notifySuccess } = useToast();
  const updatePlan = useUpdatePlan();
  const previewImpact = usePreviewLimitImpact();
  const previewNotice = usePreviewPlanNotice();
  const { confirm } = useConfirmDialog();

  // A yearly price is offered only beside a MONTHLY price — a plan priced
  // per year has no second price to add.
  const billingCycle = plan?.pricing?.billingCycle ?? 'monthly';
  const offersYearlyPrice = billingCycle === 'monthly';
  const priced = plan?.pricing?.amount !== undefined;
  const currencyForFloor = plan?.pricing?.currency ?? 'EGP';

  const schema = useMemo(
    () =>
      planEditorSchema({
        priced,
        offersYearly: offersYearlyPrice,
        limitKeys: PLAN_LIMIT_KEYS,
        formatNumber: (value) => formatNumber(value, language),
        formatPrice: (value) => {
          try {
            return formatCurrency(value, language, currencyForFloor);
          } catch {
            return formatNumber(value, language);
          }
        },
      }),
    [priced, offersYearlyPrice, language, currencyForFloor]
  );

  const form = useForm<PlanEditorValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: toFormValues(plan),
  });
  const { register, reset, watch, setValue, formState } = form;

  const [impact, setImpact] = useState<PlanLimitImpact | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Re-seed whenever a different plan is opened; a stale draft would carry
  // one plan's limits into another's editor.
  const resetUpdate = updatePlan.reset;
  const resetPreview = previewImpact.reset;
  const resetNotice = previewNotice.reset;
  useEffect(() => {
    if (!plan) return;
    reset(toFormValues(plan));
    setImpact(null);
    setConfirmed(false);
    resetUpdate();
    resetPreview();
    resetNotice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, reset]);

  // The server's refusal of a field lands on that field, its message
  // naming the field's label in the page's language (V07).
  const serverFields = {
    aliases: SERVER_FIELD_ALIASES,
    labels: SERVER_FIELD_LABELS,
  };
  const saveError = useLocalizedViolations(updatePlan.error ?? null, language);
  useServerValidation(form, saveError, serverFields);
  const previewError = useLocalizedViolations(
    previewImpact.error ?? null,
    language
  );
  useServerValidation(form, previewError, serverFields);
  // B8 (UX audit) V08 — the notice preview validates like the save, so its
  // refusals land on the same fields.
  const noticeError = useLocalizedViolations(
    previewNotice.error ?? null,
    language
  );
  useServerValidation(form, noticeError, serverFields);

  const guard = useDirtyGuard(formState.isDirty);
  const requestClose = () => {
    if (updatePlan.isPending) return;
    void guard.requestClose(() => onOpenChange(false));
  };

  const values = watch();
  const limitDraft = toLimitDraft(values);

  /** Which limits the draft LOWERS — the only ones worth an impact check. */
  const reducedLimitKeys = plan
    ? findReducedLimitKeys(
        plan.limits,
        draftToLimits(limitDraft, PLAN_LIMIT_KEYS),
        PLAN_LIMIT_KEYS
      )
    : [];
  const hasReduction = reducedLimitKeys.length > 0;
  // A reduction must be checked and then explicitly confirmed. Everything
  // else saves directly.
  const needsConfirmation = hasReduction && !confirmed;

  const invalidateImpact = () => {
    setImpact(null);
    setConfirmed(false);
  };

  const handleCheckImpact = async (): Promise<void> => {
    if (!plan) return;
    try {
      const result = await previewImpact.mutateAsync({
        key: plan.key,
        limits: draftToLimits(limitDraft, PLAN_LIMIT_KEYS),
      });
      setImpact(result);
    } catch {
      // Shown in the reduction panel (or on the limit it names), once.
    }
  };

  const handleSave = async (submitted: PlanEditorValues): Promise<void> => {
    if (!plan || needsConfirmation) return;
    const amount = wholeNumber(submitted.amount);
    const yearly = wholeNumber(submitted.yearlyAmount);
    const trial = wholeNumber(submitted.trialDays);
    const editedLimits = draftToLimits(
      toLimitDraft(submitted),
      PLAN_LIMIT_KEYS
    );
    const emails = submitted.monthlyEmailsUnlimited
      ? UNLIMITED
      : numberText(submitted.monthlyEmails);
    const limits = withMonthlyEmails(
      withUneditedLimits(editedLimits, plan.limits, PLAN_LIMIT_KEYS, [
        'monthlyEmails',
      ]),
      emails
    );
    const pricing =
      amount !== null
        ? {
            amount,
            currency: submitted.currency.trim().toUpperCase(),
            billingCycle,
            // Omitted when empty: the plan then has no yearly option.
            ...(offersYearlyPrice && yearly !== null
              ? { yearlyAmount: yearly }
              : {}),
          }
        : undefined;
    // B8 (UX audit) V08 — a price or limit change can reach paying
    // organizations on the plan (the server emails their owners); anything
    // else changes only the catalog.
    // Field by field, so the answer never depends on key order.
    const savedYearly =
      offersYearlyPrice && plan.pricing?.yearlyAmount !== undefined
        ? plan.pricing.yearlyAmount
        : undefined;
    const priceChanged =
      !pricing || !plan.pricing
        ? Boolean(pricing) !== Boolean(plan.pricing)
        : pricing.amount !== plan.pricing.amount ||
          pricing.currency !== plan.pricing.currency ||
          pricing.billingCycle !==
            (plan.pricing.billingCycle ?? billingCycle) ||
          pricing.yearlyAmount !== savedYearly;
    const reachesSubscribers =
      priceChanged ||
      PLAN_LIMIT_KEYS.some((key) => limits[key] !== plan.limits[key]) ||
      limits.monthlyEmails !== plan.limits.monthlyEmails;
    // Before saving such a change, ask the server how many organizations it
    // will email (the very decision the save runs) and say so in a
    // confirmation; with nobody to email, it simply saves.
    let recipients = 0;
    if (reachesSubscribers) {
      try {
        const preview = await previewNotice.mutateAsync({
          key: plan.key,
          payload: { limits, ...(pricing ? { pricing } : {}) },
        });
        recipients = preview.recipients;
      } catch {
        // Shown in the dialog, once (on a field, or one alert); not saved.
        return;
      }
      if (recipients > 0) {
        const confirmed = await confirm({
          titleKey: 'platform:planAdmin.editor.noticeConfirm.title',
          descriptionKey: 'platform:planAdmin.editor.noticeConfirm.description',
          confirmLabelKey: 'platform:planAdmin.editor.noticeConfirm.confirm',
          cancelLabelKey: 'platform:planAdmin.editor.noticeConfirm.cancel',
          values: {
            count: recipients,
            countText: formatNumber(recipients, language),
            plan: isolate(plan.name),
          },
        });
        if (!confirmed) return;
      }
    }
    // Visibility — sent only when it changed, so an unrelated edit can
    // never be refused for hiding the last listed plan.
    const savedOrder = plan.displayOrder ?? 0;
    const displayOrder = submitted.listed
      ? (wholeNumber(submitted.position) ?? savedOrder)
      : 0;
    const visibilityChange =
      plan.status !== 'archived' && displayOrder !== savedOrder
        ? { displayOrder }
        : {};
    try {
      await updatePlan.mutateAsync({
        key: plan.key,
        payload: {
          expectedVersion: plan.version,
          ...visibilityChange,
          limits,
          features: pickPlanFeatures(submitted.features),
          pricing,
          trialEligible: submitted.trialEligible,
          // Empty means "fall back to the platform default", which the
          // backend expresses as null — not 0, which would mean a
          // zero-day trial.
          trialDurationDays: submitted.trialEligible
            ? trial
            : (plan.trialDurationDays ?? null),
          giftedDaysMonthly: giftedDaysInputToPayload(
            numberText(submitted.giftedMonthly)
          ),
          giftedDaysYearly: giftedDaysInputToPayload(
            numberText(submitted.giftedYearly)
          ),
        },
      });
    } catch {
      // Shown in the dialog, once: on its field, as "reload", or inline.
      return;
    }
    notifySuccess(
      'platform:planAdmin.editor.savedTitle',
      recipients > 0
        ? 'platform:planAdmin.editor.savedNotifiedCount'
        : reachesSubscribers
          ? 'platform:planAdmin.editor.savedNobodyEmailed'
          : 'platform:planAdmin.editor.savedCatalogOnly',
      {
        plan: plan.name,
        count: recipients,
        countText: formatNumber(recipients, language),
      }
    );
    reset(submitted);
    onOpenChange(false);
  };

  // 409 also says "this is the last plan customers can see": that one is
  // not a stale version — it is explained in the save-failed alert.
  const isLastListed =
    updatePlan.error?.messageKey === PLAN_ERROR_KEYS.lastListedPlan;
  const isStale = updatePlan.error?.kind === 'conflict' && !isLastListed;
  const isArchived = plan?.status === 'archived';
  // A refusal no field shows (5xx, lost connection, a feature violation…).
  const showSaveFailure =
    updatePlan.error &&
    !isStale &&
    updatePlan.error.kind !== 'cancelled' &&
    !(updatePlan.error.violations ?? []).some((v) => isOnField(v.field));
  const showNoticeFailure =
    previewNotice.error &&
    previewNotice.error.kind !== 'cancelled' &&
    !(previewNotice.error.violations ?? []).some((v) => isOnField(v.field));
  const showPreviewFailure =
    previewImpact.error &&
    previewImpact.error.kind !== 'cancelled' &&
    !(previewImpact.error.violations ?? []).some((v) => isOnField(v.field));

  const errorOf = (name: string, labelKey: string): string | undefined => {
    const parts = name.split('.');
    let node: unknown = formState.errors;
    for (const part of parts) {
      node =
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined;
    }
    const message =
      node && typeof node === 'object'
        ? (node as { message?: unknown }).message
        : undefined;
    return typeof message === 'string'
      ? fieldErrorText(t, message, t(labelKey))
      : undefined;
  };

  const unitFor = (key: PlanLimitKey): string | undefined =>
    STORAGE_LIMIT_KEYS.includes(key) ? t('common:units.gigabytes') : undefined;

  const unmeasurable = impact
    ? new Intl.ListFormat(language, { type: 'conjunction' }).format(
        impact.unmeasurableLimitKeys.map((key) =>
          i18n.exists(`tenant:common.limits.${key}`)
            ? t(`tenant:common.limits.${key}`)
            : key
        )
      )
    : '';

  return (
    <Dialog
      open={plan !== null}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('platform:planAdmin.editor.title', {
              plan: isolate(plan?.name ?? ''),
            })}
          </DialogTitle>
          <DialogDescription>
            {t('platform:planAdmin.editor.description')}
          </DialogDescription>
        </DialogHeader>

        <form
          id="plan-editor-form"
          noValidate
          onSubmit={(event) => void form.handleSubmit(handleSave)(event)}
          className="space-y-6"
        >
          <FormErrorSummary form={form} fieldLabels={FORM_FIELD_LABELS} />

          {isArchived ? (
            <Alert data-testid="plan-archived-banner">
              <Archive className="size-4" aria-hidden />
              <AlertTitle>
                {t('platform:planAdmin.editor.archivedTitle')}
              </AlertTitle>
              <AlertDescription>
                {t('platform:planAdmin.editor.archivedDescription')}
              </AlertDescription>
            </Alert>
          ) : null}

          {isStale ? (
            <Alert variant="destructive">
              <AlertTitle>
                {t('platform:planAdmin.editor.staleTitle')}
              </AlertTitle>
              <AlertDescription>
                {t('platform:planAdmin.editor.staleDescription')}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* ---------- visibility (plan management) ---------- */}
          {!isArchived ? (
            <section
              className="space-y-3"
              aria-labelledby="plan-visibility-title"
            >
              <h3 id="plan-visibility-title" className="text-sm font-semibold">
                {t('platform:planAdmin.editor.visibilityTitle')}
              </h3>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="plan-listed">
                  {t('platform:planAdmin.editor.showToCustomers')}
                </Label>
                <Switch
                  id="plan-listed"
                  data-testid="plan-listed"
                  checked={values.listed}
                  onCheckedChange={(checked) => {
                    setValue('listed', checked, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    if (checked && numberText(values.position) === '') {
                      setValue(
                        'position',
                        String(
                          Math.min(
                            Math.max(nextListedPosition ?? 1, 1),
                            PLAN_POSITION_MAX
                          )
                        ),
                        { shouldDirty: true, shouldValidate: true }
                      );
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {values.listed
                  ? t('platform:planAdmin.editor.listedHelp')
                  : t('platform:planAdmin.editor.hiddenHelp')}
              </p>
              {values.listed ? (
                <PlanField
                  id="plan-position"
                  className="sm:max-w-xs"
                  label={t('platform:planAdmin.editor.position')}
                  help={t('platform:planAdmin.editor.positionHelp')}
                  error={errorOf(
                    'position',
                    'platform:planAdmin.editor.position'
                  )}
                >
                  {(aria) => (
                    <Input
                      id="plan-position"
                      data-testid="plan-position"
                      inputMode="numeric"
                      dir="ltr"
                      data-ltr-content
                      autoComplete="off"
                      {...aria}
                      {...register('position')}
                    />
                  )}
                </PlanField>
              ) : null}
            </section>
          ) : null}

          {/* ---------- pricing ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.pricingTitle')}
            </h3>
            {/* B0-BIL-07 — saving reaches existing subscribers; say so first. */}
            <p
              className="text-xs text-muted-foreground"
              data-testid="plan-subscriber-notice"
            >
              {t('platform:planAdmin.editor.subscriberNotice')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <PlanField
                id="plan-amount"
                label={t('platform:planAdmin.editor.amount')}
                help={t('platform:planAdmin.editor.amountHelp')}
                error={errorOf('amount', 'platform:planAdmin.editor.amount')}
              >
                {(aria) => (
                  <Input
                    id="plan-amount"
                    data-testid="plan-amount"
                    inputMode="numeric"
                    dir="ltr"
                    data-ltr-content
                    autoComplete="off"
                    {...aria}
                    {...register('amount')}
                  />
                )}
              </PlanField>
              <PlanField
                id="plan-currency"
                label={t('platform:planAdmin.editor.currency')}
                error={errorOf(
                  'currency',
                  'platform:planAdmin.editor.currency'
                )}
              >
                {(aria) => (
                  <Input
                    id="plan-currency"
                    data-testid="plan-currency"
                    dir="ltr"
                    data-ltr-content
                    autoComplete="off"
                    maxLength={3}
                    {...aria}
                    {...register('currency')}
                  />
                )}
              </PlanField>
            </div>
            {offersYearlyPrice ? (
              <PlanField
                id="plan-yearly-amount"
                label={t('platform:planAdmin.editor.yearlyAmount')}
                help={t('platform:planAdmin.editor.yearlyAmountHelp')}
                error={errorOf(
                  'yearlyAmount',
                  'platform:planAdmin.editor.yearlyAmount'
                )}
              >
                {(aria) => (
                  <Input
                    id="plan-yearly-amount"
                    data-testid="plan-yearly-amount"
                    inputMode="numeric"
                    dir="ltr"
                    data-ltr-content
                    autoComplete="off"
                    {...aria}
                    {...register('yearlyAmount')}
                  />
                )}
              </PlanField>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t('platform:planAdmin.editor.pricingNote')}
            </p>
          </section>

          {/* ---------- trial ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.trialTitle')}
            </h3>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="plan-trial-eligible">
                {t('platform:planAdmin.editor.trialEligible')}
              </Label>
              <Switch
                id="plan-trial-eligible"
                data-testid="plan-trial-eligible"
                checked={values.trialEligible}
                onCheckedChange={(checked) =>
                  setValue('trialEligible', checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {values.trialEligible ? (
              <PlanField
                id="plan-trial-days"
                label={t('platform:planAdmin.editor.trialDays')}
                help={t('platform:planAdmin.editor.trialDaysHelp')}
                error={errorOf(
                  'trialDays',
                  'platform:planAdmin.editor.trialDays'
                )}
              >
                {(aria) => (
                  <Input
                    id="plan-trial-days"
                    data-testid="plan-trial-days"
                    inputMode="numeric"
                    dir="ltr"
                    data-ltr-content
                    autoComplete="off"
                    placeholder={t(
                      'platform:planAdmin.editor.trialDaysPlaceholder'
                    )}
                    {...aria}
                    {...register('trialDays')}
                  />
                )}
              </PlanField>
            ) : null}
          </section>

          {/* ---------- gifted setup days (W8) ---------- */}
          <section className="space-y-3" aria-labelledby="plan-gift-title">
            <h3 id="plan-gift-title" className="text-sm font-semibold">
              {t('platform:planAdmin.editor.giftTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('platform:planAdmin.editor.giftDescription')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: 'plan-gifted-monthly',
                    name: 'giftedMonthly',
                    label: 'giftMonthly',
                    help: 'giftMonthlyHelp',
                  },
                  {
                    id: 'plan-gifted-yearly',
                    name: 'giftedYearly',
                    label: 'giftYearly',
                    help: 'giftYearlyHelp',
                  },
                ] as const
              ).map((field) => (
                <PlanField
                  key={field.id}
                  id={field.id}
                  label={t(`platform:planAdmin.editor.${field.label}`)}
                  help={t(`platform:planAdmin.editor.${field.help}`)}
                  error={errorOf(
                    field.name,
                    `platform:planAdmin.editor.${field.label}`
                  )}
                >
                  {(aria) => (
                    <Input
                      id={field.id}
                      data-testid={field.id}
                      inputMode="numeric"
                      dir="ltr"
                      data-ltr-content
                      autoComplete="off"
                      placeholder={t(
                        'platform:planAdmin.editor.giftPlaceholder'
                      )}
                      {...aria}
                      {...register(field.name)}
                    />
                  )}
                </PlanField>
              ))}
            </div>
          </section>

          {/* ---------- limits ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.limitsTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('platform:planAdmin.editor.limitsHelp')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {PLAN_LIMIT_KEYS.map((key) => {
                const id = `plan-limit-${key}`;
                const isUnlimited = Boolean(values.unlimited[key]);
                const unit = unitFor(key);
                const field = register(`limits.${key}`, {
                  // Any limit edit invalidates a previous impact check.
                  onChange: invalidateImpact,
                });
                return (
                  <PlanField
                    key={key}
                    id={id}
                    label={
                      unit
                        ? t('platform:planAdmin.editor.limitWithUnit', {
                            label: t(`tenant:common.limits.${key}`),
                            unit,
                          })
                        : t(`tenant:common.limits.${key}`)
                    }
                    error={
                      isUnlimited
                        ? undefined
                        : errorOf(
                            `limits.${key}`,
                            `tenant:common.limits.${key}`
                          )
                    }
                  >
                    {(aria) => (
                      <div className="flex items-center gap-3">
                        <Input
                          id={id}
                          data-testid={id}
                          inputMode="numeric"
                          dir="ltr"
                          data-ltr-content
                          autoComplete="off"
                          disabled={isUnlimited}
                          placeholder={
                            isUnlimited
                              ? t('platform:planAdmin.editor.unlimited')
                              : undefined
                          }
                          className="min-w-0 flex-1"
                          {...aria}
                          {...field}
                        />
                        <label className="flex shrink-0 items-center gap-2 text-sm">
                          <Switch
                            data-testid={`${id}-unlimited`}
                            checked={isUnlimited}
                            onCheckedChange={(checked) => {
                              setValue(`unlimited.${key}`, checked, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              invalidateImpact();
                            }}
                          />
                          {t('platform:planAdmin.editor.unlimited')}
                        </label>
                      </div>
                    )}
                  </PlanField>
                );
              })}
            </div>
            <PlanField
              id="plan-limit-monthlyEmails"
              className="sm:max-w-md"
              label={t('platform:planAdmin.editor.monthlyEmails')}
              help={t('platform:planAdmin.editor.monthlyEmailsHelp', {
                count: DEFAULT_MONTHLY_EMAILS,
              })}
              error={
                values.monthlyEmailsUnlimited
                  ? undefined
                  : errorOf(
                      'monthlyEmails',
                      'platform:planAdmin.editor.monthlyEmails'
                    )
              }
            >
              {(aria) => (
                <div className="flex items-center gap-3">
                  <Input
                    id="plan-limit-monthlyEmails"
                    data-testid="plan-limit-monthlyEmails"
                    dir="ltr"
                    data-ltr-content
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={values.monthlyEmailsUnlimited}
                    placeholder={
                      values.monthlyEmailsUnlimited
                        ? t('platform:planAdmin.editor.unlimited')
                        : String(DEFAULT_MONTHLY_EMAILS)
                    }
                    className="min-w-0 flex-1"
                    {...aria}
                    {...register('monthlyEmails')}
                  />
                  <label className="flex shrink-0 items-center gap-2 text-sm">
                    <Switch
                      data-testid="plan-limit-monthlyEmails-unlimited"
                      checked={values.monthlyEmailsUnlimited}
                      onCheckedChange={(checked) =>
                        setValue('monthlyEmailsUnlimited', checked, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    {t('platform:planAdmin.editor.unlimited')}
                  </label>
                </div>
              )}
            </PlanField>
          </section>

          {/* ---------- features ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.featuresTitle')}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLAN_FEATURE_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3"
                >
                  <Label
                    htmlFor={`plan-feature-${key}`}
                    className="text-sm font-normal"
                  >
                    {t(`tenant:common.features.${key}`)}
                  </Label>
                  <Switch
                    id={`plan-feature-${key}`}
                    data-testid={`plan-feature-${key}`}
                    checked={!!values.features[key]}
                    onCheckedChange={(checked) =>
                      setValue(`features.${key}`, checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ---------- limit reduction impact ---------- */}
          {hasReduction ? (
            <Alert variant="destructive" data-testid="plan-limit-warning">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertTitle>
                {t('platform:planAdmin.editor.reductionTitle')}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{t('platform:planAdmin.editor.reductionDescription')}</p>

                {impact === null ? (
                  <>
                    {showPreviewFailure && previewImpact.error ? (
                      <SaveFailedAlert
                        error={previewImpact.error}
                        titleKey="platform:planAdmin.editor.impactFailed"
                      />
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="plan-check-impact"
                      disabled={previewImpact.isPending}
                      onClick={() => void handleCheckImpact()}
                    >
                      {previewImpact.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {t('platform:planAdmin.editor.checkImpact')}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2" data-testid="plan-impact-result">
                    {/* P61 — say plainly who this edit cannot reach. A
                        subscriber whose entitlement was captured at purchase
                        keeps it; the catalog edit changes what NEW customers
                        get, not what they already bought. Without this line
                        the count below reads as "everyone else is fine",
                        which is a different and weaker claim. */}
                    {impact.protectedSubscriptions > 0 ? (
                      <p
                        className="text-sm"
                        data-testid="plan-impact-protected"
                      >
                        {t('platform:planAdmin.editor.impactProtected', {
                          count: impact.protectedSubscriptions,
                        })}
                      </p>
                    ) : null}

                    {impact.affected.length === 0 ? (
                      <p>{t('platform:planAdmin.editor.impactNone')}</p>
                    ) : (
                      <>
                        <p className="font-medium">
                          {t('platform:planAdmin.editor.impactCount', {
                            count: impact.affected.length,
                          })}
                        </p>
                        <ul className="space-y-1 text-sm">
                          {impact.affected.slice(0, 10).map((row) => (
                            <li key={`${row.organizationId}-${row.limitKey}`}>
                              {/* B8 (UX audit) V27 — the organization's
                                  name keeps its own direction, so an
                                  Arabic name never flips the line. */}
                              <bdi>{row.organizationName}</bdi>
                              {' — '}
                              {t(`tenant:common.limits.${row.limitKey}`)}:{' '}
                              <span dir="ltr" data-ltr-content>
                                {row.currentUsage} / {row.proposedLimit}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {impact.affected.length > 10 ? (
                          <p className="text-xs">
                            {t('platform:planAdmin.editor.impactMore', {
                              count: impact.affected.length - 10,
                            })}
                          </p>
                        ) : null}
                      </>
                    )}

                    {/* Honest about snapshot freshness rather than implying
                        these are live counts. */}
                    {impact.usageAsOf ? (
                      <p className="text-xs">
                        {t('platform:planAdmin.editor.impactAsOf', {
                          date: fmt.dateTime(impact.usageAsOf),
                        })}
                      </p>
                    ) : null}
                    {impact.unmeasurableLimitKeys.length > 0 ? (
                      <p
                        className="text-xs"
                        data-testid="plan-impact-unmeasurable"
                      >
                        {t('platform:planAdmin.editor.impactUnmeasurable', {
                          keys: unmeasurable,
                        })}
                      </p>
                    ) : null}

                    <p className="text-xs">
                      {t('platform:planAdmin.editor.impactNonDestructive')}
                    </p>

                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        data-testid="plan-confirm-reduction"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        {t('platform:planAdmin.editor.confirmReduction')}
                      </span>
                    </label>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          {showNoticeFailure && previewNotice.error ? (
            <SaveFailedAlert
              error={previewNotice.error}
              titleKey="platform:planAdmin.editor.noticeCheckFailed"
            />
          ) : null}

          {showSaveFailure && updatePlan.error ? (
            <SaveFailedAlert
              error={updatePlan.error}
              titleKey="platform:planAdmin.editor.saveFailed"
            />
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={updatePlan.isPending}
            onClick={requestClose}
          >
            {t('common:actions.cancel')}
          </Button>
          {/* Never disabled without a reason on screen: only while saving,
              or while a lowered limit's impact (explained just above) still
              needs checking and confirming. */}
          <Button
            type="submit"
            form="plan-editor-form"
            data-testid="plan-save"
            disabled={
              updatePlan.isPending ||
              previewNotice.isPending ||
              needsConfirmation
            }
          >
            {updatePlan.isPending || previewNotice.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
