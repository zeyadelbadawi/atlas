/**
 * Theme 1 — CMS phase 3d sections: partner logos and student results
 * (trust), the class schedule and the map (visiting). Each is the shared
 * body (`sections/bodies/*`) in Theme 1's own frame, heading, cards,
 * actions and brand-mapped colours (`--website-*`); nothing here reads a
 * raw brand colour.
 *
 * On the public site an empty section is left out; a preview says what to
 * add instead of leaving an unexplained gap.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { LogoGrid } from '../sections/bodies/LogoGrid';
import {
  groupScheduleRows,
  resolveLogos,
  resolveMap,
  resolveResults,
} from '../sections/bodies/section-bodies.logic';
import {
  MapAddress,
  MapDirectionsLink,
  MapEmbed,
} from '../sections/bodies/MapPanel';
import { ScheduleTimetable } from '../sections/bodies/ScheduleTimetable';
import { ResultsGrid } from '../sections/bodies/ResultsGrid';
import { PreviewEmptyNote } from '../sections/bodies/PreviewEmptyNote';
import { InitialsAvatar, T1Section, T1SectionHeader } from './t1-parts';

const SAMPLE_BADGE =
  'rounded-full border border-dashed border-[var(--website-input-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--website-foreground-muted)]';

function T1EmptyNote({ children }: { readonly children: string }) {
  return (
    <PreviewEmptyNote className="rounded-[var(--t1-radius-card)] border-[var(--website-input-border)] text-[var(--website-foreground-muted)]">
      {children}
    </PreviewEmptyNote>
  );
}

/* ------------------------------------------------------------------ */
/* Logos                                                                */
/* ------------------------------------------------------------------ */

export function T1Logos({
  config,
  linkRenderer,
}: SectionRenderProps<'logos'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const logos = resolveLogos(config, locale);
  if (logos.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      {logos.length > 0 ? (
        <LogoGrid
          logos={logos}
          linkRenderer={linkRenderer}
          classes={{
            tile: 't1-card t1-focus transition-colors duration-200 hover:border-[var(--website-input-border)] motion-reduce:transition-none',
          }}
        />
      ) : (
        <T1EmptyNote>{t('website:renderer.logos.previewEmpty')}</T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                  */
/* ------------------------------------------------------------------ */

export function T1Map({
  config,
  linkRenderer,
}: SectionRenderProps<'map'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const map = resolveMap(config, locale);
  if (!map.query && linkRenderer) return null;

  return (
    <T1Section tone="soft" labelledBy={map.title ? headingId : undefined}>
      <T1SectionHeader id={headingId} title={map.title} />
      {map.query ? (
        <div className="grid items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="t1-card flex flex-col gap-5 p-6 md:p-8 lg:col-span-5">
            <p className="text-sm font-semibold text-[var(--website-link)]">
              {t('website:renderer.map.addressLabel')}
            </p>
            <MapAddress
              map={map}
              className="text-lg leading-relaxed text-[var(--website-foreground)]"
              noteClassName="text-[var(--website-foreground-muted)]"
            />
            <div className="mt-auto pt-2">
              <MapDirectionsLink
                query={map.query}
                linkRenderer={linkRenderer}
                className="t1-cta"
              />
            </div>
          </div>
          <MapEmbed
            query={map.query}
            place={map.addressLines[0] ?? map.query}
            classes={{
              frame:
                'rounded-[var(--t1-radius-card)] border border-[var(--website-border)] lg:col-span-7',
              placeholder:
                'bg-[var(--website-surface)] text-[var(--website-foreground-muted)]',
              button: 't1-btn-secondary',
              notice: 'text-[var(--website-foreground-muted)]',
            }}
          />
        </div>
      ) : (
        <T1EmptyNote>{t('website:renderer.map.previewEmpty')}</T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule                                                             */
/* ------------------------------------------------------------------ */

export function T1Schedule({
  config,
  linkRenderer,
}: SectionRenderProps<'schedule'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const groups = groupScheduleRows(config, locale, !!linkRenderer);
  if (groups.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      {groups.length > 0 ? (
        <ScheduleTimetable
          groups={groups}
          caption={title}
          locale={locale}
          classes={{
            table:
              't1-card overflow-hidden [border-collapse:separate] [border-spacing:0]',
            columnHeader:
              'bg-[var(--website-surface)] text-sm font-semibold text-[var(--website-foreground-muted)]',
            // A rule above each day; a lighter one between its rows.
            dayGroup:
              '[&>tr:first-child>*]:border-t [&>tr:first-child>*]:border-[var(--website-border)] [&>tr+tr>td]:border-t [&>tr+tr>td]:border-dashed [&>tr+tr>td]:border-[var(--website-border)]',
            dayHeader:
              'w-40 font-display font-bold text-[var(--website-foreground)]',
            cell: 'text-[var(--website-foreground)]',
            meta: 'text-[var(--website-foreground-muted)]',
            time: 'font-semibold text-[var(--website-foreground)]',
            rowTitle: 'font-semibold',
            cardDayHeading:
              'font-display text-lg font-bold text-[var(--website-foreground)]',
            card: 't1-card',
            sampleBadge: SAMPLE_BADGE,
          }}
        />
      ) : (
        <T1EmptyNote>{t('website:renderer.schedule.previewEmpty')}</T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                              */
/* ------------------------------------------------------------------ */

export function T1Results({
  config,
  linkRenderer,
}: SectionRenderProps<'results'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const results = resolveResults(config, locale, !!linkRenderer);
  if (results.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      {results.length > 0 ? (
        <ResultsGrid
          results={results}
          renderInitials={(name) => (
            <InitialsAvatar name={name} className="size-full text-xl" />
          )}
          classes={{
            card: 't1-card p-4 sm:p-6 data-[top]:border-[var(--website-highlight)]',
            media: 'rounded-full',
            result:
              'font-display text-2xl font-bold leading-tight tracking-tight text-[var(--website-foreground)] sm:text-3xl',
            name: 'text-base font-semibold text-[var(--website-foreground)]',
            detail: 'text-sm text-[var(--website-foreground-muted)]',
            topBadge:
              'rounded-full bg-[var(--website-chip-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--website-chip-fg)]',
            sampleBadge: SAMPLE_BADGE,
          }}
        />
      ) : (
        <T1EmptyNote>{t('website:renderer.results.previewEmpty')}</T1EmptyNote>
      )}
    </T1Section>
  );
}
