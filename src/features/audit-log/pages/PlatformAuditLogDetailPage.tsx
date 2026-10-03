/**
 * Platform Audit Log — Detail Page (Prompt 13, rebuilt for Task 3).
 *
 * One event as a sentence, then who (with the operator-facing email) /
 * role / when / organization / academy / category / item, the readable
 * detail lines, the before/after table, and any remaining recorded context
 * with humanized labels — the raw dotted action code stays out of the
 * headline and appears only as a small reference line for support.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorKind } from '@api';
import { useDateFormatter } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useAuditLogEntry } from '../hooks';
import {
  formatAuditEntry,
  fromPlatformEntry,
  humanizeKey,
} from '../utils/formatAuditEntry';
import { AuditChangesTable } from '../components/AuditChangesTable';

export default function PlatformAuditLogDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const {
    data: entry,
    isLoading,
    error,
    refetch,
  } = useAuditLogEntry(eventId ?? '');
  const BackIcon = i18n.dir() === 'rtl' ? ArrowRight : ArrowLeft;

  const back = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(DASHBOARD_ROUTES.platformAuditLog)}
    >
      <BackIcon className="size-4" aria-hidden />
      {t('auditLog:details.back')}
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !entry) {
    return (
      <PageContainer>
        <PageHeader titleKey="auditLog:detailTitle" actions={back} />
        <ErrorState kind={apiErrorKind(error)} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const formatted = formatAuditEntry(fromPlatformEntry(entry), i18n, {
    formatDateTime: fmt.dateTime,
  });
  const roleLabel =
    entry.role && i18n.exists(`auditLog:roles.${entry.role}`)
      ? t(`auditLog:roles.${entry.role}`)
      : entry.role;
  const contextEntries = Object.entries(entry.context ?? {});

  const field = (
    labelKey: string,
    value: string | undefined,
    dir?: 'auto' | 'ltr'
  ) =>
    value ? (
      <div className="space-y-1">
        <dt className="text-xs text-muted-foreground">{t(labelKey)}</dt>
        <dd className="break-words text-sm text-foreground" dir={dir}>
          {value}
        </dd>
      </div>
    ) : null;

  return (
    <PageContainer>
      <PageHeader titleKey="auditLog:detailTitle" actions={back} />

      <div className="space-y-6">
        <SectionCard>
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground" dir="auto">
              {formatted.sentence}
            </p>
            {formatted.details.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {formatted.details.map((line) => (
                  <li key={line} dir="auto">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">
                  {t('auditLog:details.who')}
                </dt>
                <dd className="text-sm text-foreground" dir="auto">
                  {formatted.actorLabel}
                  {roleLabel ? ` · ${roleLabel}` : ''}
                </dd>
                {entry.actor.email ? (
                  <dd className="text-xs text-muted-foreground" dir="ltr">
                    {entry.actor.email}
                  </dd>
                ) : null}
              </div>
              {field('auditLog:details.when', fmt.dateTime(entry.occurredAt))}
              {field(
                'auditLog:details.organization',
                entry.organizationName,
                'auto'
              )}
              {field('auditLog:details.academy', entry.academyName, 'auto')}
              {field('auditLog:details.category', formatted.categoryLabel)}
              {field(
                'auditLog:details.item',
                entry.targetLabel ?? entry.targetId,
                'auto'
              )}
            </dl>
            <p className="text-xs text-muted-foreground" dir="ltr">
              <code className="font-mono">{entry.action}</code>
            </p>
          </div>
        </SectionCard>

        <SectionCard titleKey="auditLog:details.changesTitle">
          <AuditChangesTable changes={formatted.changes} />
        </SectionCard>

        <SectionCard titleKey="auditLog:contextTitle">
          {contextEntries.length === 0 ? (
            <EmptyState titleKey="auditLog:noContext" />
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              {contextEntries.map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <dt className="text-xs text-muted-foreground">
                    {i18n.exists(`auditLog:fields.${key}`)
                      ? t(`auditLog:fields.${key}`)
                      : humanizeKey(key)}
                  </dt>
                  <dd
                    className="break-words text-sm text-foreground"
                    dir="auto"
                  >
                    {value === null
                      ? t('auditLog:values.empty')
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}
