/**
 * Manara renderers for the CMS phase 3d sections: the "Talk to us" bar,
 * the click-to-play video, pricing plans and the registration countdown.
 * The shared helpers (`sections/engage`) decide what each draws; these give
 * it Manara's dyed blocks, beams, bold display face and tiles — the most
 * popular plan is a dyed tile, the countdown a row of giant numerals.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MessageCircle, X } from 'lucide-react';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { isYouTubeVideoId } from '@/features/website/utils/section-media-values.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { VideoFacade } from '@/features/website/sections/engage/VideoFacade';
import {
  CountdownStatus,
  useCountdown,
} from '@/features/website/sections/engage/countdown';
import {
  hasReachableButton,
  resolvePricingPlans,
} from '@/features/website/sections/engage/engage-sections.utils';
import {
  ManaraAction,
  ManaraBlock,
  ManaraHeading,
  ManaraPill,
  ManaraSectionHeader,
} from '../manara-parts';

/** A preview-only note where the public site draws nothing yet. */
function ManaraEngageNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <p data-preview-note="" className="mnx-note">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* "Talk to us" bar — a dyed strip                                       */
/* ------------------------------------------------------------------ */

export function ManaraWhatsappBar({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'whatsappBar'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reachable = hasReachableButton(
    [config.cta, config.secondaryCta, config.tertiaryCta],
    pages,
    locale
  );
  if (!reachable && linkRenderer) return null;
  const description = resolveLocalizedText(config.description, locale);

  return (
    <ManaraBlock env="block" labelledBy={headingId} tight beam="end">
      <div className="mnx-bar">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden className="mnx-bar-icon">
            <MessageCircle className="size-6" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-2">
            <ManaraHeading id={headingId} size="subtitle">
              {resolveLocalizedText(config.title, locale)}
            </ManaraHeading>
            {description ? <p className="mn-muted">{description}</p> : null}
          </div>
        </div>
        <div className="mnx-actions">
          <ManaraAction
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
          />
          <ManaraAction
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="outline"
            arrow={false}
          />
          <ManaraAction
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="link"
          />
        </div>
      </div>
      {!reachable ? (
        <div className="mt-6">
          <ManaraEngageNote>
            {t('website:renderer.whatsappBar.previewNoButtons')}
          </ManaraEngageNote>
        </div>
      ) : null}
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Video — on the night ground, under the beam                           */
/* ------------------------------------------------------------------ */

export function ManaraVideo({
  config,
  linkRenderer,
}: SectionRenderProps<'video'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasVideo = isYouTubeVideoId(config.videoId);
  if (!hasVideo && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const caption = resolveLocalizedText(config.caption, locale);

  return (
    <ManaraBlock
      env="night"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.video.label')}
      beam="centre"
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={description}
        align="center"
      />
      <figure className="mx-auto max-w-5xl">
        {hasVideo ? (
          <VideoFacade
            videoId={config.videoId}
            title={title}
            poster={config.poster}
            interactive={!!linkRenderer}
            frameClassName="mn-frame mnx-video-frame"
            playClassName="mnx-video-play"
            sizes="(min-width: 1024px) 64rem, 100vw"
          />
        ) : (
          <ManaraEngageNote>
            {t('website:renderer.video.previewMissing')}
          </ManaraEngageNote>
        )}
        {caption ? (
          <figcaption className="mn-label mn-muted mt-4 text-center">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing — cards, the most popular one a dyed tile                     */
/* ------------------------------------------------------------------ */

const PLAN_COLUMNS: Record<number, string> = {
  1: 'mx-auto max-w-md',
  2: 'mx-auto max-w-4xl md:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
};

export function ManaraPricing({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'pricing'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const plans = resolvePricingPlans(config, locale);
  if (plans.length === 0) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      env="soft"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.pricing.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <ul
        className={cn(
          'grid items-stretch gap-5',
          PLAN_COLUMNS[plans.length] ?? PLAN_COLUMNS[4]
        )}
      >
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={cn('mnx-plan', plan.highlighted ? 'mn-tile' : 'mn-card')}
            data-highlighted={plan.highlighted ? '' : undefined}
          >
            {plan.highlighted ? (
              <ManaraPill className="self-start">
                {plan.badge || t('website:renderer.pricing.popular')}
              </ManaraPill>
            ) : null}
            <h3 className="mn-subtitle">{plan.name}</h3>
            <p className="mnx-plan-price">
              <span className="mnx-price">{plan.price}</span>
              {plan.period ? (
                <span className="mn-label">{plan.period}</span>
              ) : null}
            </p>
            {plan.description ? (
              <p className="mn-muted">{plan.description}</p>
            ) : null}
            {plan.features.length > 0 ? (
              <ul
                className="mnx-plan-features"
                aria-label={t('website:renderer.pricing.featuresLabel', {
                  plan: plan.name,
                })}
              >
                {plan.features.map((feature) => (
                  <li
                    key={feature.id}
                    data-included={feature.included ? '' : undefined}
                  >
                    <span aria-hidden className="mnx-mark">
                      {feature.included ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : (
                        <X className="size-3.5" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0 break-words">
                      <span className="mn-sr-only">
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
            <div className="mnx-plan-action">
              <ManaraAction
                cta={plan.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant={plan.highlighted ? 'accent' : 'block'}
              />
            </div>
          </li>
        ))}
      </ul>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Countdown — giant numerals in dyed tiles                              */
/* ------------------------------------------------------------------ */

export function ManaraCountdown({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'countdown'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const state = useCountdown(config, locale);
  if (state.status === 'unset' && linkRenderer) return null;

  return (
    <ManaraBlock labelledBy={headingId} beam="start" seamTop>
      <div {...state.rootProps}>
        <ManaraSectionHeader
          id={headingId}
          title={resolveLocalizedText(config.title, locale)}
          description={resolveLocalizedText(config.description, locale)}
          align="center"
        />
        {state.status === 'unset' ? (
          <ManaraEngageNote>
            {t('website:renderer.countdown.previewMissing')}
          </ManaraEngageNote>
        ) : (
          <CountdownStatus
            state={state}
            classes={{
              timer: 'mnx-timer',
              unit: 'mn-tile mnx-timer-unit',
              value: 'mnx-timer-value',
              label: 'mn-label',
              ended: 'mn-title mx-auto max-w-3xl text-center',
            }}
          />
        )}
        {state.status === 'running' ? (
          <p
            className="mn-label mn-muted mt-5 text-center"
            suppressHydrationWarning
          >
            {state.closes}
          </p>
        ) : null}
        <div className="mnx-actions mt-8 justify-center">
          <ManaraAction
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
            large
          />
          <ManaraAction
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="outline"
            large
            arrow={false}
          />
          <ManaraAction
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="link"
          />
        </div>
      </div>
    </ManaraBlock>
  );
}
