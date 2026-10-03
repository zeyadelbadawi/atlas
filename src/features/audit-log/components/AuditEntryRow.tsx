/**
 * One audit entry as a readable row: the sentence, its detail lines, then
 * who / role / where / when. Used by the Academy activity log, the Platform
 * audit list, the dashboard widgets and the Platform activity panel, so all
 * of them read the same way.
 *
 * The whole sentence is the row's primary action (opens the details);
 * the actor and academy chips are separate small buttons that narrow the
 * list to that person or academy — only rendered when the caller supports
 * that filter.
 */
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDateFormatter } from '@hooks';
import {
  formatAuditEntry,
  type AuditEntryInput,
} from '../utils/formatAuditEntry';

export interface AuditRowModel {
  readonly id: string;
  readonly occurredAt: string;
  readonly input: AuditEntryInput;
  readonly actorId?: string;
  readonly role?: string;
  readonly academyId?: string;
  readonly academyName?: string;
  readonly organizationName?: string;
}

export interface AuditEntryRowProps {
  readonly row: AuditRowModel;
  readonly onOpen?: (row: AuditRowModel) => void;
  readonly onFilterActor?: (row: AuditRowModel) => void;
  readonly onFilterAcademy?: (row: AuditRowModel) => void;
  /** Hide the academy line (e.g. inside one academy's own log). */
  readonly showAcademy?: boolean;
  /** Compact variant for dashboard widgets: no detail lines. */
  readonly compact?: boolean;
}

export function AuditEntryRow({
  row,
  onOpen,
  onFilterActor,
  onFilterAcademy,
  showAcademy = false,
  compact = false,
}: AuditEntryRowProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const formatted = formatAuditEntry(row.input, i18n, {
    formatDateTime: fmt.dateTime,
  });
  const Chevron = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight;
  const roleLabel =
    row.role && i18n.exists(`auditLog:roles.${row.role}`)
      ? t(`auditLog:roles.${row.role}`)
      : undefined;

  const sentence = (
    <span className="text-sm font-medium text-foreground" dir="auto">
      {formatted.sentence}
    </span>
  );

  return (
    <li className="flex flex-col gap-1.5 py-3" data-testid="audit-entry">
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(row)}
          className="group flex w-full items-start justify-between gap-3 rounded-md text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${formatted.sentence} — ${t('auditLog:list.viewDetails')}`}
        >
          {sentence}
          <Chevron
            className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
            aria-hidden
          />
        </button>
      ) : (
        sentence
      )}

      {!compact && formatted.details.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {formatted.details.map((line) => (
            <li key={line} className="text-xs text-muted-foreground" dir="auto">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {onFilterActor && row.actorId ? (
          <button
            type="button"
            className="font-medium text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onFilterActor(row)}
            title={t('auditLog:filters.filterByActor', {
              name: formatted.actorLabel,
            })}
            aria-label={t('auditLog:filters.filterByActor', {
              name: formatted.actorLabel,
            })}
          >
            {formatted.actorLabel}
          </button>
        ) : (
          <span className="font-medium text-foreground">
            {formatted.actorLabel}
          </span>
        )}
        {roleLabel ? (
          <Badge
            variant="secondary"
            className="px-1.5 py-0 text-[11px] font-normal"
          >
            {roleLabel}
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className="px-1.5 py-0 text-[11px] font-normal"
        >
          {formatted.categoryLabel}
        </Badge>
        {showAcademy && row.academyName ? (
          onFilterAcademy && row.academyId ? (
            <button
              type="button"
              className="underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onFilterAcademy(row)}
              aria-label={t('auditLog:filters.filterByAcademy', {
                name: row.academyName,
              })}
            >
              {t('auditLog:list.inAcademy', { name: row.academyName })}
            </button>
          ) : (
            <span>
              {t('auditLog:list.inAcademy', { name: row.academyName })}
            </span>
          )
        ) : null}
        {showAcademy && row.organizationName && !row.academyName ? (
          <span>{row.organizationName}</span>
        ) : null}
        <span aria-hidden>·</span>
        <time dateTime={row.occurredAt} className="tabular-nums">
          {fmt.dateTime(row.occurredAt)}
        </time>
      </div>
    </li>
  );
}
