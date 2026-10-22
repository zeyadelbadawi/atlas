/**
 * Atelier — CMS phase 3d sections, set as pages of the studio publication
 * (plan §2): numbered chapters, hairlines and the display face rather than
 * cards.
 *
 * - `logos`: a colophon of partners — equal plates on a hairline grid.
 * - `map`: the address set in the display face beside the map plate.
 * - `schedule`: a ruled timetable, the day in the display face.
 * - `results`: an honour roll — each result large in the display face.
 *
 * Each is the shared body (`sections/bodies/*`) with Atelier's classes and
 * colours (`--atelier-*`, `--website-*`). Empty sections are left out
 * publicly; previews say what to add.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { LogoGrid } from '@/features/website/sections/bodies/LogoGrid';
import {
  groupScheduleRows,
  resolveLogos,
  resolveMap,
  resolveResults,
} from '@/features/website/sections/bodies/section-bodies.logic';
import {
  MapAddress,
  MapDirectionsLink,
  MapEmbed,
} from '@/features/website/sections/bodies/MapPanel';
import { ScheduleTimetable } from '@/features/website/sections/bodies/ScheduleTimetable';
import { ResultsGrid } from '@/features/website/sections/bodies/ResultsGrid';
import {
  AtelierChapter,
  AtelierMonogram,
  AtelierSectionHeader,
} from '../atelier-parts';
import { AtelierPreviewNote } from './atelier-section-utils';
import '../atelier-sections.css';

const SAMPLE_BADGE =
  'border border-dashed border-[var(--atelier-hairline)] px-2 py-0.5 text-xs text-[var(--atelier-text-muted)]';

/* ------------------------------------------------------------------ */
/* Logos — the colophon                                                 */
/* ------------------------------------------------------------------ */

export function AtelierLogos({
  config,
  linkRenderer,
}: SectionRenderProps<'logos'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const logos = resolveLogos(config, locale);
  if (logos.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.logos.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.logos.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <LogoGrid
        logos={logos}
        linkRenderer={linkRenderer}
        classes={{
          list: 'sm:!justify-start',
          tile: 'border border-[var(--atelier-hairline)] bg-[var(--atelier-paper)] transition-colors duration-200 hover:bg-[var(--atelier-paper-deep)] motion-reduce:transition-none',
        }}
      />
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Map — the address plate                                              */
/* ------------------------------------------------------------------ */

export function AtelierMap({
  config,
  linkRenderer,
}: SectionRenderProps<'map'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const map = resolveMap(config, locale);
  if (!map.query) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.map.previewEmpty')}
      </AtelierPreviewNote>
    );
  }

  return (
    <AtelierChapter
      env="deep"
      labelledBy={map.title ? headingId : undefined}
      label={map.title ? undefined : t('website:sections.map.label')}
      numbered
    >
      <AtelierSectionHeader id={headingId} title={map.title} />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-6 border-t border-[var(--atelier-hairline)] pt-6 lg:col-span-5">
          <p className="at-label">{t('website:renderer.map.addressLabel')}</p>
          <MapAddress
            map={map}
            className="at-serif text-[length:var(--at-subtitle)] leading-snug text-[var(--atelier-text)]"
            noteClassName="text-[var(--atelier-text-muted)]"
          />
          <div className="pt-2">
            <MapDirectionsLink
              query={map.query}
              linkRenderer={linkRenderer}
              className="at-btn"
            />
          </div>
        </div>
        <MapEmbed
          query={map.query}
          place={map.addressLines[0] ?? map.query}
          classes={{
            frame: 'border border-[var(--atelier-hairline)] lg:col-span-7',
            placeholder:
              'bg-[var(--atelier-paper)] text-[var(--atelier-text-muted)]',
            button: 'at-btn-ghost',
            notice: 'text-[var(--atelier-text-muted)]',
          }}
        />
      </div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule — the ruled timetable                                       */
/* ------------------------------------------------------------------ */

export function AtelierSchedule({
  config,
  linkRenderer,
}: SectionRenderProps<'schedule'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const groups = groupScheduleRows(config, locale, !!linkRenderer);
  if (groups.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.schedule.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.schedule.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ScheduleTimetable
        groups={groups}
        caption={title}
        locale={locale}
        classes={{
          columnHeader:
            'at-label border-b border-[var(--atelier-text)] !px-0 pe-4',
          dayGroup: 'border-b border-[var(--atelier-hairline)]',
          dayHeader: 'at-serif w-48 !px-0 text-xl text-[var(--atelier-text)]',
          cell: '!py-4 text-[var(--atelier-text)]',
          meta: 'text-[var(--atelier-text-muted)]',
          time: 'at-numeral text-lg',
          rowTitle: 'font-medium',
          cardDayHeading:
            'at-serif border-b border-[var(--atelier-text)] pb-2 text-2xl text-[var(--atelier-text)]',
          card: 'border-b border-[var(--atelier-hairline)] !px-0 text-[var(--atelier-text)]',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Results — the honour roll                                            */
/* ------------------------------------------------------------------ */

export function AtelierResults({
  config,
  linkRenderer,
}: SectionRenderProps<'results'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const results = resolveResults(config, locale, !!linkRenderer);
  if (results.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.results.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.results.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ResultsGrid
        results={results}
        renderInitials={(name) => (
          <AtelierMonogram name={name} className="size-full text-2xl" />
        )}
        classes={{
          list: '!gap-x-6 !gap-y-10 sm:!gap-x-10',
          card: 'border-t border-[var(--atelier-hairline)] pt-5 data-[top]:border-[var(--atelier-brand)]',
          media: 'rounded-full',
          result:
            'at-serif text-[length:var(--at-subtitle)] leading-tight text-[var(--atelier-text)]',
          name: 'text-base font-medium text-[var(--atelier-text)]',
          detail: 'at-label !normal-case !tracking-normal',
          topBadge: 'at-label !text-[var(--atelier-brand)]',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </AtelierChapter>
  );
}
