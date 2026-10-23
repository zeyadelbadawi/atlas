/**
 * Certificates (CMS phase 3d, batch D) — the base renderer: framed
 * certificate images with captions (`bodies/CertificateGrid`), each linked
 * to its full-size image in a new tab on the public site.
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
import { CertificateGrid } from './bodies/CertificateGrid';
import { resolveCertificates } from './bodies/journey-proof.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { CertificatesSectionConfig } from '@types';

export function CertificatesSection({
  config,
  isPublic = false,
}: {
  readonly config: CertificatesSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const certificates = resolveCertificates(config, locale);
  if (certificates.length === 0 && isPublic) return null;
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
      {certificates.length > 0 ? (
        <CertificateGrid
          certificates={certificates}
          interactive={isPublic}
          classes={{
            frame: 'rounded-md border border-border bg-muted',
            link: 'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            title: 'font-semibold text-foreground',
            meta: 'text-sm text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.certificates.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
