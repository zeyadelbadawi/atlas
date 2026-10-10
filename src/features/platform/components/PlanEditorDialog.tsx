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
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { useDateFormatter } from '@hooks';
import { formatNumber } from '@utils';
import { PLAN_FEATURE_KEYS, PLAN_LIMIT_KEYS } from '@features/tenant';
import {
  usePreviewLimitImpact,
  useUpdatePlan,
} from '../hooks/usePlatformPlans';
import {
  UNLIMITED,
  draftToLimits,
  withUneditedLimits,
  findReducedLimitKeys,
  isCompleteDraft,
  limitsToDraft,
} from '../utils/plan-limit-changes.utils';
import type { LimitDraft } from '../utils/plan-limit-changes.utils';
import {
  DEFAULT_MONTHLY_EMAILS,
  isValidMonthlyEmailsInput,
  withMonthlyEmails,
} from '../utils/monthly-emails.utils';
import {
  GIFTED_DAYS_MAX,
  GIFTED_DAYS_MIN,
  giftedDaysInputToPayload,
  giftedDaysToInput,
  isValidGiftedDaysInput,
} from '../utils/gifted-days.utils';
import type { LanguageCode, Plan, PlanFeatures, PlanLimitImpact } from '@types';

/** The backend's ceiling for `pricing.yearlyAmount` (`PlanPricingDto`). */
const MAX_YEARLY_AMOUNT = 10_000_000;

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

/** Empty (no yearly option) or a whole number from 0 to the ceiling. */
function isValidYearlyAmount(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return /^\d+$/.test(trimmed) && Number(trimmed) <= MAX_YEARLY_AMOUNT;
}

export interface PlanEditorDialogProps {
  readonly plan: Plan | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function PlanEditorDialog({
  plan,
  onOpenChange,
}: PlanEditorDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const updatePlan = useUpdatePlan();
  const previewImpact = usePreviewLimitImpact();

  const [limits, setLimits] = useState<LimitDraft>({});
  const [features, setFeatures] = useState<PlanFeatures>(() =>
    pickPlanFeatures({})
  );
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [yearlyAmount, setYearlyAmount] = useState('');
  const [trialEligible, setTrialEligible] = useState(false);
  const [trialDays, setTrialDays] = useState('');
  const [giftedMonthly, setGiftedMonthly] = useState('');
  const [giftedYearly, setGiftedYearly] = useState('');
  // W3-compose — optional per-academy monthly email allowance. Blank keeps
  // the platform default (50); a number or `unlimited` is saved as is.
  const [monthlyEmails, setMonthlyEmails] = useState('');
  const [impact, setImpact] = useState<PlanLimitImpact | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Re-seed whenever a different plan is opened; a stale draft would carry
  // one plan's limits into another's editor.
  useEffect(() => {
    if (!plan) return;
    setLimits(limitsToDraft(plan.limits, PLAN_LIMIT_KEYS));
    setMonthlyEmails(
      plan.limits.monthlyEmails === undefined
        ? ''
        : String(plan.limits.monthlyEmails)
    );
    setFeatures(pickPlanFeatures(plan.features));
    setAmount(
      plan.pricing?.amount !== undefined ? String(plan.pricing.amount) : ''
    );
    setCurrency(plan.pricing?.currency ?? 'EGP');
    setYearlyAmount(
      plan.pricing?.yearlyAmount !== undefined
        ? String(plan.pricing.yearlyAmount)
        : ''
    );
    setTrialEligible(plan.trialEligible);
    setTrialDays(plan.trialDurationDays ? String(plan.trialDurationDays) : '');
    setGiftedMonthly(giftedDaysToInput(plan.giftedDaysMonthly));
    setGiftedYearly(giftedDaysToInput(plan.giftedDaysYearly));
    setImpact(null);
    setConfirmed(false);
  }, [plan]);

  /** Which limits the draft LOWERS — the only ones worth an impact check. */
  const reducedLimitKeys = useMemo(
    () =>
      plan
        ? findReducedLimitKeys(
            plan.limits,
            draftToLimits(limits, PLAN_LIMIT_KEYS),
            PLAN_LIMIT_KEYS
          )
        : [],
    [plan, limits]
  );

  // A blank or non-numeric limit must not be saveable: it reaches the API
  // as null and, before `draftToLimits` returned NaN for it, reached the
  // database as a real limit of 0.
  const isComplete = useMemo(
    () => isCompleteDraft(limits, PLAN_LIMIT_KEYS),
    [limits]
  );

  // A yearly price is offered only beside a MONTHLY price — a plan priced
  // per year has no second price to add.
  const billingCycle = plan?.pricing?.billingCycle ?? 'monthly';
  const offersYearlyPrice = billingCycle === 'monthly';
  const yearlyAmountValid =
    !offersYearlyPrice || isValidYearlyAmount(yearlyAmount);

  // W8 — blank/0 (no gift) or 5..15. The server enforces the same range.
  const giftedMonthlyValid = isValidGiftedDaysInput(giftedMonthly);
  const giftedYearlyValid = isValidGiftedDaysInput(giftedYearly);
  const giftedValid = giftedMonthlyValid && giftedYearlyValid;

  const monthlyEmailsValid = isValidMonthlyEmailsInput(monthlyEmails);

  const hasReduction = reducedLimitKeys.length > 0;
  // A reduction must be checked and then explicitly confirmed. Everything
  // else saves directly.
  const needsConfirmation = hasReduction && !confirmed;

  const handleCheckImpact = async (): Promise<void> => {
    if (!plan) return;
    const result = await previewImpact.mutateAsync({
      key: plan.key,
      limits: draftToLimits(limits, PLAN_LIMIT_KEYS),
    });
    setImpact(result);
  };

  const handleSave = async (): Promise<void> => {
    if (!plan) return;
    await updatePlan.mutateAsync({
      key: plan.key,
      payload: {
        expectedVersion: plan.version,
        limits: withMonthlyEmails(
          withUneditedLimits(
            draftToLimits(limits, PLAN_LIMIT_KEYS),
            plan.limits,
            PLAN_LIMIT_KEYS,
            ['monthlyEmails']
          ),
          monthlyEmails
        ),
        features: pickPlanFeatures(features),
        pricing: amount
          ? {
              amount: Number(amount),
              currency: currency.toUpperCase(),
              billingCycle,
              // Omitted when empty: the plan then has no yearly option.
              ...(offersYearlyPrice && yearlyAmount.trim() !== ''
                ? { yearlyAmount: Number(yearlyAmount.trim()) }
                : {}),
            }
          : undefined,
        trialEligible,
        // Empty means "fall back to the platform default", which the
        // backend expresses as null — not 0, which would mean a zero-day
        // trial.
        trialDurationDays: trialDays ? Number(trialDays) : null,
        giftedDaysMonthly: giftedDaysInputToPayload(giftedMonthly),
        giftedDaysYearly: giftedDaysInputToPayload(giftedYearly),
      },
    });
    onOpenChange(false);
  };

  const isStale = updatePlan.error?.kind === 'conflict';

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle dir="auto">
            {t('platform:planAdmin.editor.title', { plan: plan?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {t('platform:planAdmin.editor.description')}
          </DialogDescription>
        </DialogHeader>

        {isStale ? (
          <Alert variant="destructive">
            <AlertTitle>{t('platform:planAdmin.editor.staleTitle')}</AlertTitle>
            <AlertDescription>
              {t('platform:planAdmin.editor.staleDescription')}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-6">
          {/* ---------- pricing ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.pricingTitle')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-amount">
                  {t('platform:planAdmin.editor.amount')}
                </Label>
                <Input
                  id="plan-amount"
                  data-testid="plan-amount"
                  inputMode="numeric"
                  dir="ltr"
                  data-ltr-content
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-currency">
                  {t('platform:planAdmin.editor.currency')}
                </Label>
                <Input
                  id="plan-currency"
                  data-testid="plan-currency"
                  dir="ltr"
                  data-ltr-content
                  maxLength={3}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </div>
            </div>
            {offersYearlyPrice ? (
              <div className="space-y-1.5">
                <Label htmlFor="plan-yearly-amount">
                  {t('platform:planAdmin.editor.yearlyAmount')}
                </Label>
                <Input
                  id="plan-yearly-amount"
                  data-testid="plan-yearly-amount"
                  inputMode="numeric"
                  dir="ltr"
                  data-ltr-content
                  aria-invalid={!yearlyAmountValid}
                  aria-describedby="plan-yearly-amount-help"
                  value={yearlyAmount}
                  onChange={(event) => setYearlyAmount(event.target.value)}
                />
                <p
                  id="plan-yearly-amount-help"
                  className="text-xs text-muted-foreground"
                >
                  {t('platform:planAdmin.editor.yearlyAmountHelp')}
                </p>
                {!yearlyAmountValid ? (
                  <p
                    className="text-sm font-medium text-destructive"
                    data-testid="plan-yearly-amount-error"
                  >
                    {t('platform:planAdmin.editor.yearlyAmountInvalid', {
                      max: formatNumber(
                        MAX_YEARLY_AMOUNT,
                        i18n.language as LanguageCode
                      ),
                    })}
                  </p>
                ) : null}
              </div>
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
                checked={trialEligible}
                onCheckedChange={setTrialEligible}
              />
            </div>
            {trialEligible ? (
              <div className="space-y-1.5">
                <Label htmlFor="plan-trial-days">
                  {t('platform:planAdmin.editor.trialDays')}
                </Label>
                <Input
                  id="plan-trial-days"
                  data-testid="plan-trial-days"
                  inputMode="numeric"
                  dir="ltr"
                  data-ltr-content
                  placeholder={t(
                    'platform:planAdmin.editor.trialDaysPlaceholder'
                  )}
                  value={trialDays}
                  onChange={(event) => setTrialDays(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('platform:planAdmin.editor.trialDaysHelp')}
                </p>
              </div>
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
                    label: 'giftMonthly',
                    help: 'giftMonthlyHelp',
                    value: giftedMonthly,
                    set: setGiftedMonthly,
                    valid: giftedMonthlyValid,
                  },
                  {
                    id: 'plan-gifted-yearly',
                    label: 'giftYearly',
                    help: 'giftYearlyHelp',
                    value: giftedYearly,
                    set: setGiftedYearly,
                    valid: giftedYearlyValid,
                  },
                ] as const
              ).map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={field.id}>
                    {t(`platform:planAdmin.editor.${field.label}`)}
                  </Label>
                  <Input
                    id={field.id}
                    data-testid={field.id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={GIFTED_DAYS_MAX}
                    step={1}
                    dir="ltr"
                    data-ltr-content
                    placeholder={t('platform:planAdmin.editor.giftPlaceholder')}
                    aria-invalid={!field.valid}
                    aria-describedby={`${field.id}-help${field.valid ? '' : ` ${field.id}-error`}`}
                    value={field.value}
                    onChange={(event) => field.set(event.target.value)}
                  />
                  <p
                    id={`${field.id}-help`}
                    className="text-xs text-muted-foreground"
                  >
                    {t(`platform:planAdmin.editor.${field.help}`)}
                  </p>
                  {!field.valid ? (
                    <p
                      id={`${field.id}-error`}
                      role="alert"
                      className="text-sm font-medium text-destructive"
                      data-testid={`${field.id}-error`}
                    >
                      {t('platform:planAdmin.editor.giftInvalid', {
                        min: formatNumber(
                          GIFTED_DAYS_MIN,
                          i18n.language as LanguageCode
                        ),
                        max: formatNumber(
                          GIFTED_DAYS_MAX,
                          i18n.language as LanguageCode
                        ),
                      })}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {/* ---------- limits ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.limitsTitle')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLAN_LIMIT_KEYS.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`plan-limit-${key}`}>
                    {t(`tenant:common.limits.${key}`)}
                  </Label>
                  <Input
                    id={`plan-limit-${key}`}
                    data-testid={`plan-limit-${key}`}
                    dir="ltr"
                    data-ltr-content
                    value={limits[key] ?? ''}
                    onChange={(event) => {
                      setLimits((prev) => ({
                        ...prev,
                        [key]: event.target.value,
                      }));
                      // Any limit edit invalidates a previous impact check.
                      setImpact(null);
                      setConfirmed(false);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('platform:planAdmin.editor.limitsHelp')}
            </p>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="plan-limit-monthlyEmails">
                {t('platform:planAdmin.editor.monthlyEmails')}
              </Label>
              <Input
                id="plan-limit-monthlyEmails"
                data-testid="plan-limit-monthlyEmails"
                dir="ltr"
                data-ltr-content
                inputMode="numeric"
                placeholder={String(DEFAULT_MONTHLY_EMAILS)}
                value={monthlyEmails}
                aria-invalid={!monthlyEmailsValid}
                aria-describedby="plan-limit-monthlyEmails-help"
                onChange={(event) => setMonthlyEmails(event.target.value)}
              />
              <p
                id="plan-limit-monthlyEmails-help"
                className={
                  monthlyEmailsValid
                    ? 'text-xs text-muted-foreground'
                    : 'text-xs text-destructive'
                }
              >
                {t('platform:planAdmin.editor.monthlyEmailsHelp', {
                  count: DEFAULT_MONTHLY_EMAILS,
                })}
              </p>
            </div>
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
                    checked={!!features[key]}
                    onCheckedChange={(checked) =>
                      setFeatures((prev) => ({ ...prev, [key]: checked }))
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
                            <li
                              key={`${row.organizationId}-${row.limitKey}`}
                              dir="auto"
                            >
                              {row.organizationName} —{' '}
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
                      <p className="text-xs">
                        {t('platform:planAdmin.editor.impactUnmeasurable', {
                          keys: impact.unmeasurableLimitKeys.join(', '),
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
        </div>

        {!isComplete ? (
          <Alert variant="destructive" data-testid="plan-incomplete-limits">
            <AlertDescription>
              {t('platform:planAdmin.editor.incompleteLimits')}
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={updatePlan.isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            data-testid="plan-save"
            disabled={
              updatePlan.isPending ||
              needsConfirmation ||
              !isComplete ||
              !yearlyAmountValid ||
              !giftedValid ||
              !monthlyEmailsValid
            }
            onClick={() => void handleSave()}
          >
            {updatePlan.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
