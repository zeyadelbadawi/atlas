/**
 * Academy Certificates — every certificate this academy has issued (P64 Phase 3 §E.6, D6/D7).
 *
 * The route is guarded like Media (`academy.view`): an instructor may read
 * the list for their courses. The three writes — revoke, regenerate and
 * (from the roster drawer) issue — render only for owners and managers,
 * and the backend refuses them for anyone else regardless of what was
 * drawn.
 *
 * Filters are server-side (`status`, `courseId`); the page never filters a
 * loaded page and calls the result a total.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Award,
  Eye,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SectionTabs } from '@components/navigation';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateFormatter, usePagination, usePermissions } from '@hooks';
import { useAcademyCertificates } from '@features/learning';
import { useCourses } from '@features/course';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { isolateNumericExpression } from '@utils';
import type {
  Certificate,
  CertificateStatusValue,
  NavigationItem,
} from '@types';
import { CertificateDetailDialog } from '../components/CertificateDetailDialog';
import { RevokeCertificateDialog } from '../components/RevokeCertificateDialog';
import { RegenerateCertificateDialog } from '../components/RegenerateCertificateDialog';
import {
  certificateRenderLabelKey,
  certificateRenderTone,
  certificateStatusLabelKey,
  certificateStatusTone,
} from '../utils/certificate.utils';

/** Select values cannot be empty strings; "all" is the absence of a filter. */
const ALL = 'all';
/** Enough for any academy's catalog in one select. */
const COURSE_FILTER_PAGE_SIZE = 100;

export function getCertificateTabs(
  academyId: string
): readonly NavigationItem[] {
  return [
    {
      id: 'academy-certificates-list',
      labelKey: 'certificates:nav.list',
      path: buildPath(DASHBOARD_ROUTES.academyCertificates, { academyId }),
      icon: Award,
    },
    {
      id: 'academy-certificates-template',
      labelKey: 'certificates:nav.template',
      path: buildPath(DASHBOARD_ROUTES.academyCertificateTemplate, {
        academyId,
      }),
      icon: FileText,
    },
  ];
}

export default function AcademyCertificatesPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  // Same permission the media library gates its writes on: granted to
  // exactly the org roles (owner, manager) whose academy membership the
  // certificate service accepts for issue/revoke/regenerate.
  const canManage = hasPermission('academy.website.manage');

  const [status, setStatus] = useState<string>(ALL);
  const [courseId, setCourseId] = useState<string>(ALL);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const { goToPage } = pagination;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<Certificate | null>(
    null
  );

  const filters = useMemo(
    () => ({
      ...(status !== ALL ? { status: status as CertificateStatusValue } : {}),
      ...(courseId !== ALL ? { courseId } : {}),
    }),
    [status, courseId]
  );
  const isFiltered = status !== ALL || courseId !== ALL;

  const { data, isLoading, error, refetch } = useAcademyCertificates(
    academyId,
    {
      query: {
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
      },
      filters,
    }
  );

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  // A filter change starts from page one — page 4 of an unfiltered list is
  // nowhere in a filtered one.
  useEffect(() => {
    goToPage(1);
  }, [status, courseId, goToPage]);

  const { data: coursesData } = useCourses(academyId, {
    query: { pagination: { page: 1, pageSize: COURSE_FILTER_PAGE_SIZE } },
  });
  const courses = coursesData?.items ?? [];

  const columns: ColumnDef<Certificate, unknown>[] = [
    {
      accessorKey: 'studentName',
      header: t('certificates:staff.table.learner'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" dir="auto">
            {row.original.studentName}
          </p>
          {row.original.studentEmail ? (
            <p className="truncate text-xs text-muted-foreground" dir="auto">
              {row.original.studentEmail}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'courseTitle',
      header: t('certificates:staff.table.course'),
      cell: ({ row }) => <span dir="auto">{row.original.courseTitle}</span>,
    },
    {
      accessorKey: 'serial',
      header: t('certificates:staff.table.serial'),
      cell: ({ row }) => (
        <span className="font-mono">
          {isolateNumericExpression(row.original.serial)}
        </span>
      ),
    },
    {
      accessorKey: 'issuedAt',
      header: t('certificates:staff.table.issued'),
      cell: ({ row }) => fmt.date(row.original.issuedAt),
    },
    {
      accessorKey: 'status',
      header: t('certificates:staff.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={certificateStatusLabelKey(row.original.status)}
          tone={certificateStatusTone(row.original.status)}
        />
      ),
    },
    {
      accessorKey: 'version',
      header: t('certificates:staff.table.version'),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.version}</span>
      ),
    },
    {
      accessorKey: 'renderStatus',
      header: t('certificates:staff.table.render'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={certificateRenderLabelKey(row.original.renderStatus)}
          tone={certificateRenderTone(row.original.renderStatus)}
        />
      ),
    },
    {
      id: 'actions',
      header: t('certificates:staff.table.actions'),
      enableSorting: false,
      cell: ({ row }) => {
        const certificate = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDetailId(certificate.id)}
            >
              <Eye className="size-4" aria-hidden />
              {t('certificates:staff.actions.view')}
            </Button>
            {canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('certificates:staff.actions.openActions', {
                      serial: certificate.serial,
                    })}
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => setRegenerateTarget(certificate)}
                  >
                    <RefreshCw className="size-4" aria-hidden />
                    {t('certificates:staff.actions.regenerate')}
                  </DropdownMenuItem>
                  {certificate.status === 'issued' ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setRevokeTarget(certificate)}
                      >
                        <Undo2 className="size-4" aria-hidden />
                        {t('certificates:staff.actions.revoke')}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        );
      },
    },
  ];

  const header = (
    <PageHeader
      titleKey="certificates:staff.title"
      descriptionKey="certificates:staff.subtitle"
    />
  );

  if (error) {
    return (
      <PageContainer>
        {header}
        <SectionTabs items={getCertificateTabs(academyId)} />
        <ErrorState kind={error.kind} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}
      <SectionTabs items={getCertificateTabs(academyId)} />

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          {t('certificates:staff.readOnly')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="certificate-status-filter">
            {t('certificates:staff.filters.status')}
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="certificate-status-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('certificates:staff.filters.allStatuses')}
              </SelectItem>
              <SelectItem value="issued">
                {t('certificates:status.issued')}
              </SelectItem>
              <SelectItem value="revoked">
                {t('certificates:status.revoked')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="certificate-course-filter">
            {t('certificates:staff.filters.course')}
          </Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="certificate-course-filter" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('certificates:staff.filters.allCourses')}
              </SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  <span dir="auto">{course.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={pagination}
        getRowId={(certificate) => certificate.id}
        emptyTitleKey={
          isFiltered
            ? 'certificates:staff.noMatch.title'
            : 'certificates:staff.empty.title'
        }
        emptyDescriptionKey={
          isFiltered
            ? 'certificates:staff.noMatch.description'
            : 'certificates:staff.empty.description'
        }
      />

      <CertificateDetailDialog
        academyId={academyId}
        certificateId={detailId}
        onOpenChange={(next) => !next && setDetailId(null)}
      />
      <RevokeCertificateDialog
        academyId={academyId}
        certificate={revokeTarget}
        onOpenChange={(next) => !next && setRevokeTarget(null)}
      />
      <RegenerateCertificateDialog
        academyId={academyId}
        certificate={regenerateTarget}
        onOpenChange={(next) => !next && setRegenerateTarget(null)}
      />
    </PageContainer>
  );
}
