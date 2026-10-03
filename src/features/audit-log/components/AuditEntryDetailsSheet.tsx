/**
 * Side sheet with one audit entry's full record: the sentence, who / role /
 * when / where / category / item, the detail lines, and the before/after
 * table. The summary row is shown immediately; the before/after arrives
 * with the detail request (`changes` is not part of list rows).
 *
 * Opens from the inline-end edge in both directions (right in English,
 * left in Arabic). Focus handling is Radix Dialog's.
 */
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { apiErrorKind, type ApiError } from '@api';
import type { AuditChanges } from '@types';
import { formatAuditEntry } from '../utils/formatAuditEntry';
import { AuditChangesTable } from './AuditChangesTable';
import type { AuditRowModel } from './AuditEntryRow';

export interface AuditEntryDetailsSheetProps {
  /** `null` keeps the sheet mounted-but-closed so its close animation plays. */
  readonly row: AuditRowModel | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly changes?: AuditChanges;
  readonly isLoadingDetail?: boolean;
  readonly detailError?: ApiError | null;
  readonly onRetryDetail?: () => void;
}

export function AuditEntryDetailsSheet({
  row,
  open,
  onOpenChange,
  changes,
  isLoadingDetail = false,
  detailError = null,
  onRetryDetail,
}: AuditEntryDetailsSheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const formatted = row
    ? formatAuditEntry({ ...row.input, changes }, i18n, {
        formatDateTime: fmt.dateTime,
      })
    : null;
  const roleLabel =
    row?.role && i18n.exists(`auditLog:roles.${row.role}`)
      ? t(`auditLog:roles.${row.role}`)
      : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={i18n.dir() === 'rtl' ? 'left' : 'right'}
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-1 border-b border-border p-6 text-start">
          <SheetTitle>{t('auditLog:details.title')}</SheetTitle>
          <SheetDescription>
            {t('auditLog:details.description')}
          </SheetDescription>
        </SheetHeader>

        {row && formatted ? (
          <div className="space-y-6 p-6" data-testid="audit-details">
            <p className="text-base font-semibold text-foreground" dir="auto">
              {formatted.sentence}
            </p>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">
                {t('auditLog:details.who')}
              </dt>
              <dd className="text-foreground" dir="auto">
                {formatted.actorLabel}
                {roleLabel ? ` · ${roleLabel}` : ''}
              </dd>
              <dt className="text-muted-foreground">
                {t('auditLog:details.when')}
              </dt>
              <dd className="text-foreground">
                <time dateTime={row.occurredAt}>
                  {fmt.dateTime(row.occurredAt)}
                </time>
              </dd>
              {row.academyName ? (
                <>
                  <dt className="text-muted-foreground">
                    {t('auditLog:details.academy')}
                  </dt>
                  <dd className="text-foreground" dir="auto">
                    {row.academyName}
                  </dd>
                </>
              ) : null}
              {row.organizationName ? (
                <>
                  <dt className="text-muted-foreground">
                    {t('auditLog:details.organization')}
                  </dt>
                  <dd className="text-foreground" dir="auto">
                    {row.organizationName}
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">
                {t('auditLog:details.category')}
              </dt>
              <dd className="text-foreground">{formatted.categoryLabel}</dd>
              {row.input.targetLabel ? (
                <>
                  <dt className="text-muted-foreground">
                    {t('auditLog:details.item')}
                  </dt>
                  <dd className="break-words text-foreground" dir="auto">
                    {row.input.targetLabel}
                  </dd>
                </>
              ) : null}
            </dl>

            {formatted.details.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {formatted.details.map((line) => (
                  <li key={line} dir="auto">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('auditLog:details.changesTitle')}
              </h3>
              {isLoadingDetail ? (
                <Skeleton className="h-24 w-full" />
              ) : detailError ? (
                <ErrorState
                  kind={apiErrorKind(detailError)}
                  descriptionKey="auditLog:details.loadError"
                  onRetry={onRetryDetail}
                />
              ) : (
                <AuditChangesTable changes={formatted.changes} />
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
