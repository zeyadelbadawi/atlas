/**
 * What every theme's pricing and "Talk to us" renderers read from a config
 * (CMS phase 3d), resolved once for the visitor's language — so the themes
 * differ only in how they draw it, never in what they draw.
 */
import {
  SECTION_BUTTON_SLOTS,
  type PricingSectionConfig,
  type PublicWebsiteLocale,
  type SectionButtons,
  type WebsiteCta,
  type WebsitePage,
} from '@types';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '@/features/website/utils/link-resolution.utils';

export interface ResolvedPricingPlan {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly period: string;
  readonly description: string;
  readonly features: readonly {
    readonly id: string;
    readonly text: string;
    readonly included: boolean;
  }[];
  /** Only the first plan marked "most popular" is drawn as it. */
  readonly highlighted: boolean;
  /** The highlighted plan's badge text (empty → the theme shows "Most popular"). */
  readonly badge: string;
  readonly cta?: WebsiteCta;
}

/** The plans with a name and a price, in the visitor's language. */
export function resolvePricingPlans(
  config: PricingSectionConfig,
  locale: PublicWebsiteLocale
): readonly ResolvedPricingPlan[] {
  let highlightTaken = false;
  return (config.plans ?? [])
    .map((plan) => ({
      id: plan.id,
      name: resolveLocalizedText(plan.name, locale),
      price: resolveLocalizedText(plan.price, locale),
      period: resolveLocalizedText(plan.period, locale),
      description: resolveLocalizedText(plan.description, locale),
      features: (plan.features ?? [])
        .map((feature) => ({
          id: feature.id,
          text: resolveLocalizedText(feature.text, locale),
          included: feature.included !== false,
        }))
        .filter((feature) => feature.text),
      highlighted: plan.highlighted === true,
      badge: resolveLocalizedText(plan.badge, locale),
      cta: plan.cta,
    }))
    .filter((plan) => plan.name && plan.price)
    .map((plan) => {
      const highlighted = plan.highlighted && !highlightTaken;
      if (highlighted) highlightTaken = true;
      return { ...plan, highlighted };
    });
}

/** A section's buttons, in slot order. */
export function sectionButtonList(config: SectionButtons): WebsiteCta[] {
  return SECTION_BUTTON_SLOTS.map((slot) => config[slot]).filter(
    (cta): cta is WebsiteCta => !!cta
  );
}

/**
 * Whether at least one of these buttons goes somewhere — the public site
 * draws only those (a WhatsApp number not typed yet goes nowhere), so a
 * section made of buttons shows only when this holds, and a preview says
 * so when it doesn't.
 */
export function hasReachableButton(
  buttons: readonly (WebsiteCta | undefined)[],
  pages: readonly WebsitePage[],
  locale: PublicWebsiteLocale
): boolean {
  return buttons.some(
    (cta) =>
      !!cta &&
      !!resolveLocalizedText(cta.label, locale) &&
      !!resolveWebsiteCtaHref(cta, pages, locale)
  );
}
