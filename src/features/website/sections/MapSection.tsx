/**
 * Map Section (CMS phase 3d) — the theme-neutral renderer: the address
 * card with "Get directions", beside a map that loads only on request
 * (`bodies/MapPanel`).
 */
import { useTranslation } from 'react-i18next';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { MapAddress, MapDirectionsLink, MapEmbed } from './bodies/MapPanel';
import { resolveMap } from './bodies/section-bodies.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type { MapSectionConfig } from '@types';

export function MapSection({
  config,
  linkRenderer,
}: {
  readonly config: MapSectionConfig;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const map = resolveMap(config, locale);
  if (!map.query && linkRenderer) return null;

  return (
    <section className={`${container} ${section}`}>
      {map.title ? (
        <h2 className={`${heading} mb-8 text-center text-3xl text-foreground`}>
          {map.title}
        </h2>
      ) : null}
      {map.query ? (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className={`${cardClass} space-y-4 lg:col-span-2`}>
            <MapAddress
              map={map}
              className="text-base leading-relaxed text-foreground"
              noteClassName="text-sm text-muted-foreground"
            />
            <MapDirectionsLink
              query={map.query}
              linkRenderer={linkRenderer}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--website-primary-solid)] px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <MapEmbed
            query={map.query}
            place={map.addressLines[0] ?? map.query}
            classes={{
              frame: 'rounded-lg border border-border lg:col-span-3',
              placeholder: 'bg-muted text-muted-foreground',
              button:
                'rounded-md border border-border bg-background text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            }}
          />
        </div>
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.map.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
