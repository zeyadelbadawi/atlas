/**
 * A pricing section's plans (CMS phase 3d, field kind `plans`).
 *
 * Built like the section buttons list (`SectionButtonsEditor`): each plan is
 * a collapsed row — its name and price, a "Most popular" tag, and whether it
 * needs a fix — that opens to edit, so four plans never become one endless
 * form. Moving uses buttons (keyboard and touch), every control is at least
 * 44px, and a problem inside a closed plan opens it so the field to fix is
 * on screen.
 *
 * Inside a plan: its name, price and period in both languages, a short
 * description, the features (each with an "included" tick — ✓ or ✗ on the
 * site), the "most popular" choice and its badge, and one button with the
 * same destinations as any section button (`CtaFieldEditor`). Only one plan
 * can be the most popular: choosing it clears the others.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@utils';
import type {
  LocalizedText,
  PricingPlan,
  PricingPlanFeature,
  WebsiteCta,
  WebsitePage,
} from '@types';
import {
  MAX_PRICING_BADGE_LENGTH,
  MAX_PRICING_FEATURE_LENGTH,
  MAX_PRICING_FEATURES,
  MAX_PRICING_PERIOD_LENGTH,
  MAX_PRICING_PLAN_DESCRIPTION_LENGTH,
  MAX_PRICING_PLAN_NAME_LENGTH,
  MAX_PRICING_PLANS,
  MAX_PRICING_PRICE_LENGTH,
  MIN_PRICING_PLANS,
} from '../constants/website.constants';
import {
  EMPTY_LOCALIZED_TEXT,
  resolveLocalizedText,
} from '../utils/localized-text.utils';
import { LocalizedTextField } from './LocalizedTextField';
import {
  CtaFieldEditor,
  localizedErrors,
  type FieldErrorLookup,
} from './SectionButtonsEditor';

/** A plan as the editor holds it (a draft may be incomplete). */
type DraftPlan = Partial<PricingPlan> & { readonly id: string };

const TEXT_FIELDS = [
  { key: 'name', max: MAX_PRICING_PLAN_NAME_LENGTH, required: true },
  { key: 'price', max: MAX_PRICING_PRICE_LENGTH, required: true },
  { key: 'period', max: MAX_PRICING_PERIOD_LENGTH },
  { key: 'description', max: MAX_PRICING_PLAN_DESCRIPTION_LENGTH },
] as const;

/** The label each part of a plan shows as, in the form's summary. */
const PART_LABELS: Readonly<Record<string, string>> = {
  name: 'website:sectionEditors.plans.name',
  price: 'website:sectionEditors.plans.price',
  period: 'website:sectionEditors.plans.period',
  description: 'website:sectionEditors.plans.description',
  badge: 'website:sectionEditors.plans.badge',
  features: 'website:sectionEditors.plans.featureLabel',
  cta: 'website:sectionEditors.plans.button',
};

const PART_LIMITS: Readonly<Record<string, number>> = {
  name: MAX_PRICING_PLAN_NAME_LENGTH,
  price: MAX_PRICING_PRICE_LENGTH,
  period: MAX_PRICING_PERIOD_LENGTH,
  description: MAX_PRICING_PLAN_DESCRIPTION_LENGTH,
  badge: MAX_PRICING_BADGE_LENGTH,
  features: MAX_PRICING_FEATURE_LENGTH,
};

/**
 * Which plan (and part of it) an issue path under `plans` names, for the
 * form's summary: `0.features.2.text` → "Plan 1 · Feature".
 */
export function resolvePlanIssue(rest: readonly string[]): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly maxLength?: number;
} {
  const [index, part] = rest;
  const number = Number(index);
  if (!Number.isInteger(number)) {
    return { labelKeys: ['website:fields.pricingPlans'] };
  }
  const partLabel = part ? PART_LABELS[part] : undefined;
  return {
    labelKeys: partLabel
      ? ['website:sectionEditors.plans.plan', partLabel]
      : ['website:sectionEditors.plans.plan'],
    itemNumber: number + 1,
    maxLength: part ? PART_LIMITS[part] : undefined,
  };
}

/** Every path inside one plan that can carry a problem. */
function planIssuePaths(plan: DraftPlan, index: number): string[] {
  const base = `plans.${index}`;
  const localized = (path: string) => [`${path}.en`, `${path}.ar`];
  return [
    ...TEXT_FIELDS.flatMap(({ key }) => localized(`${base}.${key}`)),
    ...localized(`${base}.badge`),
    ...(plan.features ?? []).flatMap((_, featureIndex) =>
      localized(`${base}.features.${featureIndex}.text`)
    ),
    ...localized(`${base}.cta.label`),
    ...localized(`${base}.cta.whatsappMessage`),
    `${base}.cta.url`,
    `${base}.cta.whatsapp`,
    `${base}.cta.phone`,
  ];
}

function newPlan(): DraftPlan {
  return {
    id: crypto.randomUUID(),
    name: EMPTY_LOCALIZED_TEXT,
    price: EMPTY_LOCALIZED_TEXT,
    features: [],
  };
}

export function PricingPlansEditor({
  labelKey,
  value,
  onChange,
  errorFor,
  pages,
  academyId,
}: {
  readonly labelKey: string;
  readonly value: readonly DraftPlan[] | undefined;
  readonly onChange: (next: DraftPlan[]) => void;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const plans = value ?? [];
  const [open, setOpen] = useState<number | null>(() =>
    plans.length === 1 ? 0 : null
  );
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const issueAt = (index: number) =>
    planIssuePaths(plans[index]!, index).some(
      (path) => !!errorFor(path, labelKey)
    );
  const firstIssue = plans.findIndex((_, index) => issueAt(index));
  useEffect(() => {
    if (firstIssue !== -1) setOpen(firstIssue);
  }, [firstIssue]);

  const write = (next: DraftPlan[]) => onChange(next);
  const update = (index: number, patch: Partial<PricingPlan>) =>
    write(
      plans.map((plan, position) =>
        position === index ? { ...plan, ...patch } : plan
      )
    );

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= plans.length) return;
    const next = [...plans];
    [next[index], next[target]] = [next[target]!, next[index]!];
    write(next);
    if (open === index) setOpen(target);
    else if (open === target) setOpen(index);
  };

  const setHighlighted = (index: number, highlighted: boolean) =>
    write(
      plans.map((plan, position) => {
        if (position === index) return { ...plan, highlighted };
        if (!highlighted || !plan.highlighted) return plan;
        const rest = { ...plan };
        delete rest.highlighted;
        return rest;
      })
    );

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-md border border-border p-3"
      data-testid="pricing-plans"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="text-sm font-medium text-foreground">
          {t(labelKey)}
        </h3>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t('website:sectionEditors.plans.count', {
            count: plans.length,
            max: MAX_PRICING_PLANS,
          })}
        </p>
      </div>

      <ol className="space-y-2">
        {plans.map((plan, index) => {
          const isOpen = open === index;
          const regionId = `${headingId}-plan-${index}`;
          const name =
            resolveLocalizedText(plan.name, locale).trim() ||
            t('website:sectionEditors.plans.untitled', { number: index + 1 });
          const price = [
            resolveLocalizedText(plan.price, locale),
            resolveLocalizedText(plan.period, locale),
          ]
            .filter(Boolean)
            .join(' · ');
          const hasIssue = issueAt(index);
          return (
            <li
              key={plan.id}
              data-plan-index={index}
              className={cn(
                'rounded-md border bg-card',
                hasIssue ? 'border-destructive/60' : 'border-border'
              )}
            >
              <div className="flex items-center gap-1 p-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={regionId}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
                      isOpen && 'rotate-180'
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {name}
                    </span>
                    {plan.highlighted ? (
                      <span className="mt-0.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-medium text-primary">
                        {t('website:sectionEditors.plans.popularTag')}
                      </span>
                    ) : null}
                    {hasIssue ? (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle
                          aria-hidden
                          className="size-3.5 shrink-0"
                        />
                        {t('website:sectionEditors.plans.needsAttention')}
                      </span>
                    ) : price ? (
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        dir="auto"
                      >
                        {price}
                      </span>
                    ) : null}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t('website:sectionEditors.plans.moveUp', {
                    name,
                  })}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={index === plans.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t('website:sectionEditors.plans.moveDown', {
                    name,
                  })}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={plans.length <= MIN_PRICING_PLANS}
                  onClick={() => {
                    write(plans.filter((_, position) => position !== index));
                    setOpen(null);
                  }}
                  aria-label={t('website:sectionEditors.plans.remove', {
                    name,
                  })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {isOpen ? (
                <div
                  id={regionId}
                  className="space-y-4 border-t border-border p-3"
                >
                  <PlanFields
                    plan={plan}
                    index={index}
                    errorFor={errorFor}
                    pages={pages}
                    academyId={academyId}
                    onChange={(patch) => update(index, patch)}
                    onHighlight={(next) => setHighlighted(index, next)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {plans.length <= MIN_PRICING_PLANS ? (
        <p className="text-xs text-muted-foreground">
          {t('website:sectionEditors.plans.minimum')}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full border-dashed"
        disabled={plans.length >= MAX_PRICING_PLANS}
        onClick={() => {
          write([...plans, newPlan()]);
          setOpen(plans.length);
        }}
        data-testid="pricing-plans-add"
      >
        <Plus className="size-4" aria-hidden />
        {plans.length >= MAX_PRICING_PLANS
          ? t('website:sectionEditors.plans.full', { max: MAX_PRICING_PLANS })
          : t('website:sectionEditors.plans.add')}
      </Button>
    </section>
  );
}

const HINTS: Partial<Record<(typeof TEXT_FIELDS)[number]['key'], string>> = {
  price: 'website:sectionEditors.plans.priceHint',
  period: 'website:sectionEditors.plans.periodHint',
};

/** The inside of one open plan. */
function PlanFields({
  plan,
  index,
  errorFor,
  pages,
  academyId,
  onChange,
  onHighlight,
}: {
  readonly plan: DraftPlan;
  readonly index: number;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
  readonly onChange: (patch: Partial<PricingPlan>) => void;
  readonly onHighlight: (highlighted: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const base = `plans.${index}`;
  const fieldId = (key: string) => `pricing-plan-${index}-${key}`;
  const highlightId = useId();
  const features = plan.features ?? [];

  const setFeatures = (next: PricingPlanFeature[]) =>
    onChange({ features: next });

  return (
    <>
      {TEXT_FIELDS.map(({ key, max, ...rest }) => {
        const labelKey = `website:sectionEditors.plans.${key}`;
        const hint = HINTS[key];
        return (
          <div key={key} className="space-y-1">
            <LocalizedTextField
              id={fieldId(key)}
              labelKey={labelKey}
              value={plan[key] as Partial<LocalizedText> | undefined}
              onChange={(next) => onChange({ [key]: next })}
              multiline={key === 'description'}
              required={'required' in rest}
              maxLength={max}
              errors={localizedErrors(
                errorFor,
                `${base}.${key}`,
                labelKey,
                max
              )}
            />
            {hint ? (
              <p className="text-xs text-muted-foreground">{t(hint)}</p>
            ) : null}
          </div>
        );
      })}

      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">
          {t('website:sectionEditors.plans.features')}
          <span className="ms-2 text-xs font-normal tabular-nums text-muted-foreground">
            {t('website:sectionEditors.plans.featuresCount', {
              count: features.length,
              max: MAX_PRICING_FEATURES,
            })}
          </span>
        </legend>
        {features.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('website:sectionEditors.plans.featureIncludedHint')}
          </p>
        ) : null}
        <ol className="space-y-3">
          {features.map((feature, featureIndex) => {
            const labelKey = 'website:sectionEditors.plans.feature';
            const number = featureIndex + 1;
            const includedId = `${fieldId('feature')}-${featureIndex}-included`;
            const replace = (patch: Partial<PricingPlanFeature>) =>
              setFeatures(
                features.map((candidate, position) =>
                  position === featureIndex
                    ? { ...candidate, ...patch }
                    : candidate
                )
              );
            return (
              <li
                key={feature.id}
                className="space-y-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <LocalizedTextField
                  id={`${fieldId('feature')}-${featureIndex}`}
                  labelKey={t(labelKey, { number })}
                  value={feature.text}
                  onChange={(text) => replace({ text })}
                  required
                  maxLength={MAX_PRICING_FEATURE_LENGTH}
                  errors={localizedErrors(
                    errorFor,
                    `${base}.features.${featureIndex}.text`,
                    'website:sectionEditors.plans.featureLabel',
                    MAX_PRICING_FEATURE_LENGTH
                  )}
                />
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={includedId}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={includedId}
                      checked={feature.included !== false}
                      onCheckedChange={(checked) =>
                        replace({ included: checked === true })
                      }
                    />
                    {t('website:sectionEditors.plans.featureIncluded')}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setFeatures(
                        features.filter(
                          (_, position) => position !== featureIndex
                        )
                      )
                    }
                    aria-label={t(
                      'website:sectionEditors.plans.removeFeature',
                      {
                        number,
                      }
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 w-full border-dashed"
          disabled={features.length >= MAX_PRICING_FEATURES}
          onClick={() =>
            setFeatures([
              ...features,
              {
                id: crypto.randomUUID(),
                text: EMPTY_LOCALIZED_TEXT,
                included: true,
              },
            ])
          }
        >
          <Plus className="size-4" aria-hidden />
          {features.length >= MAX_PRICING_FEATURES
            ? t('website:sectionEditors.plans.featuresFull', {
                max: MAX_PRICING_FEATURES,
              })
            : t('website:sectionEditors.plans.addFeature')}
        </Button>
      </fieldset>

      <div className="space-y-1">
        <label
          htmlFor={highlightId}
          className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"
        >
          <Checkbox
            id={highlightId}
            checked={plan.highlighted === true}
            onCheckedChange={(checked) => onHighlight(checked === true)}
            aria-describedby={`${highlightId}-hint`}
          />
          {t('website:sectionEditors.plans.highlighted')}
        </label>
        <p id={`${highlightId}-hint`} className="text-xs text-muted-foreground">
          {t('website:sectionEditors.plans.highlightedHint')}
        </p>
      </div>
      {plan.highlighted ? (
        <div className="space-y-1">
          <LocalizedTextField
            id={fieldId('badge')}
            labelKey="website:sectionEditors.plans.badge"
            value={plan.badge}
            onChange={(badge) => onChange({ badge })}
            maxLength={MAX_PRICING_BADGE_LENGTH}
            errors={localizedErrors(
              errorFor,
              `${base}.badge`,
              'website:sectionEditors.plans.badge',
              MAX_PRICING_BADGE_LENGTH
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t('website:sectionEditors.plans.badgeHint')}
          </p>
        </div>
      ) : null}

      {plan.cta ? (
        <div className="space-y-2">
          <CtaFieldEditor
            labelKey="website:sectionEditors.plans.button"
            path={`${base}.cta`}
            errorFor={errorFor}
            pages={pages}
            academyId={academyId}
            value={plan.cta}
            onChange={(next) =>
              onChange({
                cta: {
                  ...(next ?? {}),
                  label: next?.label ?? EMPTY_LOCALIZED_TEXT,
                } as WebsiteCta,
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onChange({ cta: undefined })}
          >
            <Trash2 className="size-4" aria-hidden />
            {t('website:sectionEditors.plans.removeButton')}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full border-dashed"
          onClick={() => onChange({ cta: { label: EMPTY_LOCALIZED_TEXT } })}
        >
          <Plus className="size-4" aria-hidden />
          {t('website:sectionEditors.plans.addButton')}
        </Button>
      )}
    </>
  );
}
