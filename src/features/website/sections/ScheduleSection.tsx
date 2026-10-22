/**
 * Schedule Section (CMS phase 3d) — the theme-neutral renderer: a table on
 * desktop, cards by day on phones (`bodies/ScheduleTimetable`).
 */
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { ScheduleTimetable } from './bodies/ScheduleTimetable';
import { groupScheduleRows } from './bodies/section-bodies.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { ScheduleSectionConfig } from '@types';

export function ScheduleSection({
  config,
  isPublic = false,
}: {
  readonly config: ScheduleSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const groups = groupScheduleRows(config, locale, isPublic);
  if (groups.length === 0 && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      {title || description ? (
        <div className="mb-8 space-y-2 text-center">
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
      {groups.length > 0 ? (
        <ScheduleTimetable
          groups={groups}
          caption={title}
          locale={locale}
          classes={{
            table: 'overflow-hidden rounded-lg border border-border',
            columnHeader:
              'border-b border-border bg-muted text-sm font-semibold text-foreground',
            dayHeader: 'font-semibold text-foreground',
            dayGroup: 'border-t border-border',
            cell: 'text-sm text-foreground',
            meta: 'text-muted-foreground',
            cardDayHeading: 'text-lg font-semibold text-foreground',
            card: 'rounded-lg border border-border bg-card',
            time: 'text-sm font-medium text-foreground',
            rowTitle: 'font-medium text-foreground',
            sampleBadge:
              'rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.schedule.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
