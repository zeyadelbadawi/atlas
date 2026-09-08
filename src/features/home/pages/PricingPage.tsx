/**
 * Public Pricing page — real Plan catalog (`GET /public/plans`), never
 * invented numbers. Choosing a plan while signed out routes into the
 * real sign-up → organization-creation → plan-selection journey
 * (`useStartPlanFlow`) rather than attempting checkout directly; the
 * actual subscription/checkout logic is never duplicated here.
 */
import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@components/layout";
import { ErrorState, EmptyState } from "@components/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { createStaggerVariants } from "@motion";
import { usePublicPlans } from "../hooks/usePublicPlans";
import { useStartPlanFlow } from "../hooks/useStartPlanFlow";
import { formatPlanPrice } from "../utils/formatPlanPrice";
import type { PlanFeatures } from "@types";

/** Order features are compared in — matches `PlanFeatures`' own real fields. */
const FEATURE_ROWS: readonly (keyof PlanFeatures)[] = [
  "cms",
  "themes",
  "multipleThemes",
  "customDomain",
  "seo",
  "seoAdvanced",
  "marketing",
  "marketingAdvanced",
  "analytics",
  "analyticsAdvanced",
  "backup",
];

const LIMIT_ROWS = [
  "academies",
  "students",
  "instructors",
  "staff",
  "courses",
  "generalStorage",
  "videoStorage",
] as const;

const STORAGE_LIMIT_KEYS = new Set(["generalStorage", "videoStorage"]);

function formatLimit(
  value: unknown,
  limitKey: string,
  t: (key: string) => string,
): string {
  if (value === "unlimited") return t("pricing:table.unlimited");
  if (typeof value === "number") {
    return STORAGE_LIMIT_KEYS.has(limitKey)
      ? `${value} ${t("pricing:units.gb")}`
      : String(value);
  }
  return "—";
}

export default function PricingPage(): JSX.Element {
  const { t } = useTranslation();
  const plansQuery = usePublicPlans();
  const startPlanFlow = useStartPlanFlow();
  const plans = [...(plansQuery.data ?? [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const recommendedKey = plans[1]?.key;
  const stagger = createStaggerVariants(plans.length || 1);

  return (
    <PageContainer>
      <PageHeader titleKey="pricing:page.title" descriptionKey="pricing:page.description" />

      {plansQuery.isLoading ? (
        <div className="grid gap-4 py-4 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : plansQuery.isError ? (
        <ErrorState
          onRetry={() => plansQuery.refetch()}
          titleKey="pricing:table.errorTitle"
          descriptionKey="pricing:table.errorDescription"
        />
      ) : plans.length === 0 ? (
        <EmptyState titleKey="pricing:table.emptyTitle" descriptionKey="pricing:table.emptyDescription" />
      ) : (
        <>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger.container}
            className="grid gap-6 py-4 sm:grid-cols-3"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.key}
                variants={stagger.item}
                className={`flex flex-col gap-4 rounded-lg border p-6 ${
                  plan.key === recommendedKey
                    ? "border-primary bg-surface shadow-md ring-1 ring-primary"
                    : "border-border bg-card"
                }`}
              >
                {plan.key === recommendedKey ? (
                  <Badge className="w-fit">{t("pricing:table.recommended")}</Badge>
                ) : null}

                <div className="space-y-1">
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <p className="font-display text-3xl font-semibold text-foreground">
                  {formatPlanPrice(plan.pricing, t)}
                </p>

                <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                  {LIMIT_ROWS.slice(0, 4).map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <Check className="size-4 text-primary" strokeWidth={2} aria-hidden />
                      <span>
                        {formatLimit(
                          (plan.limits as unknown as Record<string, unknown>)[key],
                          key,
                          t,
                        )}{" "}
                        {t(`pricing:limits.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button onClick={() => startPlanFlow(plan.key)} size="lg">
                  {t("pricing:table.choosePlan", { plan: plan.name })}
                </Button>
              </motion.div>
            ))}
          </motion.div>

          {/* Full comparison table */}
          <div className="overflow-x-auto py-8">
            <table className="w-full min-w-[640px] border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 text-start font-medium text-muted-foreground">
                    {t("pricing:table.feature")}
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.key}
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
                    <td className="py-3 text-muted-foreground">
                      {t(`pricing:limits.${key}`)}
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.key} className="py-3 font-medium text-foreground">
                        {formatLimit(
                          (plan.limits as unknown as Record<string, unknown>)[key],
                          key,
                          t,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {FEATURE_ROWS.map((key) => (
                  <tr key={key} className="border-b border-border">
                    <td className="py-3 text-muted-foreground">
                      {t(`pricing:features.${key}`)}
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.key} className="py-3">
                        {plan.features[key] ? (
                          <Check className="size-4 text-primary" strokeWidth={2} aria-hidden />
                        ) : (
                          <Minus className="size-4 text-muted-foreground/50" strokeWidth={2} aria-hidden />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="mx-auto max-w-xl space-y-2 py-8 text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t("pricing:faq.title")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("pricing:faq.description")}
        </p>
      </section>
    </PageContainer>
  );
}
