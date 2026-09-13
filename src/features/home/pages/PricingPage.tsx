/**
 * Public Pricing page — real Plan catalog (`GET /public/plans`), never invented
 * numbers. Choosing a plan while signed out routes into the real sign-up →
 * organization-creation → plan-selection journey (`useStartPlanFlow`) rather than
 * attempting checkout directly; the actual subscription/checkout logic is never
 * duplicated here.
 *
 * Design system: `design-system/atlas-marketing/MASTER.md`, shared with the home
 * and features pages through the `MarketingSection` primitives.
 *
 * Accessibility fix carried by this redesign: the comparison table previously
 * conveyed included-vs-excluded with an `aria-hidden` Check/Minus icon and no
 * text alternative, so every feature cell was announced as empty — a screen
 * reader user could not read the comparison at all. Each cell now carries an
 * `sr-only` label, and the table has a real caption plus `scope` on its headers.
 */
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState, EmptyState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { RISE_VARIANTS, createStaggerVariants } from '@motion';
import { usePublicPlans } from '../hooks/usePublicPlans';
import { useStartPlanFlow } from '../hooks/useStartPlanFlow';
import { formatPlanPrice } from '../utils/formatPlanPrice';
import {
  MarketingContainer,
  MarketingSection,
} from '../components/MarketingSection';
import launchReady from '../assets/launch-ready.webp';
import structureCalm from '../components/cinematic-hero/assets/structure-calm.webp';
import type { PlanFeatures } from '@types';

/** Order features are compared in — matches `PlanFeatures`' own real fields. */
const FEATURE_ROWS: readonly (keyof PlanFeatures)[] = [
  'cms',
  'themes',
  'multipleThemes',
  'customDomain',
  'seo',
  'seoAdvanced',
  'marketing',
  'marketingAdvanced',
  'analytics',
  'analyticsAdvanced',
  'backup',
];

const LIMIT_ROWS = [
  'academies',
  'students',
  'instructors',
  'staff',
  'courses',
  'generalStorage',
  'videoStorage',
] as const;

const STORAGE_LIMIT_KEYS = new Set(['generalStorage', 'videoStorage']);

function formatLimit(
  value: unknown,
  limitKey: string,
  t: (key: string) => string
): string {
  if (value === 'unlimited') return t('pricing:table.unlimited');
  if (typeof value === 'number') {
    return STORAGE_LIMIT_KEYS.has(limitKey)
      ? `${value} ${t('pricing:units.gb')}`
      : String(value);
  }
  return '—';
}

export default function PricingPage(): JSX.Element {
  const { t } = useTranslation();
  const plansQuery = usePublicPlans();
  const startPlanFlow = useStartPlanFlow();
  const plans = [...(plansQuery.data ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  const recommendedKey = plans[1]?.key;
  const stagger = createStaggerVariants(plans.length || 1);

  return (
    <>
      {/* ── Hero — this page's own visual identity: one calm, resolved
          structure, ready to launch. Distinct from the homepage's
          transformation video and the features page's "modules connecting"
          motif. ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <span
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-surface to-background"
          aria-hidden
        />
        <MarketingContainer className="py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={RISE_VARIANTS}
              className="flex flex-col gap-5 lg:col-span-7"
            >
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground rtl:tracking-normal">
                {t('pricing:page.eyebrow')}
              </span>
              <h1 className="max-w-[22ch] text-balance font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl rtl:leading-[1.5] rtl:tracking-normal">
                {t('pricing:page.title')}
              </h1>
              <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('pricing:page.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:col-span-5 lg:block"
            >
              <img
                src={launchReady}
                alt=""
                className="mx-auto h-auto w-full max-w-[300px]"
                aria-hidden
              />
            </motion.div>
          </div>
        </MarketingContainer>
      </section>

      <MarketingSection divided>
        {plansQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : plansQuery.isError ? (
          <ErrorState
            onRetry={() => plansQuery.refetch()}
            titleKey="pricing:table.errorTitle"
            descriptionKey="pricing:table.errorDescription"
          />
        ) : plans.length === 0 ? (
          <EmptyState
            titleKey="pricing:table.emptyTitle"
            descriptionKey="pricing:table.emptyDescription"
          />
        ) : (
          <>
            {/* ── Plan cards ─────────────────────────────────────────────
                The recommended plan is distinguished by border weight and a
                badge only — no shadow stack and no scale transform, which
                would break the row's alignment and add visual noise. */}
            <motion.ul
              initial="hidden"
              animate="visible"
              variants={stagger.container}
              className="grid gap-4 sm:grid-cols-3"
            >
              {plans.map((plan) => {
                const isRecommended = plan.key === recommendedKey;
                return (
                  <motion.li
                    key={plan.key}
                    variants={stagger.item}
                    className={`flex flex-col gap-5 rounded-xl border bg-card p-6 lg:p-8 ${
                      isRecommended
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {plan.name}
                      </h2>
                      {isRecommended ? (
                        <Badge className="shrink-0">
                          {t('pricing:table.recommended')}
                        </Badge>
                      ) : null}
                    </div>

                    <p className="font-display text-4xl font-semibold tracking-[-0.03em] rtl:tracking-normal text-foreground">
                      {formatPlanPrice(plan.pricing, t)}
                    </p>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {plan.description}
                    </p>

                    <ul className="flex-1 space-y-2.5 border-t border-border pt-5 text-sm text-muted-foreground">
                      {LIMIT_ROWS.slice(0, 4).map((key) => (
                        <li key={key} className="flex items-start gap-2.5">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span>
                            {formatLimit(
                              (
                                plan.limits as unknown as Record<
                                  string,
                                  unknown
                                >
                              )[key],
                              key,
                              t
                            )}{' '}
                            {t(`pricing:limits.${key}`)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => startPlanFlow(plan.key)}
                      size="lg"
                      variant={isRecommended ? 'default' : 'outline'}
                      className="w-full"
                    >
                      {t('pricing:table.choosePlan', { plan: plan.name })}
                    </Button>
                  </motion.li>
                );
              })}
            </motion.ul>

            {/* ── Full comparison table ─────────────────────────────────── */}
            <div className="mt-16 lg:mt-20">
              <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-2xl">
                {t('pricing:comparison.title')}
              </h2>

              {/*
                Scrolls inside its own container so a 640px-wide table can never
                make the page itself scroll horizontally at 375px.
                `tabIndex={0}` makes the scroll region reachable by keyboard,
                and the region needs an accessible name to be announced.
              */}
              <div
                className="mt-6 overflow-x-auto"
                role="region"
                aria-label={t('pricing:comparison.title')}
                tabIndex={0}
              >
                <table className="w-full min-w-[640px] border-collapse text-start text-sm">
                  <caption className="sr-only">
                    {t('pricing:comparison.caption')}
                  </caption>
                  <thead>
                    <tr className="border-b border-border-strong">
                      <th
                        scope="col"
                        className="py-3 text-start font-medium text-muted-foreground"
                      >
                        {t('pricing:table.feature')}
                      </th>
                      {plans.map((plan) => (
                        <th
                          key={plan.key}
                          scope="col"
                          className="py-3 text-start font-display font-semibold text-foreground"
                        >
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LIMIT_ROWS.map((key) => (
                      <tr key={key} className="border-b border-border">
                        <th
                          scope="row"
                          className="py-3 text-start font-normal text-muted-foreground"
                        >
                          {t(`pricing:limits.${key}`)}
                        </th>
                        {plans.map((plan) => (
                          <td
                            key={plan.key}
                            className="py-3 font-medium tabular-nums text-foreground"
                          >
                            {formatLimit(
                              (
                                plan.limits as unknown as Record<
                                  string,
                                  unknown
                                >
                              )[key],
                              key,
                              t
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {FEATURE_ROWS.map((key) => (
                      <tr key={key} className="border-b border-border">
                        <th
                          scope="row"
                          className="py-3 text-start font-normal text-muted-foreground"
                        >
                          {t(`pricing:features.${key}`)}
                        </th>
                        {plans.map((plan) => (
                          <td key={plan.key} className="py-3">
                            {/* The icon is decorative; the sr-only text is what
                                actually conveys the value. Colour alone must
                                never carry meaning. */}
                            {plan.features[key] ? (
                              <>
                                <Check
                                  className="size-4 text-primary"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <span className="sr-only">
                                  {t('pricing:comparison.included')}
                                </span>
                              </>
                            ) : (
                              <>
                                <Minus
                                  className="size-4 text-muted-foreground/60"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <span className="sr-only">
                                  {t('pricing:comparison.notIncluded')}
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </MarketingSection>

      {/* ── Pricing note — a supporting visual moment, not a bare closing
          paragraph. Reuses the hero's own resolved-structure motif (see
          `design-system/atlas-marketing/MASTER.md` §12) instead of a new
          asset. ──────────────────────────────────────────────────────────── */}
      <MarketingSection divided compact>
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-[62ch] flex-col gap-3">
            <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">
              {t('pricing:faq.title')}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('pricing:faq.description')}
            </p>
          </div>
          <img
            src={structureCalm}
            alt=""
            className="hidden size-24 shrink-0 opacity-80 sm:block"
            aria-hidden
          />
        </div>
      </MarketingSection>
    </>
  );
}
