/**
 * Plan management — a new plan (`POST platform-plans`, atlas-backend#112).
 *
 * WHAT IT ASKS FOR, AND WHAT IT COPIES. The owner names the plan (key,
 * English name and description, optionally Arabic ones), picks its family
 * and tier, prices it in EGP (monthly, plus an optional yearly price) and
 * chooses a plan to START FROM: the new plan copies that plan's full set of
 * limits and features, its free trial and its gifted days, which the
 * server needs and which are then fine-tuned in the plan editor that opens
 * right after the create.
 *
 * ALWAYS CREATED HIDDEN (`displayOrder: 0`, owner decision): customers do
 * not see a new plan until the owner switches on "Show to customers" in its
 * editor. The marketing pricing page only shows it after the next site
 * deploy (the catalog page says so); add-ons restricted to certain plans are
 * not offered on it until their compatibility lists it (said here).
 *
 * Every rule the server applies is checked here first
 * (`createPlanSchema`); a server refusal lands on its field
 * (`useServerValidation`, API paths mapped onto the form's), a taken key on
 * the key field, anything else in one inline alert. Leaving with typed
 * changes asks first.
 */
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@app/providers';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  FormErrorSummary,
  SaveFailedAlert,
  fieldErrorText,
  useServerValidation,
} from '@forms';
import { resolvePlanName } from '@features/tenant';
import { formatCurrency, formatNumber, toTranslationKey } from '@utils';
import type { CreatePlanPayload, LanguageCode, Plan } from '@types';
import { useCreatePlan, usePlatformPlanList } from '../hooks/usePlatformPlans';
import {
  createPlanSchema,
  englishDescriptionMax,
  PLAN_LOCALIZED_MAX,
  wholeNumber,
  type CreatePlanValues,
} from '../schemas/plan-editor.schema';
import {
  PLAN_ERROR_KEYS,
  copiedPlanSettings,
  planVisibility,
} from '../utils/plan-management.utils';
import { PlanField } from './PlanField';

/** Add-on and plan prices are EGP only (owner decision). */
const CURRENCY = 'EGP';
/** Enough for the whole catalog in one page: plans are a short list. */
const SOURCE_PAGE_SIZE = 100;

const DEFAULT_VALUES: CreatePlanValues = {
  key: '',
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  family: 'normal',
  tier: 'none',
  sourceKey: '',
  amount: '',
  yearlyAmount: '',
};

const K = 'platform:planAdmin.create';

/** The API's field paths → the form's. */
const SERVER_FIELD_ALIASES: Readonly<Record<string, Path<CreatePlanValues>>> = {
  name: 'nameEn',
  description: 'descriptionEn',
  'nameLocalized.en': 'nameEn',
  'nameLocalized.ar': 'nameAr',
  'descriptionLocalized.en': 'descriptionEn',
  'descriptionLocalized.ar': 'descriptionAr',
  'pricing.amount': 'amount',
  'pricing.yearlyAmount': 'yearlyAmount',
};

/** Label keys by the FORM's field path. */
const FORM_FIELD_LABELS: Readonly<Record<string, string>> = {
  key: `${K}.key`,
  nameEn: `${K}.nameEn`,
  nameAr: `${K}.nameAr`,
  descriptionEn: `${K}.descriptionEn`,
  descriptionAr: `${K}.descriptionAr`,
  family: `${K}.family`,
  tier: `${K}.tier`,
  sourceKey: `${K}.source`,
  amount: `${K}.amount`,
  yearlyAmount: `${K}.yearlyAmount`,
};

/** Label keys by the API's field path, so a server message names the field. */
const SERVER_FIELD_LABELS: Readonly<Record<string, string>> = {
  key: FORM_FIELD_LABELS.key,
  family: FORM_FIELD_LABELS.family,
  tier: FORM_FIELD_LABELS.tier,
  ...Object.fromEntries(
    Object.entries(SERVER_FIELD_ALIASES).map(([api, field]) => [
      api,
      FORM_FIELD_LABELS[field],
    ])
  ),
};

/** A violation the form shows beside a field (by its API path). */
function isOnField(field: string): boolean {
  return field in SERVER_FIELD_LABELS;
}

export interface CreatePlanDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The plan just created — the page opens it in the plan editor. */
  readonly onCreated: (plan: Plan) => void;
}

export function CreatePlanDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePlanDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { notifySuccess } = useToast();
  const createPlan = useCreatePlan();
  const sourcesQuery = usePlatformPlanList(
    { page: 1, pageSize: SOURCE_PAGE_SIZE },
    { enabled: open }
  );
  const sources = useMemo(
    () =>
      (sourcesQuery.data?.items ?? []).filter(
        (plan) => planVisibility(plan) !== 'archived'
      ),
    [sourcesQuery.data]
  );

  const schema = useMemo(
    () =>
      createPlanSchema({
        formatNumber: (value) => formatNumber(value, language),
        formatPrice: (value) => formatCurrency(value, language, CURRENCY),
      }),
    [language]
  );
  const form = useForm<CreatePlanValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });
  const { register, reset, watch, setValue, setError, formState } = form;

  // Each opening starts blank.
  const resetCreate = createPlan.reset;
  useEffect(() => {
    if (!open) return;
    reset(DEFAULT_VALUES);
    resetCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const error = createPlan.error ?? null;
  useServerValidation(form, error, {
    aliases: SERVER_FIELD_ALIASES,
    labels: SERVER_FIELD_LABELS,
  });
  // A taken key is a 409, not a 400: it goes on the key field by hand.
  const keyTaken = error?.messageKey === PLAN_ERROR_KEYS.keyTaken;
  useEffect(() => {
    if (!keyTaken || !error) return;
    setError(
      'key',
      { type: 'server', message: toTranslationKey(error.messageKey) },
      { shouldFocus: true }
    );
  }, [error, keyTaken, setError]);

  const guard = useDirtyGuard(formState.isDirty);
  const requestClose = () => {
    if (createPlan.isPending) return;
    void guard.requestClose(() => onOpenChange(false));
  };

  const values = watch();

  const handleCreate = async (submitted: CreatePlanValues): Promise<void> => {
    const source = sources.find((plan) => plan.key === submitted.sourceKey);
    const amount = wholeNumber(submitted.amount);
    if (!source || amount === null) return;
    const yearly = wholeNumber(submitted.yearlyAmount);
    const key = submitted.key.trim();
    const nameEn = submitted.nameEn.trim();
    const nameAr = submitted.nameAr.trim();
    const descriptionEn = submitted.descriptionEn.trim();
    const descriptionAr = submitted.descriptionAr.trim();
    const payload: CreatePlanPayload = {
      key,
      name: nameEn,
      description: descriptionEn,
      // The server wants both sides when either is sent.
      ...(nameAr ? { nameLocalized: { en: nameEn, ar: nameAr } } : {}),
      ...(descriptionAr
        ? { descriptionLocalized: { en: descriptionEn, ar: descriptionAr } }
        : {}),
      // Owner decision: a new plan is created hidden.
      displayOrder: 0,
      ...copiedPlanSettings(source),
      pricing: {
        amount,
        currency: CURRENCY,
        billingCycle: 'monthly',
        ...(yearly !== null ? { yearlyAmount: yearly } : {}),
      },
      family: submitted.family,
      ...(submitted.tier !== 'none' ? { tier: submitted.tier } : {}),
    };
    let created: Plan;
    try {
      created = await createPlan.mutateAsync(payload);
    } catch {
      // Shown in the dialog, once: on its field, or inline.
      return;
    }
    notifySuccess(`${K}.createdTitle`, `${K}.createdDescription`, {
      plan: resolvePlanName(created, language),
    });
    reset(DEFAULT_VALUES);
    onOpenChange(false);
    onCreated(created);
  };

  const showFailure =
    error !== null &&
    !keyTaken &&
    error.kind !== 'cancelled' &&
    !(error.violations ?? []).some((violation) => isOnField(violation.field));

  const errorOf = (name: keyof CreatePlanValues): string | undefined => {
    const message = formState.errors[name]?.message;
    return typeof message === 'string'
      ? fieldErrorText(t, message, t(FORM_FIELD_LABELS[name]))
      : undefined;
  };

  const counter = (value: string, max: number, testId: string) => (
    <p
      data-testid={testId}
      className={
        value.trim().length > max
          ? 'text-xs font-medium tabular-nums text-destructive'
          : 'text-xs tabular-nums text-muted-foreground'
      }
    >
      {t('common:form.characterCount', {
        count: value.trim().length,
        max,
      })}
    </p>
  );

  const englishMax = englishDescriptionMax(values.descriptionAr);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        data-testid="create-plan-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t(`${K}.title`)}</DialogTitle>
          <DialogDescription>{t(`${K}.description`)}</DialogDescription>
        </DialogHeader>

        <form
          id="create-plan-form"
          noValidate
          onSubmit={(event) => void form.handleSubmit(handleCreate)(event)}
          className="space-y-5"
        >
          <FormErrorSummary form={form} fieldLabels={FORM_FIELD_LABELS} />

          <PlanField
            id="create-plan-key"
            label={t(`${K}.key`)}
            help={t(`${K}.keyHelp`)}
            error={errorOf('key')}
          >
            {(aria) => (
              <Input
                id="create-plan-key"
                data-testid="create-plan-key"
                dir="ltr"
                data-ltr-content
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                {...aria}
                {...register('key', {
                  onChange: () => {
                    if (keyTaken) createPlan.reset();
                  },
                })}
              />
            )}
          </PlanField>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField
              id="create-plan-name-en"
              label={t(`${K}.nameEn`)}
              error={errorOf('nameEn')}
            >
              {(aria) => (
                <Input
                  id="create-plan-name-en"
                  data-testid="create-plan-name-en"
                  dir="ltr"
                  lang="en"
                  autoComplete="off"
                  {...aria}
                  {...register('nameEn')}
                />
              )}
            </PlanField>
            <PlanField
              id="create-plan-name-ar"
              label={t(`${K}.nameAr`)}
              help={t(`${K}.nameArHelp`)}
              error={errorOf('nameAr')}
            >
              {(aria) => (
                <Input
                  id="create-plan-name-ar"
                  data-testid="create-plan-name-ar"
                  dir="rtl"
                  lang="ar"
                  autoComplete="off"
                  {...aria}
                  {...register('nameAr')}
                />
              )}
            </PlanField>
          </div>
          {values.nameAr.trim().length > 0
            ? counter(
                values.nameAr,
                PLAN_LOCALIZED_MAX,
                'create-plan-name-ar-count'
              )
            : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField
              id="create-plan-description-en"
              label={t(`${K}.descriptionEn`)}
              error={errorOf('descriptionEn')}
            >
              {(aria) => (
                <Textarea
                  id="create-plan-description-en"
                  data-testid="create-plan-description-en"
                  dir="ltr"
                  lang="en"
                  rows={3}
                  {...aria}
                  {...register('descriptionEn', {
                    // The cap depends on the Arabic description.
                    deps: ['descriptionAr'],
                  })}
                />
              )}
            </PlanField>
            <PlanField
              id="create-plan-description-ar"
              label={t(`${K}.descriptionAr`)}
              help={t(`${K}.descriptionArHelp`)}
              error={errorOf('descriptionAr')}
            >
              {(aria) => (
                <Textarea
                  id="create-plan-description-ar"
                  data-testid="create-plan-description-ar"
                  dir="rtl"
                  lang="ar"
                  rows={3}
                  {...aria}
                  {...register('descriptionAr', { deps: ['descriptionEn'] })}
                />
              )}
            </PlanField>
          </div>
          {counter(
            values.descriptionEn,
            englishMax,
            'create-plan-description-en-count'
          )}
          {values.descriptionAr.trim().length > 0
            ? counter(
                values.descriptionAr,
                PLAN_LOCALIZED_MAX,
                'create-plan-description-ar-count'
              )
            : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <PlanField
              id="create-plan-family"
              label={t(`${K}.family`)}
              error={errorOf('family')}
            >
              {(aria) => (
                <Select
                  value={values.family}
                  onValueChange={(next) =>
                    setValue('family', next as CreatePlanValues['family'], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="create-plan-family"
                    data-testid="create-plan-family"
                    aria-label={t(`${K}.family`)}
                    {...aria}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['normal', 'premium'] as const).map((family) => (
                      <SelectItem key={family} value={family}>
                        {t(`${K}.familyOptions.${family}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </PlanField>
            <PlanField
              id="create-plan-tier"
              label={t(`${K}.tier`)}
              error={errorOf('tier')}
            >
              {(aria) => (
                <Select
                  value={values.tier}
                  onValueChange={(next) =>
                    setValue('tier', next as CreatePlanValues['tier'], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="create-plan-tier"
                    data-testid="create-plan-tier"
                    aria-label={t(`${K}.tier`)}
                    {...aria}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['none', 'basic', 'growth', 'enterprise'] as const).map(
                      (tier) => (
                        <SelectItem key={tier} value={tier}>
                          {t(`${K}.tierOptions.${tier}`)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            </PlanField>
          </div>

          <PlanField
            id="create-plan-source"
            label={t(`${K}.source`)}
            help={t(`${K}.sourceHelp`)}
            error={errorOf('sourceKey')}
          >
            {(aria) => (
              <Select
                value={values.sourceKey}
                onValueChange={(next) =>
                  setValue('sourceKey', next, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger
                  id="create-plan-source"
                  data-testid="create-plan-source"
                  aria-label={t(`${K}.source`)}
                  {...aria}
                >
                  <SelectValue placeholder={t(`${K}.sourcePlaceholder`)} />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((plan) => (
                    <SelectItem key={plan.key} value={plan.key}>
                      {resolvePlanName(plan, language)} ({plan.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </PlanField>

          <div className="grid gap-4 sm:grid-cols-3">
            <PlanField
              id="create-plan-amount"
              label={t(`${K}.amount`)}
              help={t(`${K}.amountHelp`)}
              error={errorOf('amount')}
            >
              {(aria) => (
                <Input
                  id="create-plan-amount"
                  data-testid="create-plan-amount"
                  inputMode="numeric"
                  dir="ltr"
                  data-ltr-content
                  autoComplete="off"
                  {...aria}
                  {...register('amount', { deps: ['yearlyAmount'] })}
                />
              )}
            </PlanField>
            <PlanField
              id="create-plan-yearly-amount"
              label={t(`${K}.yearlyAmount`)}
              help={t(`${K}.yearlyAmountHelp`)}
              error={errorOf('yearlyAmount')}
            >
              {(aria) => (
                <Input
                  id="create-plan-yearly-amount"
                  data-testid="create-plan-yearly-amount"
                  inputMode="numeric"
                  dir="ltr"
                  data-ltr-content
                  autoComplete="off"
                  {...aria}
                  {...register('yearlyAmount')}
                />
              )}
            </PlanField>
            <PlanField id="create-plan-currency" label={t(`${K}.currency`)}>
              {(aria) => (
                <Input
                  id="create-plan-currency"
                  data-testid="create-plan-currency"
                  readOnly
                  aria-readonly
                  value={t(`${K}.currencyValue`)}
                  {...aria}
                />
              )}
            </PlanField>
          </div>

          <Alert data-testid="create-plan-addons-note">
            <Info className="size-4" aria-hidden />
            <AlertDescription>
              {t(`${K}.restrictedAddOnsNote`)}
            </AlertDescription>
          </Alert>

          {showFailure && error ? (
            <SaveFailedAlert error={error} titleKey={`${K}.failed`} />
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={createPlan.isPending}
            onClick={requestClose}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="create-plan-form"
            data-testid="create-plan-submit"
            disabled={createPlan.isPending}
          >
            {createPlan.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {createPlan.isPending ? t(`${K}.creating`) : t(`${K}.submit`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
