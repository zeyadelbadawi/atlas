/**
 * Logos Section (CMS phase 3d) — the theme-neutral renderer: partner and
 * accreditation logos in a calm wrapping grid (`bodies/LogoGrid`).
 */
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { LogoGrid } from './bodies/LogoGrid';
import { resolveLogos } from './bodies/section-bodies.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type { LogosSectionConfig } from '@types';

export function LogosSection({
  config,
  linkRenderer,
}: {
  readonly config: LogosSectionConfig;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const logos = resolveLogos(config, locale);
  if (logos.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      {title || description ? (
        <div className="mb-10 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {logos.length > 0 ? (
        <LogoGrid
          logos={logos}
          linkRenderer={linkRenderer}
          classes={{
            tile: 'rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.logos.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
