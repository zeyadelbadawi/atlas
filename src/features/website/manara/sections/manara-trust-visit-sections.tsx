/**
 * Manara — CMS phase 3d sections in the beacon's language (plan §3): bold
 * blocks, rounded cards, pills and the display face.
 *
 * - `logos`: partner logos on equal cards.
 * - `map`: the address card with a bold directions button beside the map.
 * - `schedule`: the timetable as one card, each day a pill.
 * - `results`: scoreboard cards — the result as a big display figure, a
 *   top achiever marked by an accent pill (icon and text).
 *
 * Each is the shared body (`sections/bodies/*`) with Manara's classes and
 * ground colours (`--mn-env-*`). Empty sections are left out publicly;
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
import {
  ManaraBlock,
  ManaraMonogram,
  ManaraSectionHeader,
} from '../manara-parts';
import { ManaraPreviewNote } from './manara-section-utils';
import '../manara-sections.css';

const SAMPLE_BADGE =
  'rounded-full border border-dashed border-[var(--mn-env-line)] px-2.5 py-0.5 text-xs font-bold text-[var(--mn-env-text-muted)]';

/* ------------------------------------------------------------------ */
/* Logos                                                                */
/* ------------------------------------------------------------------ */

export function ManaraLogos({
  config,
  linkRenderer,
}: SectionRenderProps<'logos'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const logos = resolveLogos(config, locale);
  if (logos.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.logos.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.logos.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <LogoGrid
        logos={logos}
        linkRenderer={linkRenderer}
        classes={{
          tile: 'mn-card !flex-row hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        }}
      />
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                  */
/* ------------------------------------------------------------------ */

export function ManaraMap({
  config,
  linkRenderer,
}: SectionRenderProps<'map'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const map = resolveMap(config, locale);
  if (!map.query) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.map.previewEmpty')}
      </ManaraPreviewNote>
    );
  }

  return (
    <ManaraBlock
      env="soft"
      labelledBy={map.title ? headingId : undefined}
      label={map.title ? undefined : t('website:sections.map.label')}
    >
      <ManaraSectionHeader id={headingId} title={map.title} />
      <div className="grid items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="mn-card gap-5 p-6 md:p-8 lg:col-span-5">
          <p className="mn-label text-[var(--mn-env-link)]">
            {t('website:renderer.map.addressLabel')}
          </p>
          <MapAddress
            map={map}
            className="mn-font-display text-xl font-bold leading-snug"
            noteClassName="mn-muted"
          />
          <div className="mt-auto pt-2">
            <MapDirectionsLink
              query={map.query}
              linkRenderer={linkRenderer}
              className="mn-btn"
            />
          </div>
        </div>
        <MapEmbed
          query={map.query}
          place={map.addressLines[0] ?? map.query}
          classes={{
            frame:
              'rounded-[var(--mn-radius-lg)] border border-[var(--mn-env-line)] lg:col-span-7',
            placeholder:
              'bg-[var(--mn-env-card)] text-[var(--mn-env-text-muted)]',
            button: 'mn-btn mn-btn-outline',
            notice: 'text-[var(--mn-env-text-muted)]',
          }}
        />
      </div>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule                                                             */
/* ------------------------------------------------------------------ */

export function ManaraSchedule({
  config,
  linkRenderer,
}: SectionRenderProps<'schedule'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const groups = groupScheduleRows(config, locale, !!linkRenderer);
  if (groups.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.schedule.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.schedule.label')}
    >
      <ManaraSectionHeader
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
          table:
            'mn-card !table overflow-hidden [border-collapse:separate] [border-spacing:0] max-md:!hidden',
          columnHeader:
            'mn-label bg-[var(--mn-env-card-raised)] text-[var(--mn-env-text-muted)]',
          dayGroup:
            '[&>tr:first-child>*]:border-t [&>tr:first-child>*]:border-[var(--mn-env-line)]',
          dayHeader:
            'mn-font-display w-44 text-lg font-extrabold text-[var(--mn-env-text)]',
          cell: '!py-4',
          meta: 'mn-muted',
          time: 'mn-font-display font-bold text-[var(--mn-env-link)]',
          rowTitle: 'font-semibold',
          cardDayHeading: 'mn-pill !text-sm',
          card: 'mn-card',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Results — the scoreboard                                             */
/* ------------------------------------------------------------------ */

export function ManaraResults({
  config,
  linkRenderer,
}: SectionRenderProps<'results'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const results = resolveResults(config, locale, !!linkRenderer);
  if (results.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.results.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      env="soft"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.results.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ResultsGrid
        results={results}
        renderInitials={(name) => (
          <ManaraMonogram name={name} className="!size-full" />
        )}
        classes={{
          card: 'mn-card p-4 sm:p-6 data-[top]:border-2 data-[top]:border-[var(--mn-accent)]',
          media: 'rounded-[var(--mn-radius)]',
          result:
            'mn-font-display text-3xl font-extrabold leading-none tracking-tight sm:text-4xl',
          name: 'mn-font-display text-base font-bold',
          detail: 'mn-muted text-sm',
          topBadge: 'mn-pill',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </ManaraBlock>
  );
}
