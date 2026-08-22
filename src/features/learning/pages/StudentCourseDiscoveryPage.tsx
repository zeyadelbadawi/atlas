/**
 * Student Course Discovery Page.
 *
 * Lets a student browse published, publicly visible courses across every
 * academy. Only published + public courses are ever requested — draft or
 * private course management controls are never exposed here.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useDebounce, usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useDiscoverCourses } from '../hooks';
import { formatCoursePricing } from '@features/course';
import type { CoursePricingType } from '@types';

export default function StudentCourseDiscoveryPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [pricingFilter, setPricingFilter] = useState<CoursePricingType | 'all'>(
    'all'
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useDiscoverCourses({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedSearch.trim() || undefined,
      filters: {
        status: 'published',
        visibility: 'public',
        pricingType: pricingFilter === 'all' ? undefined : pricingFilter,
      },
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const courses = data?.items ?? [];
  const hasActiveFilters =
    debouncedSearch.trim().length > 0 || pricingFilter !== 'all';

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="learning:discovery.title"
          descriptionKey="learning:discovery.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="learning:discovery.title"
        descriptionKey="learning:discovery.subtitle"
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('learning:discovery.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="ps-9"
            />
          </div>

          <Select
            value={pricingFilter}
            onValueChange={(v) =>
              setPricingFilter(v as CoursePricingType | 'all')
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder={t('learning:discovery.filterByPricing')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('learning:discovery.allPricing')}
              </SelectItem>
              <SelectItem value="free">{t('course:pricing.free')}</SelectItem>
              <SelectItem value="paid">{t('course:pricing.paid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            titleKey={
              hasActiveFilters
                ? 'learning:empty.noResults'
                : 'learning:empty.noCourses'
            }
            descriptionKey={
              hasActiveFilters
                ? 'learning:empty.noResultsDescription'
                : 'learning:empty.noCoursesDescription'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                      courseId: course.id,
                    })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(
                      buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                        courseId: course.id,
                      })
                    );
                  }
                }}
                className="flex cursor-pointer flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="h-36 w-full bg-muted" />
                )}
                <CardContent className="flex flex-1 flex-col gap-2 pt-4">
                  {course.category ? (
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {course.category.name}
                    </span>
                  ) : null}
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {course.title}
                  </h3>
                  {course.shortDescription ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.shortDescription}
                    </p>
                  ) : null}
                  {course.instructors.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('learning:discovery.card.byInstructor', {
                        name: course.instructors[0].name,
                      })}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatCoursePricing(course.pricing, t)}
                    </span>
                    <Button size="sm" variant="outline" tabIndex={-1}>
                      {t('learning:discovery.card.viewAction')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
