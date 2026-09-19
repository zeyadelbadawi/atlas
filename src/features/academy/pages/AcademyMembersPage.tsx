/**
 * Academy Members Page.
 *
 * Two distinct populations share this screen, separated by tabs because
 * they are not the same kind of record and must never be confused:
 *
 *   - **Team** — `academy_members`: the staff who RUN the academy
 *     (owner, manager, instructor, staff).
 *   - **Students** (P64 Phase 1) — `academy_students`: the LEARNERS who
 *     registered through the academy's own public website. Until this
 *     phase a Client Owner had no way at all to see who had signed up on
 *     their academy — the roster existed only in the database.
 *
 * The active tab is kept in the URL (`?tab=students`) so a link to the
 * roster is shareable and a browser refresh does not silently drop the
 * reader back onto the team table.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, Search, UserPlus, Users } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, useDateFormatter, usePagination } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useAcademy, useAcademyMembers } from '../hooks';
import { AddAcademyManagerDialog } from '../components/AddAcademyManagerDialog';
import { AddAcademyInstructorDialog } from '../components/AddAcademyInstructorDialog';
import { CreateAcademyStudentDialog } from '../components/CreateAcademyStudentDialog';
import { AcademyStudentsTab } from '../components/AcademyStudentsTab';
import { ACADEMY_MEMBER_ROLES } from '../constants/academy.constants';
import {
  getAcademyMemberRoleLabelKey,
  getAcademyMemberRoleTone,
  getAcademyMemberStatusTone,
} from '../utils/academy-status.utils';
import { getAcademyAdminTabs } from '../utils/academy-navigation.utils';
import type { AcademyMember, AcademyMemberRole, BreadcrumbItem } from '@types';

export default function AcademyMembersPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const { organization } = useAuth();
  const { academyId } = useParams<{ academyId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get('tab') === 'students' ? 'students' : 'team';
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
            labelKey={getAcademyMemberRoleLabelKey(row.original.role)}
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
            {fmt.date(row.original.joinedAt)}
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

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'academy:members.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:members.title"
        descriptionKey="academy:members.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs items={getAcademyAdminTabs(academyId ?? '')} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = new URLSearchParams(searchParams);
          // `team` is the default, so it stays out of the URL entirely
          // rather than adding a parameter that says nothing.
          if (value === 'students') next.set('tab', 'students');
          else next.delete('tab');
          setSearchParams(next, { replace: true });
        }}
        className="mt-4 space-y-4"
      >
        <TabsList>
          <TabsTrigger value="team">
            <Users className="size-4" strokeWidth={2} aria-hidden />
            {t('academy:members.tabs.team')}
          </TabsTrigger>
          <TabsTrigger value="students">
            <GraduationCap className="size-4" strokeWidth={2} aria-hidden />
            {t('academy:members.tabs.students')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{t('academy:members.title')}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateStudentOpen(true)}
                >
                  <GraduationCap
                    className="size-4"
                    strokeWidth={2}
                    aria-hidden
                  />
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
                {/* Backend restricts granting Manager access to the
                Organization Owner only (`GRANTS_MANAGER_ROLES`,
                `academies.service.ts`) — this mirrors that restriction
                here so a Manager never sees an action that would only
                ever 403. */}
                {organization?.role === 'owner' ? (
                  <Button
                    type="button"
                    onClick={() => setIsAddManagerOpen(true)}
                  >
                    <UserPlus className="size-4" strokeWidth={2} aria-hidden />
                    {t('academy:members.addManager.triggerButton')}
                  </Button>
                ) : null}
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
                    <SelectValue
                      placeholder={t('academy:members.filterByRole')}
                    />
                  </SelectTrigger>
                  {/* Driven by `ACADEMY_MEMBER_ROLES`, which no longer lists the
                  legacy `administrator` tier (P64 Phase 1, D9) — see that
                  constant's comment. Hard-coded options were how the
                  hidden role kept reappearing in one picker at a time. */}
                  <SelectContent>
                    <SelectItem value="all">
                      {t('academy:members.allRoles')}
                    </SelectItem>
                    {ACADEMY_MEMBER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(getAcademyMemberRoleLabelKey(role))}
                      </SelectItem>
                    ))}
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
        </TabsContent>

        <TabsContent value="students">
          {/*
            Mounted only while the tab is open (Radix unmounts inactive
            content): the roster read is paginated and academy-scoped, and
            issuing it for every visitor to the team table would be a
            request nobody asked for.
          */}
          <AcademyStudentsTab academyId={academyId ?? ''} />
        </TabsContent>
      </Tabs>

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
