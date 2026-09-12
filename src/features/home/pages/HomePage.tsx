/**
 * Public home page — the Atlas platform's own marketing site (root domain),
 * distinct from an Academy's public website (a different, hostname-resolved
 * surface entirely, untouched by this page).
 *
 * Every section below names a real, shipped Atlas capability — nothing here
 * describes a module that does not exist, and nothing here states a statistic,
 * a customer or a testimonial, because the repository contains none.
 *
 * Design system: `design-system/atlas-marketing/MASTER.md` (Editorial Grid,
 * generated with UI/UX Pro Max and reconciled against the Atlas token layer).
 * Structure follows that document's §3: hero → value prop → asymmetric
 * capability grid → how-it-works → plans → closing CTA.
 */
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Globe2,
  GraduationCap,
  Network,
  Palette,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { RISE_VARIANTS, createStaggerVariants } from '@motion';
import { useAuth } from '@hooks';
import { usePublicPlans } from '../hooks/usePublicPlans';
import { useStartPlanFlow } from '../hooks/useStartPlanFlow';
import { formatPlanPrice } from '../utils/formatPlanPrice';
import {
  MarketingContainer,
  MarketingSection,
  SectionHeading,
} from '../components/MarketingSection';
import { PlatformStructureFigure } from '../components/PlatformStructureFigure';

interface Capability {
  readonly id: string;
  readonly icon: LucideIcon;
  /**
   * Column span on the 12-column desktop grid. The asymmetry is the point —
   * see MASTER.md §3: a 3×3 grid of identical cards is the exact anti-pattern
   * this layout exists to avoid. Spans must sum to a multiple of 12 per row.
   */
  readonly span: 4 | 6 | 8;
  /** The lead item gets larger type and its own visual weight. */
  readonly lead?: boolean;
}

const CAPABILITIES: readonly Capability[] = [
  // Row 1 — lead item (8) + one companion (4).
  { id: 'security', icon: ShieldCheck, span: 8, lead: true },
  { id: 'academies', icon: Building2, span: 4 },
  // Row 2 — two halves.
  { id: 'lms', icon: BookOpen, span: 6 },
  { id: 'website', icon: Palette, span: 6 },
  // Row 3 — three thirds.
  { id: 'students', icon: Users, span: 4 },
  { id: 'instructors', icon: GraduationCap, span: 4 },
  { id: 'domains', icon: Globe2, span: 4 },
  // Row 4 — two halves.
  { id: 'organizations', icon: Network, span: 6 },
  { id: 'analytics', icon: BarChart3, span: 6 },
];

const COL_SPAN_CLASS: Record<Capability['span'], string> = {
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
};

const HOW_IT_WORKS_STEPS = ['organization', 'academy', 'launch'] as const;

export default function HomePage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const capabilityStagger = createStaggerVariants(CAPABILITIES.length);
  const stepStagger = createStaggerVariants(HOW_IT_WORKS_STEPS.length);
  const plansQuery = usePublicPlans();
  const startPlanFlow = useStartPlanFlow();
  const plans = [...(plansQuery.data ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const startHref = isAuthenticated
    ? DASHBOARD_ROUTES.root
    : AUTH_ROUTES.register;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────
          Two columns on desktop: copy on the text edge, the structure figure
          beside it. Single column on mobile with the figure below the CTAs, so
          the value proposition and the primary action stay above the fold on a
          375px screen. */}
      <section className="relative overflow-hidden">
        {/*
          The one permitted gradient (MASTER.md §4): a single very low-contrast
          surface wash to give the hero ground, with no colour and no blur.
          Decorative, so hidden from assistive tech.
        */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-gradient-to-b from-surface to-background"
          aria-hidden
        />

        <MarketingContainer className="py-16 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={RISE_VARIANTS}
              className="flex flex-col items-start gap-6 lg:col-span-7"
            >
              <span className="inline-flex items-center rounded-pill border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] rtl:tracking-normal text-muted-foreground">
                {t('home:hero.eyebrow')}
              </span>

              <h1 className="max-w-[22ch] text-balance font-display text-[2.5rem] font-semibold leading-[1.05] rtl:leading-[1.5] tracking-[-0.03em] rtl:tracking-normal text-foreground sm:text-5xl lg:text-6xl">
                {t('home:hero.title')}
              </h1>

              <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('home:hero.description')}
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to={startHref}>
                    {t('home:hero.primaryAction')}
                    <ArrowRight
                      className="size-4 rtl:-scale-x-100"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Link to={PUBLIC_ROUTES.pricing}>
                    {t('home:hero.secondaryAction')}
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={RISE_VARIANTS}
              className="w-full lg:col-span-5"
            >
              <PlatformStructureFigure />
            </motion.div>
          </div>
        </MarketingContainer>
      </section>

      {/* ── Value proposition ───────────────────────────────────────────── */}
      <MarketingSection divided aria-labelledby="home-what-is-atlas">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="home-what-is-atlas"
              eyebrow={t('home:whatIsAtlas.eyebrow')}
              title={t('home:whatIsAtlas.title')}
            />
          </div>
          <div className="lg:col-span-7">
            <p className="max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('home:whatIsAtlas.description')}
            </p>
          </div>
        </div>
      </MarketingSection>

      {/* ── Capabilities — asymmetric editorial grid ────────────────────── */}
      <MarketingSection divided aria-labelledby="home-capabilities">
        <SectionHeading
          id="home-capabilities"
          eyebrow={t('home:capabilitiesSection.eyebrow')}
          title={t('home:capabilitiesSection.title')}
          lead={t('home:capabilitiesSection.description')}
        />

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={capabilityStagger.container}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-12"
        >
          {CAPABILITIES.map((capability) => (
            <motion.li
              key={capability.id}
              variants={capabilityStagger.item}
              className={`group flex flex-col gap-3 rounded-xl border border-border bg-card p-6 transition-colors duration-normal hover:border-border-strong lg:p-8 ${COL_SPAN_CLASS[capability.span]} ${
                capability.lead ? 'sm:col-span-2' : ''
              }`}
            >
              <span
                className={
                  capability.lead
                    ? 'flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground'
                    : 'flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground'
                }
              >
                <capability.icon
                  className={capability.lead ? 'size-6' : 'size-5'}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>

              <h3
                className={
                  capability.lead
                    ? 'font-display text-xl font-semibold text-foreground sm:text-2xl'
                    : 'font-display text-lg font-semibold text-foreground'
                }
              >
                {t(`home:capabilities.${capability.id}.title`)}
              </h3>

              <p
                className={
                  capability.lead
                    ? 'max-w-[58ch] text-base leading-relaxed text-muted-foreground'
                    : 'text-sm leading-relaxed text-muted-foreground'
                }
              >
                {t(`home:capabilities.${capability.id}.description`)}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to={PUBLIC_ROUTES.features}>
              {t('home:capabilitiesSection.viewAll')}
              <ArrowRight
                className="size-4 rtl:-scale-x-100"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
        </div>
      </MarketingSection>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <MarketingSection divided aria-labelledby="home-how-it-works">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHeading
              id="home-how-it-works"
              eyebrow={t('home:howItWorks.eyebrow')}
              title={t('home:howItWorks.title')}
            />
          </div>

          <motion.ol
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stepStagger.container}
            className="lg:col-span-8"
          >
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <motion.li
                key={step}
                variants={stepStagger.item}
                className="flex gap-5 border-t border-border py-6 first:border-t-0 first:pt-0"
              >
                {/*
                  The step number is decorative relative to the ordered list
                  semantics — an <ol> already conveys order to assistive tech,
                  so announcing "1" again would be redundant.
                */}
                <span
                  className="mt-0.5 font-display text-sm font-semibold tabular-nums text-primary"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {t(`home:howItWorks.steps.${step}.title`)}
                  </h3>
                  <p className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                    {t(`home:howItWorks.steps.${step}.description`)}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </MarketingSection>

      {/* ── Plans preview — real catalogue, never invented numbers ──────── */}
      <MarketingSection divided aria-labelledby="home-plans">
        <SectionHeading
          id="home-plans"
          eyebrow={t('home:pricingPreview.eyebrow')}
          title={t('home:pricingPreview.title')}
          lead={t('home:pricingPreview.description')}
        />

        <div className="mt-12">
          {plansQuery.isLoading ? (
            /* Reserves the real card height so the section does not shift when
               plans land (CLS — UI/UX Pro Max priority 3). */
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <Skeleton key={key} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : plansQuery.isError || plans.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('home:pricingPreview.contactUs')}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <li
                  key={plan.key}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 lg:p-8"
                >
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="font-display text-3xl font-semibold tracking-[-0.02em] rtl:tracking-normal text-foreground">
                    {formatPlanPrice(plan.pricing, t)}
                  </p>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                  <Button
                    onClick={() => startPlanFlow(plan.key)}
                    variant="outline"
                    className="w-full"
                  >
                    {t('home:pricingPreview.choosePlan')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <Link
            to={PUBLIC_ROUTES.pricing}
            className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('home:pricingPreview.viewFullPricing')}
          </Link>
        </div>
      </MarketingSection>

      {/* ── Closing CTA — the one tinted block on the page ──────────────── */}
      <MarketingSection compact>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={RISE_VARIANTS}
          className="flex flex-col items-start gap-6 rounded-xl border border-border bg-surface p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12"
        >
          <div className="flex flex-col gap-3">
            <h2 className="max-w-[24ch] text-balance font-display text-2xl font-semibold leading-[1.15] rtl:leading-[1.5] tracking-[-0.02em] rtl:tracking-normal text-foreground sm:text-3xl">
              {t('home:finalCta.title')}
            </h2>
            <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('home:finalCta.description')}
            </p>
          </div>

          <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
            <Link to={startHref}>
              {t('home:finalCta.action')}
              <ArrowRight
                className="size-4 rtl:-scale-x-100"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </Button>
        </motion.div>
      </MarketingSection>
    </>
  );
}
