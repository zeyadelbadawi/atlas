/**
 * Academy Activity Log (Task 3) — who changed what in this academy, as
 * readable sentences, newest first.
 *
 * Owner-only: the backend admits the organization owner and an owner/
 * administrator academy member and answers 403 to everyone else (managers
 * and instructors included); the page renders that 403 as its own
 * permission state, never a blank screen. The route and sidebar entry are
 * gated on the owner-only `tenant.dashboard.view` permission so a manager
 * is not offered a page that would refuse them.
 *
 * Filters: category, date range, free-text (item or person) and — from a
 * row — "only this person". Pagination is the server's cursor: "Load more"
 * appends the next page; a filter change starts again from the newest.
 * Clicking a row opens the details sheet with the before/after table.
 */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { useDebounce } from '@hooks';
import { TENANT_AUDIT_CATEGORIES } from '../utils/audit-event-catalog';
import { tenantEntryToRow } from '../utils/audit-rows';
import {
  useAcademyActivityEntry,
  useAcademyActivityLog,
} from '../hooks/useAuditLogFeed';
import { AuditLogFilters } from '../components/AuditLogFilters';
import {
  EMPTY_AUDIT_FILTERS,
  hasActiveAuditFilters,
  toAuditFeedFilters,
  type AuditFilterState,
} from '../utils/audit-filters';
import { AuditFeedList } from '../components/AuditFeedList';
import { AuditEntryDetailsSheet } from '../components/AuditEntryDetailsSheet';
import type { AuditRowModel } from '../components/AuditEntryRow';

export default function AcademyActivityLogPage(): JSX.Element {
  const { academyId = '' } = useParams<{ academyId: string }>();
  const [filters, setFilters] = useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [selected, setSelected] = useState<AuditRowModel | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // No academy filter here — the route already scopes the log to one academy.
  const feedFilters = toAuditFeedFilters(
    { ...filters, academy: undefined },
    debouncedSearch
  );
  const feed = useAcademyActivityLog(academyId, feedFilters);
  const detail = useAcademyActivityEntry(
    academyId,
    sheetOpen ? selected?.id : undefined
  );

  const rows = useMemo(
    () =>
      (feed.data?.pages ?? []).flatMap((page) =>
        page.items.map(tenantEntryToRow)
      ),
    [feed.data]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="auditLog:academyLog.title"
        descriptionKey="auditLog:academyLog.subtitle"
      />

      <div className="space-y-4">
        <SectionCard>
          <AuditLogFilters
            value={filters}
            onChange={setFilters}
            categories={TENANT_AUDIT_CATEGORIES}
            idPrefix="academy-activity"
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
            emptyTitleKey="auditLog:academyLog.empty.title"
            emptyDescriptionKey="auditLog:academyLog.empty.description"
            filteredEmptyTitleKey="auditLog:academyLog.emptyFiltered.title"
            filteredEmptyDescriptionKey="auditLog:academyLog.emptyFiltered.description"
            forbiddenTitleKey="auditLog:academyLog.forbidden.title"
            forbiddenDescriptionKey="auditLog:academyLog.forbidden.description"
            onOpen={(row) => {
              setSelected(row);
              setSheetOpen(true);
            }}
            onFilterActor={(row) =>
              row.actorId
                ? setFilters({
                    ...filters,
                    actor: { id: row.actorId, name: row.input.actorName ?? '' },
                  })
                : undefined
            }
          />
        </SectionCard>
      </div>

      <AuditEntryDetailsSheet
        row={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        changes={detail.data?.changes}
        isLoadingDetail={detail.isLoading}
        detailError={detail.error}
        onRetryDetail={() => void detail.refetch()}
      />
    </PageContainer>
  );
}
