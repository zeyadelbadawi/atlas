/**
 * W8 — gifted setup days on the public marketing site.
 *
 * Every number shown here comes from the plan catalog (`GET /public/plans` →
 * `giftedDaysMonthly` / `giftedDaysYearly`), per billing cycle the plan can
 * actually be bought at. A plan or cycle without a gift renders nothing —
 * the offer is never presented as universal, and no day count is ever
 * hardcoded.
 *
 * Same visual language as the signed-in `PlanGiftOffer` /
 * `SubscriptionGiftDetails` (W8): a `Gift` icon in `text-primary`, a
 * medium-weight line and muted detail. Those components cannot be reused
 * directly: they answer "is the gift still available to THIS customer"
 * (`lifecycle.giftAvailable`), which an anonymous visitor does not have.
 *
 * DISPLAY ONLY. The backend decides every grant at payment approval.
 */
import { Check, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { planCycleGifts } from '@utils';
import type { Plan } from '@types';
import { MarketingSection } from './MarketingSection';

type GiftPlan = Pick<
  Plan,
  'key' | 'giftedDaysMonthly' | 'giftedDaysYearly' | 'pricing'
>;

/** "Monthly billing: 7 days" lines for one plan, or `[]` when it has none. */
function usePlanGiftLines(plan: GiftPlan): readonly string[] {
  const { t } = useTranslation();
  return planCycleGifts(plan).map(({ cycle, days }) =>
    t(`pricing:gift.${cycle}`, { count: days })
  );
}

export interface PlanGiftedDaysProps {
  readonly plan: GiftPlan;
}

/** The per-plan note on a plan card. Renders nothing for a plan without a gift. */
export function PlanGiftedDays({
  plan,
}: PlanGiftedDaysProps): JSX.Element | null {
  const { t } = useTranslation();
  const lines = usePlanGiftLines(plan);
  if (lines.length === 0) return null;
  return (
    <div
      className="flex items-start gap-2.5 text-sm"
      data-testid={`marketing-plan-gift-${plan.key}`}
    >
      <Gift
        className="mt-0.5 size-4 shrink-0 text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {t('pricing:gift.cardTitle')}
        </p>
        {lines.map((line) => (
          <p key={line} className="text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** One comparison-table cell: the plan's gifted days per cycle, or an explicit "not included". */
export function PlanGiftedDaysCell({ plan }: PlanGiftedDaysProps): JSX.Element {
  const { t } = useTranslation();
  const lines = usePlanGiftLines(plan);
  if (lines.length === 0) {
    return (
      <>
        <span aria-hidden className="text-muted-foreground/60">
          —
        </span>
        <span className="sr-only">{t('pricing:comparison.notIncluded')}</span>
      </>
    );
  }
  return (
    <span className="block space-y-0.5 font-normal text-foreground">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}

const SECTION_POINTS = ['timing', 'amount', 'once', 'trial'] as const;

/**
 * "How gifted setup days work" — the conditions, in conditional wording
 * ("some plans include"). Shown only while at least one plan in the live
 * catalog offers a gift; the caller decides that with `planCatalogHasGifts` (`@utils`).
 */
export function GiftedDaysExplainer(): JSX.Element {
  const { t } = useTranslation();
  return (
    <MarketingSection divided compact aria-labelledby="pricing-gifted-days">
      <div
        className="grid gap-8 lg:grid-cols-12 lg:gap-16"
        data-testid="pricing-gifted-days"
      >
        <div className="flex flex-col gap-3 lg:col-span-5">
          <div className="flex items-center gap-2.5">
            <Gift
              className="size-5 shrink-0 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            <h2
              id="pricing-gifted-days"
              className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground rtl:tracking-normal"
            >
              {t('pricing:gift.section.title')}
            </h2>
          </div>
          <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('pricing:gift.section.lead')}
          </p>
        </div>
        <ul
          className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base lg:col-span-7"
          aria-label={t('pricing:gift.section.listLabel')}
        >
          {SECTION_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <Check
                className="mt-1 size-4 shrink-0 text-primary"
                strokeWidth={2}
                aria-hidden
              />
              <span>{t(`pricing:gift.section.${point}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </MarketingSection>
  );
}
