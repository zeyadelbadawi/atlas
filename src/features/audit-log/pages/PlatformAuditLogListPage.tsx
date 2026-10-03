/**
 * Platform Audit Log — List Page (Prompt 13, rebuilt for Task 3).
 *
 * The Platform Owner's cross-tenant event feed, read-only. Each event reads
 * as a sentence (`formatAuditEntry`) with who / role / academy / when,
 * instead of a raw action code. Filters: category (including the
 * operator-only Security and Platform groups), date range, free text, and —
 * from any row — "only this person" or "only this academy". Pagination is
 * the backend's cursor feed (`GET audit-log/feed`), so no page ever pays
 * for a full `count()` over the ever-growing table.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { useDebounce } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { AUDIT_CATEGORIES } from '../utils/audit-event-catalog';
import { platformEntryToRow } from '../utils/audit-rows';
import { useAuditLogFeed } from '../hooks/useAuditLogFeed';
import { AuditLogFilters } from '../components/AuditLogFilters';
import {
  EMPTY_AUDIT_FILTERS,
  hasActiveAuditFilters,
  toAuditFeedFilters,
  type AuditFilterState,
} from '../utils/audit-filters';
import { AuditFeedList } from '../components/AuditFeedList';

export default function PlatformAuditLogListPage(): JSX.Element {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);

  const feed = useAuditLogFeed(toAuditFeedFilters(filters, debouncedSearch));
  const rows = useMemo(
    () =>
      (feed.data?.pages ?? []).flatMap((page) =>
        page.items.map(platformEntryToRow)
      ),
    [feed.data]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="auditLog:title"
        descriptionKey="auditLog:subtitle"
      />

      <div className="space-y-4">
        <SectionCard>
          <AuditLogFilters
            value={filters}
            onChange={setFilters}
            categories={AUDIT_CATEGORIES}
            idPrefix="platform-audit"
          />
        </SectionCard>

        <SectionCard>
          <AuditFeedList
            rows={rows}
            isLoading={feed.isLoading}
            error={feed.error}
            onRetry={() => void feed.refetch()}
            hasNextPage={feed.hasNextPage}
            isFetchingNextPage={feed.isFetchingNextPage}
            onLoadMore={() => void feed.fetchNextPage()}
            filtered={hasActiveAuditFilters(filters)}
            emptyTitleKey="auditLog:emptyState"
            emptyDescriptionKey="auditLog:emptyStateDescription"
            filteredEmptyTitleKey="auditLog:emptyState"
            filteredEmptyDescriptionKey="auditLog:emptyStateDescription"
            showAcademy
            onOpen={(row) =>
              navigate(
                buildPath(DASHBOARD_ROUTES.platformAuditLogDetail, {
                  eventId: row.id,
                })
              )
            }
            onFilterActor={(row) =>
              row.actorId
                ? setFilters({
                    ...filters,
                    actor: { id: row.actorId, name: row.input.actorName ?? '' },
                  })
                : undefined
            }
            onFilterAcademy={(row) =>
              row.academyId
                ? setFilters({
                    ...filters,
                    academy: { id: row.academyId, name: row.academyName ?? '' },
                  })
                : undefined
            }
          />
        </SectionCard>
      </div>
    </PageContainer>
  );
}
