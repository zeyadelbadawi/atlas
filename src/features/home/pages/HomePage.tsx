/**
 * Public home page — the Atlas platform's own marketing site (root
 * domain), distinct from an Academy's public website (a different,
 * hostname-resolved surface entirely, untouched by this page). Every
 * section below names a real, shipped Atlas capability — nothing here
 * describes a module that does not exist.
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@components/layout";
import { AUTH_ROUTES, DASHBOARD_ROUTES, PUBLIC_ROUTES } from "@app/routes/route-paths";
import { RISE_VARIANTS, createStaggerVariants } from "@motion";
import { useAuth } from "@hooks";
import { usePublicPlans } from "../hooks/usePublicPlans";
import { useStartPlanFlow } from "../hooks/useStartPlanFlow";
import { formatPlanPrice } from "../utils/formatPlanPrice";

const CAPABILITY_KEYS: readonly {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly titleKey: string;
  readonly descriptionKey: string;
}[] = [
  {
    id: "academies",
    icon: Building2,
    titleKey: "home:capabilities.academies.title",
    descriptionKey: "home:capabilities.academies.description",
  },
  {
    id: "lms",
    icon: BookOpen,
    titleKey: "home:capabilities.lms.title",
    descriptionKey: "home:capabilities.lms.description",
  },
  {
    id: "students",
    icon: Users,
    titleKey: "home:capabilities.students.title",
    descriptionKey: "home:capabilities.students.description",
  },
  {
    id: "instructors",
    icon: GraduationCap,
    titleKey: "home:capabilities.instructors.title",
    descriptionKey: "home:capabilities.instructors.description",
  },
  {
    id: "website",
    icon: Palette,
    titleKey: "home:capabilities.website.title",
    descriptionKey: "home:capabilities.website.description",
  },
  {
    id: "domains",
    icon: Globe2,
    titleKey: "home:capabilities.domains.title",
    descriptionKey: "home:capabilities.domains.description",
  },
  {
    id: "organizations",
    icon: Network,
    titleKey: "home:capabilities.organizations.title",
    descriptionKey: "home:capabilities.organizations.description",
  },
  {
    id: "analytics",
    icon: BarChart3,
    titleKey: "home:capabilities.analytics.title",
    descriptionKey: "home:capabilities.analytics.description",
  },
  {
    id: "security",
    icon: ShieldCheck,
    titleKey: "home:capabilities.security.title",
    descriptionKey: "home:capabilities.security.description",
  },
];

const HOW_IT_WORKS_KEYS = ["organization", "academy", "launch"] as const;

export default function HomePage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const capabilityStagger = createStaggerVariants(CAPABILITY_KEYS.length);
  const stepStagger = createStaggerVariants(HOW_IT_WORKS_KEYS.length);
  const plansQuery = usePublicPlans();
  const startPlanFlow = useStartPlanFlow();
  const plans = [...(plansQuery.data ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <PageContainer>
      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={RISE_VARIANTS}
        className="space-y-6 py-8 text-center lg:py-16"
      >
        <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("home:hero.eyebrow")}
        </span>

        <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          {t("home:hero.title")}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("home:hero.description")}
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to={isAuthenticated ? DASHBOARD_ROUTES.root : AUTH_ROUTES.register}>
              {t("home:hero.primaryAction")}
              <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to={PUBLIC_ROUTES.pricing}>{t("home:hero.secondaryAction")}</Link>
          </Button>
        </div>
      </motion.section>

      {/* What Atlas is */}
      <section className="mx-auto max-w-3xl space-y-4 py-8 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {t("home:whatIsAtlas.title")}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          {t("home:whatIsAtlas.description")}
        </p>
      </section>

      {/* Capabilities */}
      <section className="space-y-6 py-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {t("home:capabilitiesSection.title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("home:capabilitiesSection.description")}
          </p>
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={capabilityStagger.container}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CAPABILITY_KEYS.map((capability) => (
            <motion.li
              key={capability.id}
              variants={capabilityStagger.item}
              className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-xs"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <capability.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">
                {t(capability.titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(capability.descriptionKey)}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <div className="text-center">
          <Button asChild variant="outline">
            <Link to={PUBLIC_ROUTES.features}>
              {t("home:capabilitiesSection.viewAll")}
              <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6 py-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {t("home:howItWorks.title")}
          </h2>
        </div>

        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stepStagger.container}
          className="grid gap-6 sm:grid-cols-3"
        >
          {HOW_IT_WORKS_KEYS.map((step, index) => (
            <motion.li key={step} variants={stepStagger.item} className="space-y-3 text-center">
              <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-border bg-surface font-display text-sm font-semibold text-foreground">
                {index + 1}
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">
                {t(`home:howItWorks.steps.${step}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`home:howItWorks.steps.${step}.description`)}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      {/* Pricing preview */}
      <section className="space-y-6 py-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            {t("home:pricingPreview.title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("home:pricingPreview.description")}
          </p>
        </div>

        {plansQuery.isLoading ? (
          <p className="text-center text-sm text-muted-foreground">
            {t("home:pricingPreview.loading")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
              >
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="font-display text-2xl font-semibold text-foreground">
                  {formatPlanPrice(plan.pricing, t)}
                </p>
                <p className="flex-1 text-sm text-muted-foreground">{plan.description}</p>
                <Button onClick={() => startPlanFlow(plan.key)} variant="outline">
                  {t("home:pricingPreview.choosePlan")}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            to={PUBLIC_ROUTES.pricing}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("home:pricingPreview.viewFullPricing")}
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={RISE_VARIANTS}
        className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-surface px-6 py-12 text-center"
      >
        <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {t("home:finalCta.title")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("home:finalCta.description")}
        </p>
        <Button asChild size="lg">
          <Link to={isAuthenticated ? DASHBOARD_ROUTES.root : AUTH_ROUTES.register}>
            {t("home:finalCta.action")}
            <ArrowRight className="size-4 rtl:-scale-x-100" strokeWidth={2} aria-hidden />
          </Link>
        </Button>
      </motion.section>
    </PageContainer>
  );
}
