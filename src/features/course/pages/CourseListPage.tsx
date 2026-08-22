/**
 * Course List Page.
 *
 * Lists an academy's courses with search, filtering, sorting and pagination,
 * and is the entry point into creating and managing courses.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirmDialog } from '@app/providers';
import { toast } from '@/hooks/use-toast';
import { useDebounce, usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  useCourses,
  useCourseCategories,
  useDeleteCourse,
} from '../hooks';
import {
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '../utils/course-status.utils';
import { formatCoursePricing } from '../utils/course-pricing.utils';
import type {
  Course,
  CoursePricingType,
  CourseStatus,
  CourseVisibility,
} from '@types';

export default function CourseListPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { confirm } = useConfirmDialog();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>(
    'all'
  );
  const [visibilityFilter, setVisibilityFilter] = useState<
    CourseVisibility | 'all'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pricingFilter, setPricingFilter] = useState<CoursePricingType | 'all'>(
    'all'
  );

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    statusFilter !== 'all' ||
    visibilityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    pricingFilter !== 'all';

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const {
    data: coursesData,
    isLoading,
    error,
    refetch,
  } = useCourses(academyId ?? '', {
    enabled: !!academyId,
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedSearch.trim() || undefined,
      filters: {
        status: statusFilter === 'all' ? undefined : statusFilter,
        visibility: visibilityFilter === 'all' ? undefined : visibilityFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
        pricingType: pricingFilter === 'all' ? undefined : pricingFilter,
      },
    },
  });

  const { data: categoriesData } = useCourseCategories(academyId ?? '');
  const categories = categoriesData?.items ?? [];

  useEffect(() => {
    if (coursesData) setTotalItems(coursesData.pagination.totalItems);
  }, [coursesData]);

  const courses = coursesData?.items ?? [];
  const hasAnyCourses = totalItems > 0 || hasActiveFilters;

  const { mutateAsync: deleteCourse } = useDeleteCourse(academyId ?? '');

  const goTo = (path: string) => academyId && navigate(
    buildPath(path, { academyId })
  );
  const goToCourse = (path: string, courseId: string) =>
    academyId && navigate(buildPath(path, { academyId, courseId }));

  const handleDelete = async (course: Course) => {
    const confirmed = await confirm({
      titleKey: 'course:settings.deleteCourseConfirm.title',
      descriptionKey: 'course:settings.deleteCourseConfirm.description',
      confirmLabelKey: 'course:settings.deleteCourseConfirm.confirmLabel',
      cancelLabelKey: 'course:settings.deleteCourseConfirm.cancelLabel',
      values: { title: course.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteCourse(course.id);
      toast({
        title: t('course:settings.deleteCourseSuccess'),
        description: t('common:states.success.description'),
      });
    } catch {
      toast({
        title: t('course:settings.deleteCourseError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const columns = useMemo<ColumnDef<Course, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('course:list.table.title'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.thumbnail ? (
              <img
                src={row.original.thumbnail}
                alt=""
                className="size-10 shrink-0 rounded-md border border-border object-cover"
              />
            ) : (
              <div className="size-10 shrink-0 rounded-md border border-dashed border-border" />
            )}
            <span className="font-medium">{row.original.title}</span>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: t('course:list.table.category'),
        cell: ({ row }) =>
          row.original.category?.name ?? (
            <span className="text-muted-foreground">
              {t('course:list.uncategorized')}
            </span>
          ),
      },
      {
        accessorKey: 'status',
        header: t('course:list.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={getCourseStatusLabelKey(row.original.status)}
            tone={getCourseStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'visibility',
        header: t('course:list.table.visibility'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={getCourseVisibilityLabelKey(row.original.visibility)}
            tone={getCourseVisibilityTone(row.original.visibility)}
          />
        ),
      },
      {
        accessorKey: 'pricing',
        header: t('course:list.table.pricing'),
        cell: ({ row }) => formatCoursePricing(row.original.pricing, t),
      },
      {
        accessorKey: 'updatedAt',
        header: t('course:list.table.updatedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('course:list.table.actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                aria-label={t('course:list.table.actions')}
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() =>
                  goToCourse(DASHBOARD_ROUTES.academyCourseDetail, row.original.id)
                }
              >
                {t('course:list.actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  goToCourse(
                    DASHBOARD_ROUTES.academyCourseBuilder,
                    row.original.id
                  )
                }
              >
                {t('course:list.actions.builder')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  goToCourse(
                    DASHBOARD_ROUTES.academyCourseSettings,
                    row.original.id
                  )
                }
              >
                {t('course:list.actions.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => void handleDelete(row.original)}
              >
                {t('course:list.actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, academyId]
  );

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:list.title"
          descriptionKey="course:list.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="course:list.title"
        descriptionKey="course:list.subtitle"
        actions={
          <Button onClick={() => goTo(DASHBOARD_ROUTES.academyCourseCreate)}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:list.createButton')}
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('course:list.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as CourseStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder={t('course:list.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('course:list.allStatuses')}</SelectItem>
              <SelectItem value="draft">{t('course:status.draft')}</SelectItem>
              <SelectItem value="published">
                {t('course:status.published')}
              </SelectItem>
              <SelectItem value="archived">
                {t('course:status.archived')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={visibilityFilter}
            onValueChange={(v) =>
              setVisibilityFilter(v as CourseVisibility | 'all')
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder={t('course:list.filterByVisibility')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('course:list.allVisibilities')}
              </SelectItem>
              <SelectItem value="public">
                {t('course:visibility.public')}
              </SelectItem>
              <SelectItem value="private">
                {t('course:visibility.private')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('course:list.filterByCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('course:list.allCategories')}
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pricingFilter}
            onValueChange={(v) =>
              setPricingFilter(v as CoursePricingType | 'all')
            }
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t('course:list.filterByPricing')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('course:list.allPricing')}</SelectItem>
              <SelectItem value="free">{t('course:pricing.free')}</SelectItem>
              <SelectItem value="paid">{t('course:pricing.paid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={courses}
          isLoading={isLoading}
          pagination={pagination}
          getRowId={(course) => course.id}
          onRowSelect={(course) =>
            goToCourse(DASHBOARD_ROUTES.academyCourseDetail, course.id)
          }
          emptyTitleKey={
            hasAnyCourses ? 'course:empty.noResults' : 'course:empty.noCourses'
          }
          emptyDescriptionKey={
            hasAnyCourses
              ? 'course:empty.noResultsDescription'
              : 'course:empty.noCoursesDescription'
          }
          emptyAction={
            hasAnyCourses
              ? undefined
              : {
                  labelKey: 'course:empty.createFirstCourse',
                  onAction: () => goTo(DASHBOARD_ROUTES.academyCourseCreate),
                  icon: Plus,
                }
          }
        />
      </div>
    </PageContainer>
  );
}
