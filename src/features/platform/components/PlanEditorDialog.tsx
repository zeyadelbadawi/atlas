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
import { PLAN_FEATURE_KEYS, PLAN_LIMIT_KEYS } from '@features/tenant';
import { usePreviewLimitImpact, useUpdatePlan } from '../hooks/usePlatformPlans';
import {
  UNLIMITED,
  draftToLimits,
  findReducedLimitKeys,
  isCompleteDraft,
  limitsToDraft,
} from '../utils/plan-limit-changes.utils';
import type { LimitDraft } from '../utils/plan-limit-changes.utils';
import type { Plan, PlanLimitImpact } from '@types';

export interface PlanEditorDialogProps {
  readonly plan: Plan | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function PlanEditorDialog({
  plan,
  onOpenChange,
}: PlanEditorDialogProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const updatePlan = useUpdatePlan();
  const previewImpact = usePreviewLimitImpact();

  const [limits, setLimits] = useState<LimitDraft>({});
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [trialEligible, setTrialEligible] = useState(false);
  const [trialDays, setTrialDays] = useState('');
  const [impact, setImpact] = useState<PlanLimitImpact | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Re-seed whenever a different plan is opened; a stale draft would carry
  // one plan's limits into another's editor.
  useEffect(() => {
    if (!plan) return;
    setLimits(limitsToDraft(plan.limits, PLAN_LIMIT_KEYS));
    setFeatures({ ...(plan.features as unknown as Record<string, boolean>) });
    setAmount(plan.pricing?.amount !== undefined ? String(plan.pricing.amount) : '');
    setCurrency(plan.pricing?.currency ?? 'USD');
    setTrialEligible(plan.trialEligible);
    setTrialDays(plan.trialDurationDays ? String(plan.trialDurationDays) : '');
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
        limits: draftToLimits(limits, PLAN_LIMIT_KEYS),
        features: features as never,
        pricing: amount
          ? {
              amount: Number(amount),
              currency: currency.toUpperCase(),
              billingCycle: plan.pricing?.billingCycle ?? 'monthly',
            }
          : undefined,
        trialEligible,
        // Empty means "fall back to the platform default", which the
        // backend expresses as null — not 0, which would mean a zero-day
        // trial.
        trialDurationDays: trialDays ? Number(trialDays) : null,
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
                  maxLength={3}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </div>
            </div>
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
                  placeholder={t('platform:planAdmin.editor.trialDaysPlaceholder')}
                  value={trialDays}
                  onChange={(event) => setTrialDays(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('platform:planAdmin.editor.trialDaysHelp')}
                </p>
              </div>
            ) : null}
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
                    value={limits[key] ?? ''}
                    onChange={(event) => {
                      setLimits((prev) => ({ ...prev, [key]: event.target.value }));
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
          </section>

          {/* ---------- features ---------- */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {t('platform:planAdmin.editor.featuresTitle')}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLAN_FEATURE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`plan-feature-${key}`} className="text-sm font-normal">
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
                              <span dir="ltr">
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
                      <span>{t('platform:planAdmin.editor.confirmReduction')}</span>
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
            disabled={updatePlan.isPending || needsConfirmation || !isComplete}
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
