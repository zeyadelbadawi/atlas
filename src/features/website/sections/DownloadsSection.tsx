/**
 * Downloads (CMS phase 3d, batch D) — the base renderer: downloadable
 * resources as whole-row links (`bodies/DownloadList`). The public site
 * leaves the section out until one of its items has a link.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { DownloadList } from './bodies/DownloadList';
import { resolveDownloads } from './bodies/journey-proof.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { DownloadsSectionConfig } from '@types';

export function DownloadsSection({
  config,
  isPublic = false,
}: {
  readonly config: DownloadsSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const downloads = resolveDownloads(config, locale, isPublic);
  if (downloads.length === 0 && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      {title || description ? (
        <div className="mb-8 max-w-2xl space-y-2">
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
      {downloads.length > 0 ? (
        <DownloadList
          downloads={downloads}
          interactive={isPublic}
          classes={{
            row: 'rounded-lg border border-border bg-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
            icon: 'rounded-md bg-muted text-foreground',
            title: 'font-semibold text-foreground',
            description: 'text-sm text-muted-foreground',
            meta: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
            action: 'text-muted-foreground',
            missing: 'text-xs text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.downloads.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
