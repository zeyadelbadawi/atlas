/**
 * Atelier renderers for the CMS phase 3d sections: the "Talk to us" bar,
 * the click-to-play video, pricing plans and the registration countdown.
 * The shared helpers (`sections/engage`) decide what each draws; these give
 * it Atelier's chapters, serif type, hairlines and square actions — a price
 * list set like a printed menu, a countdown in display numerals.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
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
  ATELIER_INK_LOOKS,
  AtelierAction,
  AtelierChapter,
  AtelierSectionHeader,
  formatAtelierIndex,
} from '../atelier-parts';

/** A preview-only note where the public site draws nothing yet. */
function AtelierEngageNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <p data-preview-note="" className="ath-preview-note">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* "Talk to us" bar — a ruled line between chapters                     */
/* ------------------------------------------------------------------ */

export function AtelierWhatsappBar({
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
    <AtelierChapter labelledBy={headingId} className="atx-tight">
      <div className="atx-bar">
        <div className="min-w-0 space-y-3">
          <h2 id={headingId} className="at-subtitle">
            {resolveLocalizedText(config.title, locale)}
          </h2>
          {description ? <p className="at-lead">{description}</p> : null}
        </div>
        <div className="atx-actions">
          <AtelierAction
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
          />
          <AtelierAction
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="ghost"
            arrow={false}
          />
          <AtelierAction
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="link"
          />
        </div>
      </div>
      {!reachable ? (
        <div className="mt-6">
          <AtelierEngageNote>
            {t('website:renderer.whatsappBar.previewNoButtons')}
          </AtelierEngageNote>
        </div>
      ) : null}
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Video — a plate on the deeper paper                                   */
/* ------------------------------------------------------------------ */

export function AtelierVideo({
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
    <AtelierChapter
      env="deep"
      labelledBy={title ? headingId : undefined}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <figure className="atx-video">
        {hasVideo ? (
          <VideoFacade
            videoId={config.videoId}
            title={title}
            poster={config.poster}
            interactive={!!linkRenderer}
            frameClassName="at-frame atx-video-frame"
            playClassName="atx-video-play"
            sizes="(min-width: 1280px) 72rem, 100vw"
          />
        ) : (
          <AtelierEngageNote>
            {t('website:renderer.video.previewMissing')}
          </AtelierEngageNote>
        )}
        {caption ? (
          <figcaption className="atx-caption">
            <span aria-hidden className="at-mark-rule" />
            <span className="at-label">{caption}</span>
          </figcaption>
        ) : null}
      </figure>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing — a ruled price list                                          */
/* ------------------------------------------------------------------ */

export function AtelierPricing({
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
    <AtelierChapter labelledBy={title ? headingId : undefined} numbered>
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ol className="atx-plans" data-count={plans.length}>
        {plans.map((plan, index) => (
          <li
            key={plan.id}
            className="atx-plan"
            data-highlighted={plan.highlighted ? '' : undefined}
          >
            <div className="atx-plan-head">
              <span aria-hidden className="at-numeral atx-plan-no">
                {formatAtelierIndex(index, locale)}
              </span>
              {plan.highlighted ? (
                <span className="at-label at-label-brand">
                  {plan.badge || t('website:renderer.pricing.popular')}
                </span>
              ) : null}
            </div>
            <h3 className="at-serif ath-item-title">{plan.name}</h3>
            <p className="atx-plan-price">
              <span className="atx-price">{plan.price}</span>
              {plan.period ? (
                <span className="at-label">{plan.period}</span>
              ) : null}
            </p>
            {plan.description ? (
              <p className="ath-item-text">{plan.description}</p>
            ) : null}
            {plan.features.length > 0 ? (
              <ul
                className="atx-plan-features"
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
                      <Check
                        aria-hidden
                        className="atx-mark"
                        strokeWidth={1.75}
                      />
                    ) : (
                      <X aria-hidden className="atx-mark" strokeWidth={1.75} />
                    )}
                    <span className="min-w-0">
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
            <div className="atx-plan-action">
              <AtelierAction
                cta={plan.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant={plan.highlighted ? 'primary' : 'ghost'}
                arrow={plan.highlighted}
              />
            </div>
          </li>
        ))}
      </ol>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Countdown — display numerals on the ink chapter                       */
/* ------------------------------------------------------------------ */

export function AtelierCountdown({
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
    <AtelierChapter env="ink" labelledBy={headingId} numbered>
      <div {...state.rootProps}>
        <AtelierSectionHeader
          id={headingId}
          title={resolveLocalizedText(config.title, locale)}
          description={resolveLocalizedText(config.description, locale)}
          layout="split"
          className="!mb-10 md:!mb-12"
        />
        {state.status === 'unset' ? (
          <AtelierEngageNote>
            {t('website:renderer.countdown.previewMissing')}
          </AtelierEngageNote>
        ) : (
          <CountdownStatus
            state={state}
            classes={{
              timer: 'atx-timer',
              unit: 'atx-timer-unit',
              value: 'at-numeral atx-timer-value',
              label: 'at-label',
              ended: 'at-subtitle max-w-3xl',
            }}
          />
        )}
        <div
          className={cn(
            'mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between',
            state.status !== 'running' && 'md:justify-end'
          )}
        >
          {state.status === 'running' ? (
            <p className="at-label" suppressHydrationWarning>
              {state.closes}
            </p>
          ) : null}
          <div className="atx-actions">
            <AtelierAction
              cta={config.cta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="ink"
              looks={ATELIER_INK_LOOKS}
              large
            />
            <AtelierAction
              cta={config.secondaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="inkGhost"
              looks={ATELIER_INK_LOOKS}
              large
              arrow={false}
            />
            <AtelierAction
              cta={config.tertiaryCta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant="link"
              looks={ATELIER_INK_LOOKS}
            />
          </div>
        </div>
      </div>
    </AtelierChapter>
  );
}
