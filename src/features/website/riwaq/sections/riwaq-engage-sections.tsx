/**
 * Riwaq renderers for the CMS phase 3d sections: the "Talk to us" bar,
 * the click-to-play video, pricing plans and the registration countdown.
 * The shared helpers (`sections/engage`) decide what each draws; these set
 * it on Riwaq's page grid — ruled cells and ledgers with the registration
 * tick, a square window for the video, light figures for the countdown —
 * never rounded cards.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
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
  RiwaqAction,
  RiwaqBand,
  RiwaqHeading,
  RiwaqSectionHead,
} from '../riwaq-parts';

/** A preview-only note where the public site draws nothing yet. */
function RiwaqEngageNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <p data-preview-note="" className="rw-note">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* "Talk to us" bar — one ruled cell on stone                            */
/* ------------------------------------------------------------------ */

export function RiwaqWhatsappBar({
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
    <RiwaqBand ground="stone" labelledBy={headingId} tight>
      <div className="rw-cell rwx-bar" data-tick="">
        <div className="min-w-0 space-y-2">
          <RiwaqHeading id={headingId} size="subtitle">
            {resolveLocalizedText(config.title, locale)}
          </RiwaqHeading>
          {description ? <p className="rw-lead">{description}</p> : null}
        </div>
        <div className="rws-actions">
          <RiwaqAction
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
          />
          <RiwaqAction
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="line"
            arrow={false}
          />
          <RiwaqAction
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="link"
          />
        </div>
      </div>
      {!reachable ? (
        <div className="mt-6">
          <RiwaqEngageNote>
            {t('website:renderer.whatsappBar.previewNoButtons')}
          </RiwaqEngageNote>
        </div>
      ) : null}
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Video — a square window on the page grid                              */
/* ------------------------------------------------------------------ */

export function RiwaqVideo({
  config,
  linkRenderer,
}: SectionRenderProps<'video'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasVideo = isYouTubeVideoId(config.videoId);
  if (!hasVideo && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);
  const caption = resolveLocalizedText(config.caption, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.video.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <figure className="rwx-video">
        {hasVideo ? (
          <VideoFacade
            videoId={config.videoId}
            title={title}
            poster={config.poster}
            interactive={!!linkRenderer}
            frameClassName="rw-window rwx-video-frame"
            playClassName="rwx-video-play"
            sizes="(min-width: 1024px) 66vw, 100vw"
          />
        ) : (
          <RiwaqEngageNote>
            {t('website:renderer.video.previewMissing')}
          </RiwaqEngageNote>
        )}
        {caption ? (
          <figcaption className="rw-label rwx-caption" data-mark="">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing — a ledger of plans                                           */
/* ------------------------------------------------------------------ */

export function RiwaqPricing({
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
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.pricing.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <ul className="rw-ledger rwx-plans" data-count={plans.length}>
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="rwx-plan"
            data-highlighted={plan.highlighted ? '' : undefined}
          >
            {plan.highlighted ? (
              <span className="rw-badge self-start">
                {plan.badge || t('website:renderer.pricing.popular')}
              </span>
            ) : null}
            <RiwaqHeading as="h3" size="subtitle">
              {plan.name}
            </RiwaqHeading>
            <p className="rwx-plan-price">
              <span className="rwx-price">{plan.price}</span>
              {plan.period ? (
                <span className="rw-label">{plan.period}</span>
              ) : null}
            </p>
            {plan.description ? (
              <p className="rw-muted">{plan.description}</p>
            ) : null}
            {plan.features.length > 0 ? (
              <ul
                className="rwx-plan-features"
                aria-label={t('website:renderer.pricing.featuresLabel', {
                  plan: plan.name,
                })}
              >
                {plan.features.map((feature) => (
                  <li
                    key={feature.id}
                    data-included={feature.included ? '' : undefined}
                  >
                    {feature.included ? (
                      <Check aria-hidden className="rwx-mark" strokeWidth={2} />
                    ) : (
                      <X aria-hidden className="rwx-mark" strokeWidth={2} />
                    )}
                    <span className="min-w-0">
                      <span className="rw-sr-only">
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
            <div className="rwx-plan-action">
              <RiwaqAction
                cta={plan.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant={plan.highlighted ? 'solid' : 'line'}
                arrow={plan.highlighted}
              />
            </div>
          </li>
        ))}
      </ul>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Countdown — light figures in a ledger on the deep ground              */
/* ------------------------------------------------------------------ */

export function RiwaqCountdown({
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
    <RiwaqBand ground="deep" labelledBy={headingId}>
      <div {...state.rootProps}>
        <RiwaqSectionHead
          id={headingId}
          title={resolveLocalizedText(config.title, locale)}
          description={resolveLocalizedText(config.description, locale)}
          wide
        />
        <div className="rwx-countdown">
          {state.status === 'unset' ? (
            <RiwaqEngageNote>
              {t('website:renderer.countdown.previewMissing')}
            </RiwaqEngageNote>
          ) : (
            <CountdownStatus
              state={state}
              classes={{
                timer: 'rw-ledger rwx-timer',
                unit: 'rwx-timer-unit',
                value: 'rw-figure rwx-timer-value',
                label: 'rw-label',
                ended: 'rw-subtitle',
              }}
            />
          )}
          {state.status === 'running' ? (
            <p
              className="rw-label rwx-closes"
              data-mark=""
              suppressHydrationWarning
            >
              {state.closes}
            </p>
          ) : null}
          <div className="rws-actions">
            <RiwaqAction
              cta={config.cta}
              pages={pages}
              linkRenderer={linkRenderer}
              large
            />
            <RiwaqAction
              cta={config.secondaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="line"
              large
              arrow={false}
            />
            <RiwaqAction
              cta={config.tertiaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="link"
            />
          </div>
        </div>
      </div>
    </RiwaqBand>
  );
}
