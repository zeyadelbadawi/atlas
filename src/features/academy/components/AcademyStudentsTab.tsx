/**
 * Academy Students tab (P64 Phase 1).
 *
 * The learner roster: who registered through the academy website, their
 * membership state and enrollment counts. Search, status filter, sort and
 * paging are all server-side (`GET academies/:id/students`) — the table
 * never filters a page locally, so a filter always sees the whole roster.
 *
 * A row opens `AcademyStudentDrawer`; management actions live there.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput, StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { DataTable } from '@components/table';
import { useDateFormatter, usePagination } from '@hooks';
import { useAcademyStudents } from '../hooks';
import {
  getRosterSourceLabelKey,
  getRosterStatusLabelKey,
  getRosterStatusTone,
} from '../utils/academy-roster.utils';
import { AcademyStudentDrawer } from './AcademyStudentDrawer';
import type {
  AcademyRosterQuery,
  AcademyRosterSortBy,
  AcademyRosterSortDir,
  AcademyRosterStatusFilter,
  AcademyRosterStudent,
} from '@types';

export interface AcademyStudentsTabProps {
  readonly academyId: string;
}

type StatusFilterValue = AcademyRosterStatusFilter | 'all';

/** `sortBy:sortDir` pairs offered in the sort select. */
const SORT_OPTIONS = [
  'joinedAt:desc',
  'joinedAt:asc',
  'lastActivityAt:desc',
  'name:asc',
  'name:desc',
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const STATUS_FILTERS: readonly StatusFilterValue[] = [
  'all',
  'active',
  'pending',
  'inactive',
  'blocked',
];

function splitSort(option: SortOption): {
  readonly sortBy: AcademyRosterSortBy;
  readonly sortDir: AcademyRosterSortDir;
} {
  const [sortBy, sortDir] = option.split(':') as [
    AcademyRosterSortBy,
    AcademyRosterSortDir,
  ];
  return { sortBy, sortDir };
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AcademyStudentsTab({
  academyId,
}: AcademyStudentsTabProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('all');
  const [sort, setSort] = useState<SortOption>('joinedAt:desc');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const { goToFirstPage } = pagination;

  // Any filter change restarts from page 1 — page 4 of "all" is
  // meaningless (and usually empty) once "pending" is applied.
  useEffect(() => {
    goToFirstPage();
  }, [search, status, sort, goToFirstPage]);

  const query = useMemo<AcademyRosterQuery>(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      ...splitSort(sort),
    }),
    [pagination.page, pagination.pageSize, search, status, sort]
  );

  const { data, isLoading, error, refetch } = useAcademyStudents(academyId, {
    query,
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const students = data?.items ?? [];

  const columns = useMemo<ColumnDef<AcademyRosterStudent, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('academy:students.table.student'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              {row.original.avatar ? (
                <AvatarImage src={row.original.avatar} alt="" />
              ) : null}
              <AvatarFallback className="text-xs">
                {initialsOf(row.original.name) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium" dir="auto">
                {row.original.name}
              </p>
              <p className="truncate text-xs text-muted-foreground" dir="auto">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'membershipStatus',
        header: t('academy:students.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={getRosterStatusLabelKey(row.original)}
            tone={getRosterStatusTone(row.original)}
          />
        ),
      },
      {
        accessorKey: 'source',
        header: t('academy:students.table.source'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t(getRosterSourceLabelKey(row.original.source))}
          </span>
        ),
      },
      {
        id: 'enrollments',
        header: t('academy:students.table.enrollments'),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {t('academy:students.table.enrollmentsValue', {
              active: row.original.activeEnrollmentCount,
              total: row.original.enrollmentCount,
            })}
          </span>
        ),
      },
      {
        accessorKey: 'joinedAt',
        header: t('academy:students.table.joined'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {fmt.date(row.original.joinedAt)}
          </span>
        ),
      },
      {
        accessorKey: 'lastActivityAt',
        header: t('academy:students.table.lastActivity'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.lastActivityAt
              ? fmt.date(row.original.lastActivityAt)
              : '—'}
          </span>
        ),
      },
    ],
    [t, fmt]
  );

  const openStudent = (student: AcademyRosterStudent) => {
    setSelectedUserId(student.userId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          labelKey="academy:students.searchPlaceholder"
          className="flex-1 sm:max-w-sm"
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilterValue)}
        >
          <SelectTrigger
            className="w-full sm:w-[180px]"
            aria-label={t('academy:students.filterByStatus')}
          >
            <SelectValue placeholder={t('academy:students.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'all'
                  ? t('academy:students.allStatuses')
                  : t(`academy:students.status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SortOption)}
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            aria-label={t('academy:students.sortBy')}
          >
            <SelectValue placeholder={t('academy:students.sortBy')} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`academy:students.sort.${value.replace(':', '_')}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <ErrorState kind={error.kind} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={students}
          isLoading={isLoading}
          pagination={pagination}
          emptyTitleKey="academy:students.empty"
          emptyDescriptionKey="academy:students.emptyDescription"
          getRowId={(student) => student.userId}
          onRowSelect={openStudent}
        />
      )}

      <AcademyStudentDrawer
        academyId={academyId}
        userId={selectedUserId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
