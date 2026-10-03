/**
 * Before/after table for one audit entry's field-level changes.
 *
 * Values arrive already formatted by `formatAuditEntry` (localized enum
 * labels, dates, "Hidden for security" for redacted fields). Every value
 * cell is `dir="auto"` so an English title inside an Arabic page — or the
 * reverse — renders in its own direction instead of scrambling punctuation.
 */
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@components/feedback';
import type { FormattedAuditChange } from '../utils/formatAuditEntry';

export interface AuditChangesTableProps {
  readonly changes: readonly FormattedAuditChange[];
}

export function AuditChangesTable({
  changes,
}: AuditChangesTableProps): JSX.Element {
  const { t } = useTranslation();

  if (changes.length === 0) {
    return (
      <EmptyState titleKey="auditLog:details.noChanges" className="py-6" />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm" data-testid="audit-changes-table">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('auditLog:details.field')}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('auditLog:details.before')}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('auditLog:details.after')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {changes.map((change) => (
            <tr key={change.field} className="align-top">
              <th
                scope="row"
                className="px-3 py-2 text-start font-medium text-foreground"
              >
                {change.label}
              </th>
              <td
                className="break-words px-3 py-2 text-muted-foreground"
                dir="auto"
              >
                {change.from}
              </td>
              <td className="break-words px-3 py-2 text-foreground" dir="auto">
                {change.to}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
