/**
 * Countdown (CMS phase 3d) — the base renderer: a title, the time left
 * until the deadline (`useCountdown`, `CountdownStatus`), when it closes in
 * the academy's time zone, and up to three buttons. Once the deadline has
 * passed it shows the "after it ends" message instead. The public site
 * leaves the section out until it has a deadline.
 */
import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { CountdownSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { BaseSectionAction } from './engage/BaseSectionAction';
import { CountdownStatus, useCountdown } from './engage/countdown';

export interface CountdownSectionProps {
  readonly config: CountdownSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function CountdownSection({
  config,
  pages,
  linkRenderer,
}: CountdownSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const state = useCountdown(config, locale);
  if (state.status === 'unset' && linkRenderer) return null;
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={headingId}
      className={`${container} ${section}`}
      {...state.rootProps}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <h2
          id={headingId}
          className={`${heading} break-words text-3xl text-foreground`}
        >
          {resolveLocalizedText(config.title, locale)}
        </h2>
        {description ? (
          <p className="break-words text-muted-foreground">{description}</p>
        ) : null}
        {state.status === 'unset' ? (
          <p
            className="border border-dashed border-border p-4 text-sm text-muted-foreground"
            role="note"
          >
            {t('website:renderer.countdown.previewMissing')}
          </p>
        ) : (
          <CountdownStatus
            state={state}
            classes={{
              timer: 'flex flex-wrap justify-center gap-3',
              unit: 'flex min-w-[4.5rem] flex-col items-center rounded-md border border-border px-3 py-2',
              value: 'text-3xl font-bold text-foreground',
              label: 'text-xs text-muted-foreground',
              ended: 'text-lg font-medium text-foreground',
            }}
          />
        )}
        {state.closes && state.status === 'running' ? (
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {state.closes}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <BaseSectionAction
            cta={config.cta}
            pages={pages}
            linkRenderer={linkRenderer}
          />
          <BaseSectionAction
            cta={config.secondaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            look="secondary"
          />
          <BaseSectionAction
            cta={config.tertiaryCta}
            pages={pages}
            linkRenderer={linkRenderer}
            look="link"
          />
        </div>
      </div>
    </section>
  );
}
