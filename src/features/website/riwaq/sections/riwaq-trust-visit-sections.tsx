/**
 * Riwaq — CMS phase 3d sections on the colonnade's ruled grid (plan §2):
 * hairline cells, the marker square, square corners and the page rail.
 *
 * - `logos`: partner logos in equal ruled cells.
 * - `map`: the address set as a subtitle beside the map window.
 * - `schedule`: a ruled ledger, each day opened by a marked label.
 * - `results`: ruled cells, the result as a figure; a top achiever's cell
 *   carries the marker tick and a labelled badge.
 *
 * Each is the shared body (`sections/bodies/*`) with Riwaq's classes and
 * ground colours (`--rw-env-*`). Empty sections are left out publicly;
 * previews say what to add.
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
import { RiwaqBand, RiwaqMonogram, RiwaqSectionHead } from '../riwaq-parts';
import { RiwaqPreviewNote } from './riwaq-section-utils';
import '../riwaq-sections.css';

const SAMPLE_BADGE = 'rw-badge';

/* ------------------------------------------------------------------ */
/* Logos                                                                */
/* ------------------------------------------------------------------ */

export function RiwaqLogos({
  config,
  linkRenderer,
}: SectionRenderProps<'logos'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const logos = resolveLogos(config, locale);
  if (logos.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.logos.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.logos.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <LogoGrid
        logos={logos}
        linkRenderer={linkRenderer}
        classes={{
          list: 'sm:!justify-start',
          tile: 'rw-cell !p-4 transition-colors duration-200 hover:border-[var(--rw-env-rule-strong)] motion-reduce:transition-none sm:!p-5',
        }}
      />
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                  */
/* ------------------------------------------------------------------ */

export function RiwaqMap({
  config,
  linkRenderer,
}: SectionRenderProps<'map'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const map = resolveMap(config, locale);
  if (!map.query) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.map.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }

  return (
    <RiwaqBand
      ground="stone"
      labelledBy={map.title ? headingId : undefined}
      label={map.title ? undefined : t('website:sections.map.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        label={t('website:renderer.map.addressLabel')}
        title={map.title}
      />
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="rw-cell flex flex-col gap-5 lg:col-span-5" data-tick="">
          <MapAddress
            map={map}
            className="rw-subtitle"
            noteClassName="text-[var(--rw-env-muted)]"
          />
          <div className="mt-auto pt-2">
            <MapDirectionsLink
              query={map.query}
              linkRenderer={linkRenderer}
              className="rw-btn"
            />
          </div>
        </div>
        <MapEmbed
          query={map.query}
          place={map.addressLines[0] ?? map.query}
          classes={{
            frame: 'border border-[var(--rw-env-rule)] lg:col-span-7',
            placeholder: 'bg-[var(--rw-env-bg)] text-[var(--rw-env-muted)]',
            button: 'rw-btn rw-btn-line',
            notice: 'text-[var(--rw-env-muted)]',
          }}
        />
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule — the ledger                                                */
/* ------------------------------------------------------------------ */

export function RiwaqSchedule({
  config,
  linkRenderer,
}: SectionRenderProps<'schedule'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const groups = groupScheduleRows(config, locale, !!linkRenderer);
  if (groups.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.schedule.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.schedule.label')}
      colonnade={false}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <ScheduleTimetable
        groups={groups}
        caption={title}
        locale={locale}
        classes={{
          table: 'border-y border-[var(--rw-env-rule-strong)]',
          columnHeader:
            'border-b border-[var(--rw-env-rule)] text-[0.8125rem] font-medium tracking-[0.04em] text-[var(--rw-env-muted)]',
          dayGroup: 'border-t border-[var(--rw-env-rule)]',
          dayHeader: 'w-44',
          dayLabel:
            "rw-label !text-[var(--rw-env-heading)] before:size-2 before:flex-none before:bg-[var(--rw-env-marker)] before:content-['']",
          cell: '!py-4 text-[var(--rw-env-text)]',
          meta: 'text-[var(--rw-env-muted)]',
          time: 'rw-num font-medium text-[var(--rw-env-heading)]',
          rowTitle: 'font-medium',
          cardDayHeading:
            'rw-label border-t border-[var(--rw-env-rule-strong)] pt-2 !text-[var(--rw-env-heading)]',
          card: 'rw-cell',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                              */
/* ------------------------------------------------------------------ */

export function RiwaqResults({
  config,
  linkRenderer,
}: SectionRenderProps<'results'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const results = resolveResults(config, locale, !!linkRenderer);
  if (results.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.results.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.results.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <ResultsGrid
        results={results}
        renderInitials={(name) => (
          <RiwaqMonogram name={name} className="!size-full" />
        )}
        classes={{
          // A top achiever's cell carries the marker tick (`.rw-cell[data-tick]`).
          card: "rw-cell data-[top]:after:pointer-events-none data-[top]:after:absolute data-[top]:after:-start-px data-[top]:after:-top-px data-[top]:after:size-3 data-[top]:after:border-s-2 data-[top]:after:border-t-2 data-[top]:after:border-[var(--rw-env-marker)] data-[top]:after:content-['']",
          result:
            'rw-subtitle rw-num !text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] !font-medium',
          name: 'text-base font-medium text-[var(--rw-env-heading)]',
          detail: 'text-sm text-[var(--rw-env-muted)]',
          topBadge: 'rw-badge',
          sampleBadge: 'rw-chip',
        }}
      />
    </RiwaqBand>
  );
}
