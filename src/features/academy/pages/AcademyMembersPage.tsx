/**
 * Academy Members Page.
 *
 * Display and manage academy team members including their roles and status.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { GraduationCap, Search, UserPlus, Users } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination } from '@hooks';
import { useAcademy, useAcademyMembers } from '../hooks';
import { AddAcademyManagerDialog } from '../components/AddAcademyManagerDialog';
import { AddAcademyInstructorDialog } from '../components/AddAcademyInstructorDialog';
import { CreateAcademyStudentDialog } from '../components/CreateAcademyStudentDialog';
import {
  getAcademyMemberRoleTone,
  getAcademyMemberStatusTone,
} from '../utils/academy-status.utils';
import type { AcademyMember, AcademyMemberRole } from '@types';

export default function AcademyMembersPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AcademyMemberRole | 'all'>(
    'all'
  );
  const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
  const [isAddInstructorOpen, setIsAddInstructorOpen] = useState(false);
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);

  const {
    data: academy,
    isLoading: isLoadingAcademy,
    error: academyError,
    refetch: refetchAcademy,
  } = useAcademy(academyId ?? '');

  // `totalItems` is only known once the server responds, so it is tracked
  // separately from the pagination hook's page/pageSize (which the request
  // itself depends on) and synced in after each fetch.
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useAcademyMembers(academyId ?? '', {
    enabled: !!academyId,
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
    },
  });

  useEffect(() => {
    if (membersData) {
      setTotalItems(membersData.pagination.totalItems);
    }
  }, [membersData]);

  const members = membersData?.items ?? [];

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const columns = useMemo<ColumnDef<AcademyMember, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('academy:members.table.name'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('academy:members.table.email'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: t('academy:members.table.role'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`academy:members.roles.${row.original.role}`}
            tone={getAcademyMemberRoleTone(row.original.role)}
          />
        ),
      },
      {
        accessorKey: 'status',
        header: t('academy:members.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`academy:members.status.${row.original.status}`}
            tone={getAcademyMemberStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'joinedAt',
        header: t('academy:members.table.joinedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.joinedAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [t]
  );

  if (isLoadingAcademy) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (academyError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:members.title"
          descriptionKey="academy:members.subtitle"
        />
        <ErrorState onRetry={() => refetchAcademy()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:members.title"
        descriptionKey="academy:members.subtitle"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('academy:members.title')}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateStudentOpen(true)}
            >
              <GraduationCap className="size-4" strokeWidth={2} aria-hidden />
              {t('academy:members.createStudent.triggerButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddInstructorOpen(true)}
            >
              <UserPlus className="size-4" strokeWidth={2} aria-hidden />
              {t('academy:members.addInstructor.triggerButton')}
            </Button>
            <Button type="button" onClick={() => setIsAddManagerOpen(true)}>
              <UserPlus className="size-4" strokeWidth={2} aria-hidden />
              {t('academy:members.addManager.triggerButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('academy:members.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as AcademyMemberRole | 'all')
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('academy:members.filterByRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('academy:members.allRoles')}
                </SelectItem>
                <SelectItem value="owner">
                  {t('academy:members.roles.owner')}
                </SelectItem>
                <SelectItem value="administrator">
                  {t('academy:members.roles.administrator')}
                </SelectItem>
                <SelectItem value="manager">
                  {t('academy:members.roles.manager')}
                </SelectItem>
                <SelectItem value="instructor">
                  {t('academy:members.roles.instructor')}
                </SelectItem>
                <SelectItem value="staff">
                  {t('academy:members.roles.staff')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Members Table */}
          {membersError ? (
            <ErrorState onRetry={() => refetchMembers()} />
          ) : (
            <DataTable
              columns={columns}
              data={filteredMembers}
              isLoading={isLoadingMembers}
              pagination={pagination}
              emptyTitleKey="academy:members.emptyState"
              emptyDescriptionKey="academy:members.emptyStateDescription"
              getRowId={(member) => member.id}
            />
          )}
        </CardContent>
      </Card>

      <AddAcademyManagerDialog
        open={isAddManagerOpen}
        onOpenChange={setIsAddManagerOpen}
        academyId={academyId ?? ''}
      />
      <AddAcademyInstructorDialog
        open={isAddInstructorOpen}
        onOpenChange={setIsAddInstructorOpen}
        academyId={academyId ?? ''}
      />
      <CreateAcademyStudentDialog
        open={isCreateStudentOpen}
        onOpenChange={setIsCreateStudentOpen}
        academyId={academyId ?? ''}
      />
    </PageContainer>
  );
}
