/**
 * Notice strip (CMS phase 3d, batch C) — the theme-neutral renderer the
 * retired themes use: one short line and at most one button on a band.
 * Never dismissible and never moving, so every visitor (and every edge
 * cache) sees the same page. Its tones use the base palette's own pairs.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type {
  AnnouncementBarSectionConfig,
  AnnouncementTone,
  WebsitePage,
} from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { BaseSectionAction } from './engage/BaseSectionAction';

const TONES: Record<AnnouncementTone, string> = {
  brand: 'bg-[var(--website-cta)] text-[var(--website-cta-foreground)]',
  soft: 'bg-muted text-foreground',
  dark: 'bg-foreground text-background',
};

export function AnnouncementBarSection({
  config,
  pages,
  linkRenderer,
}: {
  readonly config: AnnouncementBarSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const text = resolveLocalizedText(config.text, locale);
  if (!text) return null;

  return (
    <section
      aria-labelledby={headingId}
      data-announcement-tone={config.tone}
      className={cn('py-3', TONES[config.tone] ?? TONES.brand)}
    >
      <div
        className={cn(
          container,
          'flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center'
        )}
      >
        <h2 id={headingId} className="sr-only">
          {t('website:renderer.announcement.label')}
        </h2>
        <p className="min-w-0 break-words font-medium">{text}</p>
        <BaseSectionAction
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          look="secondary"
        />
      </div>
    </section>
  );
}
