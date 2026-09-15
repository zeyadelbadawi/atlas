/**
 * Add-ons Catalog Management — Platform Owner only.
 *
 * WHAT THIS CONTROLS, AND WHAT IT DOES NOT. Every registered add-on has a
 * customer-store publication state — draft (hidden), coming_soon
 * (announced, not installable) or published (installable under the normal
 * entitlement rules). This page is the one place that state is changed. It
 * is NOT the per-academy install/enable state: the Install Count and
 * Enabled Count columns report on that, they are never driven from here,
 * and publishing an add-on never installs it for anyone.
 *
 * THE BACKEND IS AUTHORITATIVE. `PlatformOwnerGuard` is the boundary (401
 * anonymous, 403 tenant); this page only decides what a platform owner is
 * shown. Search, filter and paging all go to the server. A status change is
 * version-guarded server-side, so a stale row is refused with a conflict
 * the shared error toast surfaces rather than silently overwriting.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PackageCheck, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionLoader } from '@components/loading';
import { EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@utils';
import type { LanguageCode } from '@types';
import {
  usePlatformAddOns,
  useUpdateAddOnCatalogStatus,
} from '../hooks/usePlatformAddOns';
import { CatalogStatusBadge } from '../components/CatalogStatusBadge';
import { ChangeCatalogStatusDialog } from '../components/ChangeCatalogStatusDialog';
import type { AddOnCatalogStatus, PlatformAddOnRow } from '../types';

const STATUSES: readonly AddOnCatalogStatus[] = ['draft', 'coming_soon', 'published'];

export default function PlatformAddOnsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AddOnCatalogStatus | undefined>();
  const [page, setPage] = useState(1);

  // The add-on and the state it would move to, held while the operator
  // confirms. Null when no change is pending.
  const [pending, setPending] = useState<{
    addOn: PlatformAddOnRow;
    target: AddOnCatalogStatus;
  } | null>(null);

  const query = usePlatformAddOns({
    page,
    pageSize: 20,
    search: search || undefined,
    status,
  });
  const mutation = useUpdateAddOnCatalogStatus();

  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  const applyStatus = (next: AddOnCatalogStatus | undefined): void => {
    setStatus(next);
    setPage(1);
  };

  const confirmChange = (): void => {
    if (!pending) return;
    mutation.mutate(
      {
        key: pending.addOn.key,
        input: {
          catalogStatus: pending.target,
          expectedVersion: pending.addOn.version,
        },
      },
      { onSuccess: () => setPending(null) },
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="platformAddOns:title"
        descriptionKey="platformAddOns:subtitle"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t('platformAddOns:searchPlaceholder')}
            className="ps-9"
            aria-label={t('platformAddOns:searchPlaceholder')}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={status === undefined ? 'default' : 'outline'}
            onClick={() => applyStatus(undefined)}
          >
            {t('platformAddOns:filters.all')}
          </Button>
          {STATUSES.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onClick={() => applyStatus(value)}
            >
              {t(`platformAddOns:status.${value}`)}
            </Button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <SectionLoader />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          titleKey="platformAddOns:emptyTitle"
          descriptionKey="platformAddOns:emptyDescription"
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('platformAddOns:columns.addOn')}</TableHead>
                  <TableHead>{t('platformAddOns:columns.description')}</TableHead>
                  <TableHead>{t('platformAddOns:columns.catalogStatus')}</TableHead>
                  <TableHead className="text-end">
                    {t('platformAddOns:columns.installCount')}
                  </TableHead>
                  <TableHead className="text-end">
                    {t('platformAddOns:columns.enabledCount')}
                  </TableHead>
                  <TableHead>{t('platformAddOns:columns.updatedAt')}</TableHead>
                  <TableHead>{t('platformAddOns:columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                      {row.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      <CatalogStatusBadge status={row.catalogStatus} />
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.installCount}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.enabledCount}
                    </TableCell>
                    <TableCell dir="ltr" className="text-xs">
                      {formatDate(row.updatedAt, language, 'short')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.catalogStatus}
                        onValueChange={(next) => {
                          const target = next as AddOnCatalogStatus;
                          if (target !== row.catalogStatus) {
                            setPending({ addOn: row, target });
                          }
                        }}
                      >
                        <SelectTrigger
                          className="w-[160px]"
                          aria-label={t('platformAddOns:changeStatusFor', {
                            name: row.name,
                          })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {t(`platformAddOns:status.${value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t('platformAddOns:pagination.summary', {
              page: pagination.page,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('platformAddOns:pagination.previous')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('platformAddOns:pagination.next')}
            </Button>
          </div>
        </div>
      ) : null}

      <ChangeCatalogStatusDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        addOn={pending?.addOn ?? null}
        targetStatus={pending?.target ?? null}
        isSubmitting={mutation.isPending}
        onConfirm={confirmChange}
      />
    </PageContainer>
  );
}
