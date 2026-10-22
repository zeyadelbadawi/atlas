/**
 * "Talk to us" bar (CMS phase 3d) — the base renderer: a short line and up
 * to three buttons on one band. On the public site it shows only once one
 * of its buttons goes somewhere (a WhatsApp number not typed yet does not).
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { WhatsappBarSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { BaseSectionAction } from './engage/BaseSectionAction';
import { hasReachableButton } from './engage/engage-sections.utils';

export interface WhatsappBarSectionProps {
  readonly config: WhatsappBarSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function WhatsappBarSection({
  config,
  pages,
  linkRenderer,
}: WhatsappBarSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const buttons = [config.cta, config.secondaryCta, config.tertiaryCta];
  const reachable = hasReachableButton(buttons, pages, locale);
  if (!reachable && linkRenderer) return null;
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section aria-labelledby={headingId} className={`${container} ${section}`}>
      <div
        className="flex flex-col gap-5 border border-border p-6 md:flex-row md:items-center md:justify-between"
        style={{ borderRadius: 'var(--website-radius)' }}
      >
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: 'var(--website-primary-solid)' }}
          >
            <MessageCircle className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id={headingId}
              className={`${heading} break-words text-xl text-foreground`}
            >
              {resolveLocalizedText(config.title, locale)}
            </h2>
            {description ? (
              <p className="break-words text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      {!reachable ? (
        <p className="mt-2 text-sm text-muted-foreground" role="note">
          {t('website:renderer.whatsappBar.previewNoButtons')}
        </p>
      ) : null}
    </section>
  );
}
