/**
 * CMS phase 3d — the schedule section's shared body (`schedule`).
 *
 * - Desktop: a real `<table>` with column headers, one `<tbody>` per day
 *   (Saturday first, the order an Egyptian week runs) whose first cell is
 *   the day as a row-group header, rows sorted by start time.
 * - Phones: the same rows as stacked cards under a heading per day — no
 *   horizontal scroll, nothing to pan.
 * Only one of the two is displayed at a width (`display: none` hides the
 * other from assistive technology too).
 *
 * Times are stored as 24-hour `HH:MM` and shown in the visitor's locale:
 * "4:00 PM" in English, "٤:٠٠ م" in Arabic — the digits the themes already
 * use for numbers (`formatT1Number`'s `ar-EG`).
 *
 * Sample (starter) rows never reach the public site; previews label them.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import {
  formatScheduleTime,
  type ResolvedScheduleRow,
  type ScheduleDayGroup,
} from './section-bodies.logic';
import type { PublicWebsiteLocale, ScheduleDay } from '@types';

export interface ScheduleTimetableClasses {
  readonly table?: string;
  /** Column headers. */
  readonly columnHeader?: string;
  /** The day cell that heads each day's rows. */
  readonly dayHeader?: string;
  /** The day's name inside that cell and over each day's cards. */
  readonly dayLabel?: string;
  readonly cell?: string;
  /** Each day's `<tbody>` (e.g. a rule between days). */
  readonly dayGroup?: string;
  readonly cardDayHeading?: string;
  readonly card?: string;
  readonly time?: string;
  readonly rowTitle?: string;
  readonly meta?: string;
  readonly sampleBadge?: string;
}

function TimeRange({
  row,
  locale,
  className,
}: {
  readonly row: ResolvedScheduleRow;
  readonly locale: PublicWebsiteLocale;
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      <time dateTime={row.start}>{formatScheduleTime(row.start, locale)}</time>
      <span aria-hidden> – </span>
      <span className="sr-only"> {t('website:renderer.schedule.to')} </span>
      <time dateTime={row.end}>{formatScheduleTime(row.end, locale)}</time>
    </span>
  );
}

function SampleBadge({
  className,
}: {
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <span data-sample-badge="" className={cn('ms-2 align-middle', className)}>
      {t('website:renderer.testimonials.sampleBadge')}
    </span>
  );
}

export function ScheduleTimetable({
  groups,
  caption,
  locale,
  classes = {},
}: {
  readonly groups: readonly ScheduleDayGroup[];
  /** The table's accessible name (the section title). */
  readonly caption: string;
  readonly locale: PublicWebsiteLocale;
  readonly classes?: ScheduleTimetableClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const rows = groups.flatMap((group) => group.rows);
  const hasTeacher = rows.some((row) => row.teacher);
  const hasLocation = rows.some((row) => row.location);
  const dayLabel = (day: ScheduleDay) => t(`website:days.${day}`);
  const cell = cn('px-4 py-3 text-start align-top', classes.cell);

  return (
    <div data-schedule="">
      <table
        className={cn(
          'hidden w-full border-collapse text-start md:table',
          classes.table
        )}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {[
              'day',
              'time',
              'class',
              ...(hasTeacher ? ['teacher'] : []),
              ...(hasLocation ? ['location'] : []),
            ].map((column) => (
              <th
                key={column}
                scope="col"
                className={cn(
                  'px-4 py-3 text-start align-bottom',
                  classes.columnHeader
                )}
              >
                {t(`website:renderer.schedule.${column}`)}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.day} className={classes.dayGroup}>
            {group.rows.map((row, index) => (
              <tr key={row.id}>
                {index === 0 ? (
                  <th
                    scope="rowgroup"
                    rowSpan={group.rows.length}
                    className={cn(cell, classes.dayHeader)}
                  >
                    <span className={classes.dayLabel}>
                      {dayLabel(group.day)}
                    </span>
                  </th>
                ) : null}
                <td className={cell}>
                  <TimeRange
                    row={row}
                    locale={locale}
                    className={classes.time}
                  />
                </td>
                <td className={cn(cell, 'break-words')}>
                  <span className={classes.rowTitle}>{row.title}</span>
                  {row.sample ? (
                    <SampleBadge className={classes.sampleBadge} />
                  ) : null}
                </td>
                {hasTeacher ? (
                  <td className={cn(cell, 'break-words', classes.meta)}>
                    {row.teacher}
                  </td>
                ) : null}
                {hasLocation ? (
                  <td className={cn(cell, 'break-words', classes.meta)}>
                    {row.location}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      <div className="space-y-8 md:hidden">
        {groups.map((group) => (
          <div key={group.day}>
            <h3 className={cn('mb-3', classes.cardDayHeading)}>
              <span className={classes.dayLabel}>{dayLabel(group.day)}</span>
            </h3>
            <ul role="list" className="space-y-3">
              {group.rows.map((row) => (
                <li key={row.id} className={cn('min-w-0 p-4', classes.card)}>
                  <p>
                    <TimeRange
                      row={row}
                      locale={locale}
                      className={classes.time}
                    />
                  </p>
                  <p className={cn('mt-1 break-words', classes.rowTitle)}>
                    {row.title}
                    {row.sample ? (
                      <SampleBadge className={classes.sampleBadge} />
                    ) : null}
                  </p>
                  {row.teacher || row.location ? (
                    <p className={cn('mt-1 break-words', classes.meta)}>
                      {[row.teacher, row.location].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
