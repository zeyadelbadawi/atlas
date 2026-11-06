/**
 * Before/after table for one audit entry's field-level changes.
 *
 * Values arrive already formatted by `formatAuditEntry` (localized enum
 * labels, dates, "Hidden for security" for redacted fields).
 *
 * BIDI. Each value is a `<bdi>` INSIDE its cell, not `dir="auto"` ON the
 * cell. `<bdi>` gives the value its own direction (an English title in an
 * Arabic page keeps its punctuation in order), while the cell keeps the
 * table's direction — so the value is aligned under its header. With
 * `dir="auto"` on the `<td>`, a Latin value ("manara") took the cell's
 * `text-align: start` as LEFT while the Arabic headers sat at the right.
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
                <bdi>{change.label}</bdi>
              </th>
              <td className="break-words px-3 py-2 text-start text-muted-foreground">
                <bdi>{change.from}</bdi>
              </td>
              <td className="break-words px-3 py-2 text-start text-foreground">
                <bdi>{change.to}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
