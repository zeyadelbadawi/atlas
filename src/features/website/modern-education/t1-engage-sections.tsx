/**
 * Theme 1 renderers for the CMS phase 3d sections: the "Talk to us" bar,
 * the click-to-play video, pricing plans and the registration countdown.
 * What each draws is resolved by the shared helpers (`sections/engage`);
 * this file only gives them Theme 1's shell, type, cards and actions.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MessageCircle, X } from 'lucide-react';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { isYouTubeVideoId } from '../utils/section-media-values.utils';
import { Reveal } from '../primitives';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { VideoFacade } from '../sections/engage/VideoFacade';
import { CountdownStatus, useCountdown } from '../sections/engage/countdown';
import {
  hasReachableButton,
  resolvePricingPlans,
} from '../sections/engage/engage-sections.utils';
import {
  T1Action,
  T1Heading,
  T1Section,
  T1SectionHeader,
  T1_INK_LOOKS,
} from './t1-parts';

/** §G: a group rises with a 50ms stagger, capped at 400ms in total. */
const stagger = (index: number) => Math.min(index * 50, 400);

/** A preview-only note where the public site draws nothing yet. */
function T1EngageNote({
  children,
  ink = false,
}: {
  readonly children: string;
  readonly ink?: boolean;
}): JSX.Element {
  return (
    <p
      data-preview-note=""
      className={cn(
        'rounded-[var(--t1-radius-card)] border border-dashed px-6 py-6 text-center text-sm',
        ink
          ? 'border-[hsl(0_0%_100%/0.35)] text-[var(--website-ink-muted)]'
          : 'border-[var(--website-input-border)] text-[var(--website-foreground-muted)]'
      )}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* "Talk to us" bar                                                      */
/* ------------------------------------------------------------------ */

export function T1WhatsappBar({
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
    <T1Section labelledBy={headingId} className="!py-10 md:!py-12">
      <div className="t1-card t1-bar flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-8">
        <div className="flex min-w-0 items-start gap-4">
          <span className="t1-icon-tile" aria-hidden>
            <MessageCircle className="size-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2
              id={headingId}
              className="break-words font-display text-xl font-bold text-[var(--website-foreground)] md:text-2xl"
            >
              {resolveLocalizedText(config.title, locale)}
            </h2>
            {description ? (
              <p className="break-words leading-relaxed text-[var(--website-foreground-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <T1Action
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
          />
          <T1Action
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="secondary"
          />
          <T1Action
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="link"
          />
        </div>
      </div>
      {!reachable ? (
        <div className="mt-4">
          <T1EngageNote>
            {t('website:renderer.whatsappBar.previewNoButtons')}
          </T1EngageNote>
        </div>
      ) : null}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Video                                                                 */
/* ------------------------------------------------------------------ */

export function T1Video({
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
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <figure className="mx-auto max-w-4xl">
        {hasVideo ? (
          <VideoFacade
            videoId={config.videoId}
            title={title}
            poster={config.poster}
            interactive={!!linkRenderer}
            frameClassName="t1-media t1-video-frame"
            playClassName="t1-video-play"
            sizes="(min-width: 1024px) 56rem, 100vw"
          />
        ) : (
          <T1EngageNote>
            {t('website:renderer.video.previewMissing')}
          </T1EngageNote>
        )}
        {caption ? (
          <figcaption className="mt-4 text-center text-sm text-[var(--website-foreground-muted)]">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                               */
/* ------------------------------------------------------------------ */

const PLAN_COLUMNS: Record<number, string> = {
  1: 'mx-auto max-w-md',
  2: 'mx-auto max-w-4xl md:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
};

export function T1Pricing({
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
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <ul
        className={cn(
          'grid items-stretch gap-6',
          PLAN_COLUMNS[plans.length] ?? PLAN_COLUMNS[4]
        )}
      >
        {plans.map((plan, index) => (
          <li key={plan.id} className="flex">
            <Reveal delayMs={stagger(index)} className="flex w-full">
              <div
                className="t1-card t1-plan flex w-full flex-col p-6 md:p-8"
                data-highlighted={plan.highlighted ? '' : undefined}
              >
                {plan.highlighted ? (
                  <p className="t1-plan-badge">
                    {plan.badge || t('website:renderer.pricing.popular')}
                  </p>
                ) : null}
                <h3 className="break-words font-display text-lg font-bold text-[var(--website-foreground)]">
                  {plan.name}
                </h3>
                {plan.description ? (
                  <p className="mt-1.5 break-words text-sm leading-relaxed text-[var(--website-foreground-muted)]">
                    {plan.description}
                  </p>
                ) : null}
                <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="t1-plan-price">{plan.price}</span>
                  {plan.period ? (
                    <span className="text-sm font-medium text-[var(--website-foreground-muted)]">
                      {plan.period}
                    </span>
                  ) : null}
                </p>
                {plan.features.length > 0 ? (
                  <ul
                    className="mt-6 flex-1 space-y-3 border-t border-[var(--website-border)] pt-6"
                    aria-label={t('website:renderer.pricing.featuresLabel', {
                      plan: plan.name,
                    })}
                  >
                    {plan.features.map((feature) => (
                      <li
                        key={feature.id}
                        className="flex items-start gap-3 text-[0.9375rem]"
                        data-included={feature.included ? '' : undefined}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            't1-plan-mark',
                            !feature.included && 't1-plan-mark-off'
                          )}
                        >
                          {feature.included ? (
                            <Check className="size-3.5" strokeWidth={2.5} />
                          ) : (
                            <X className="size-3.5" strokeWidth={2.5} />
                          )}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 break-words',
                            feature.included
                              ? 'text-[var(--website-foreground)]'
                              : 'text-[var(--website-foreground-muted)]'
                          )}
                        >
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
                <div className="mt-8 [&>*]:w-full">
                  <T1Action
                    cta={plan.cta}
                    pages={pages}
                    linkRenderer={linkRenderer}
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                  />
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Countdown — on the ink band                                           */
/* ------------------------------------------------------------------ */

export function T1Countdown({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'countdown'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const state = useCountdown(config, locale);
  if (state.status === 'unset' && linkRenderer) return null;
  const description = resolveLocalizedText(config.description, locale);

  return (
    <T1Section tone="ink" labelledBy={headingId}>
      <div
        className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center"
        {...state.rootProps}
      >
        <div className="space-y-4">
          <T1Heading
            id={headingId}
            className="!text-[var(--website-ink-foreground)]"
          >
            {resolveLocalizedText(config.title, locale)}
          </T1Heading>
          {description ? (
            <p className="t1-lead mx-auto !text-[var(--website-ink-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {state.status === 'unset' ? (
          <T1EngageNote ink>
            {t('website:renderer.countdown.previewMissing')}
          </T1EngageNote>
        ) : (
          <CountdownStatus
            state={state}
            className="w-full"
            classes={{
              timer: 'mx-auto grid max-w-xl grid-cols-4 gap-2 sm:gap-4',
              unit: 't1-countdown-unit',
              value: 't1-countdown-value font-display',
              label: 't1-countdown-label',
              ended:
                'mx-auto max-w-2xl font-display text-xl font-bold text-[var(--website-ink-foreground)] md:text-2xl',
            }}
          />
        )}
        {state.status === 'running' ? (
          <p
            className="text-sm text-[var(--website-ink-muted)]"
            suppressHydrationWarning
          >
            {state.closes}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <T1Action
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="ink"
            looks={T1_INK_LOOKS}
            arrow
          />
          <T1Action
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="inkSecondary"
            looks={T1_INK_LOOKS}
          />
          <T1Action
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            variant="inkLink"
            looks={T1_INK_LOOKS}
          />
        </div>
      </div>
    </T1Section>
  );
}
