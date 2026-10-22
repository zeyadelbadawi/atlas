/**
 * Pricing (CMS phase 3d) — the base renderer: one card per plan with its
 * price, what it includes (✓) and leaves out (✗, said in words for screen
 * readers, never by colour alone), and its button. The "most popular" plan
 * carries a badge and a stronger border.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@utils';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { PricingSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { BaseSectionAction } from './engage/BaseSectionAction';
import { resolvePricingPlans } from './engage/engage-sections.utils';

export interface PricingSectionProps {
  readonly config: PricingSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function PricingSection({
  config,
  pages,
  linkRenderer,
}: PricingSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const card = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const plans = resolvePricingPlans(config, locale);
  if (plans.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      {title || description ? (
        <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
          {title ? (
            <h2
              id={headingId}
              className={`${heading} break-words text-3xl text-foreground`}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="break-words text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-6">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={cn(card, 'flex flex-col gap-5')}
            style={
              plan.highlighted
                ? { boxShadow: '0 0 0 2px var(--website-primary-solid)' }
                : undefined
            }
            data-highlighted={plan.highlighted ? '' : undefined}
          >
            <div className="space-y-2">
              {plan.highlighted ? (
                <span
                  className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--website-primary-solid)' }}
                >
                  {plan.badge || t('website:renderer.pricing.popular')}
                </span>
              ) : null}
              <h3 className="break-words text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="break-words text-3xl font-bold text-foreground">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                ) : null}
              </p>
              {plan.description ? (
                <p className="break-words text-sm text-muted-foreground">
                  {plan.description}
                </p>
              ) : null}
            </div>
            {plan.features.length > 0 ? (
              <ul
                className="flex-1 space-y-2 text-sm"
                aria-label={t('website:renderer.pricing.featuresLabel', {
                  plan: plan.name,
                })}
              >
                {plan.features.map((feature) => (
                  <li
                    key={feature.id}
                    className={cn(
                      'flex items-start gap-2',
                      feature.included
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {feature.included ? (
                      <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 break-words">
                      <span className="sr-only">
                        {t(
                          feature.included
                            ? 'website:renderer.pricing.included'
                            : 'website:renderer.pricing.notIncluded'
                        )}
                        {': '}
                      </span>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex-1" />
            )}
            <div className="[&>*]:w-full">
              <BaseSectionAction
                cta={plan.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                look={plan.highlighted ? 'primary' : 'secondary'}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
