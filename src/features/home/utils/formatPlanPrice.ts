/**
 * formatPlanPrice.
 *
 * Renders a Plan's real `pricing` metadata (`{ amount, currency,
 * billingCycle }`, master plan §5.7 — display-only, never the source of
 * truth for an actual charge) as a short price line for marketing
 * surfaces. A `Plan` with no pricing metadata falls back to a translated
 * "Contact us" label rather than inventing a number.
 */
import type { PlanPricingMetadata } from "@types";
import type { TFunction } from "i18next";

export function formatPlanPrice(
  pricing: PlanPricingMetadata | undefined,
  t: TFunction,
): string {
  if (!pricing || typeof pricing.amount !== "number") {
    return t("home:pricingPreview.contactUs");
  }

  if (pricing.amount === 0) {
    return t("home:pricingPreview.free");
  }

  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: pricing.currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(pricing.amount);

  const cycleKey =
    pricing.billingCycle === "yearly"
      ? "home:pricingPreview.perYear"
      : "home:pricingPreview.perMonth";

  return `${formatted}${t(cycleKey)}`;
}
