/**
 * Trial Plan Picker.
 *
 * New Customer Onboarding — the plan choice on the one-page sign-up. One
 * radio group of calm, selectable cards, grouped by plan family, each
 * saying exactly what the visitor gets: the plan's name in their language,
 * its tier, the limits that matter first (academies, students, courses),
 * how long the trial runs, what it costs afterwards, and that no card is
 * needed.
 *
 * EVERYTHING SHOWN IS CATALOG DATA from `GET /public/signup-options` —
 * names come from `nameLocalized` via `resolvePlanName`, durations from
 * `trialDurationDays`, prices from `pricing`. Nothing is keyed off a plan
 * `key`, so a new trialable plan appears here by configuration alone.
 */
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatCurrency } from '@utils';
import { formatLimitValue, resolvePlanName } from '@features/tenant';
import type { LanguageCode, Plan, PlanFamily, PlanLimitKey } from '@types';

/** The limits a first-time customer compares plans on — the rest live on the Plans page. */
const KEY_LIMITS: readonly PlanLimitKey[] = ['academies', 'students', 'courses'];

const FAMILY_ORDER: readonly PlanFamily[] = ['normal', 'premium'];

export interface TrialPlanPickerProps {
  readonly plans: readonly Plan[];
  /** The selected plan's `id`, or `undefined` for none. */
  readonly value: string | undefined;
  readonly onChange: (planId: string) => void;
  readonly disabled?: boolean;
  /** A validation message key shown under the group (e.g. "choose a plan"). */
  readonly errorKey?: string;
  /** An explanatory notice key shown above the cards (e.g. "that plan is no longer available"). */
  readonly noticeKey?: string;
}

function formatPriceAfterTrial(
  plan: Plan,
  language: LanguageCode,
  t: (key: string, values?: Record<string, unknown>) => string
): string {
  const amount = plan.pricing?.amount;
  const currency = plan.pricing?.currency;
  // "Field present", never truthiness — a real free plan (`0`) is priced.
  if (amount === undefined || amount === null || !currency) {
    return t('auth:register.plan.priceUnavailable');
  }
  // Whole amounts read as "$79", not "$79.00" — calmer on a price card.
  const price = formatCurrency(amount, language, currency, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
  switch (plan.pricing?.billingCycle) {
    case 'monthly':
      return t('auth:register.plan.priceAfterTrialMonthly', { price });
    case 'yearly':
      return t('auth:register.plan.priceAfterTrialYearly', { price });
    default:
      return t('auth:register.plan.priceAfterTrial', { price });
  }
}

export function TrialPlanPicker({
  plans,
  value,
  onChange,
  disabled = false,
  errorKey,
  noticeKey,
}: TrialPlanPickerProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const unlimitedLabel = t('tenant:common.unlimited');

  // A plan whose response predates `family` is a standard plan.
  const groups = FAMILY_ORDER.map((family) => ({
    family,
    plans: plans.filter((plan) => (plan.family ?? 'normal') === family),
  })).filter((group) => group.plans.length > 0);
  const showFamilyHeadings = groups.length > 1;

  return (
    <fieldset className="space-y-4" aria-describedby="trial-plan-description">
      <legend className="font-display text-sm font-semibold text-foreground">
        {t('auth:register.plan.title')}
      </legend>
      <p
        id="trial-plan-description"
        className="-mt-3 text-sm text-muted-foreground"
      >
        {t('auth:register.plan.description')}
      </p>

      {noticeKey ? (
        <p
          role="status"
          data-testid="trial-plan-notice"
          className="rounded-md border border-warning/40 bg-warning-surface px-3 py-2 text-sm text-foreground"
        >
          {t(noticeKey)}
        </p>
      ) : null}

      <RadioGroup
        value={value ?? ''}
        onValueChange={onChange}
        disabled={disabled}
        aria-label={t('auth:register.plan.title')}
        aria-invalid={!!errorKey}
        className="gap-5"
      >
        {groups.map((group) => (
          <div key={group.family} className="space-y-2.5">
            {showFamilyHeadings ? (
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(
                    group.family === 'premium'
                      ? 'auth:register.plan.familyPremium'
                      : 'auth:register.plan.familyNormal'
                  )}
                </p>
                {group.family === 'premium' ? (
                  <p className="text-xs text-muted-foreground">
                    {t('auth:register.plan.familyPremiumHint')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {group.plans.map((plan) => {
              const isSelected = plan.id === value;
              const itemId = `trial-plan-${plan.id}`;
              const name = resolvePlanName(plan, language);
              return (
                <Label
                  key={plan.id}
                  htmlFor={itemId}
                  data-testid={`trial-plan-${plan.key}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors',
                    isSelected
                      ? 'border-primary bg-accent/40'
                      : 'border-border hover:border-primary/50',
                    disabled && 'cursor-not-allowed opacity-60'
                  )}
                >
                  <RadioGroupItem
                    id={itemId}
                    value={plan.id}
                    aria-label={name}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-baseline gap-2">
                        {/* Business content that may be in either language. */}
                        <span
                          className="font-display text-sm font-semibold text-foreground"
                          dir="auto"
                        >
                          {name}
                        </span>
                        {plan.tier ? (
                          <span className="text-xs text-muted-foreground">
                            {t(`auth:register.plan.tier.${plan.tier}`)}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check
                          className="size-4 shrink-0 text-primary"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : null}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {KEY_LIMITS.map((limitKey) => (
                        <span key={limitKey} className="me-3 inline-block">
                          {t(`tenant:common.limits.${limitKey}`)}{' '}
                          <span
                            className="font-medium text-foreground"
                            data-atlas-numeric="true"
                          >
                            {formatLimitValue(
                              plan.limits[limitKey],
                              false,
                              unlimitedLabel
                            )}
                          </span>
                        </span>
                      ))}
                    </span>

                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="font-medium text-primary">
                        {plan.trialDurationDays
                          ? t('auth:register.plan.trialDays', {
                              count: plan.trialDurationDays,
                            })
                          : t('auth:register.plan.freeTrial')}
                      </span>
                      <span className="text-muted-foreground" aria-hidden>
                        ·
                      </span>
                      <span className="text-muted-foreground">
                        {t('auth:register.plan.noCard')}
                      </span>
                      <span className="text-muted-foreground" aria-hidden>
                        ·
                      </span>
                      <span className="text-muted-foreground">
                        {formatPriceAfterTrial(plan, language, t)}
                      </span>
                    </span>
                  </span>
                </Label>
              );
            })}
          </div>
        ))}
      </RadioGroup>

      {errorKey ? (
        <p className="text-sm text-destructive">{t(errorKey)}</p>
      ) : null}
    </fieldset>
  );
}
