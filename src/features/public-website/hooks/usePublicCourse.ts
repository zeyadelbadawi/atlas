/**
 * usePublicCourse / usePublicCourseCurriculum — the real Course Details
 * page's public, unauthenticated data sources. See
 * `PublicWebsiteService.getPublicCourse`'s own doc comment for the real
 * 401 bug these hooks replace `useCourse` (`@features/course`, tenant-
 * scoped) to fix on the public marketing page.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { Course, PublicCourseCurriculumSection } from '@types';
import type { ApiError } from '@api';

export function usePublicCourse(
  academyId: string | undefined,
  courseId: string | undefined
) {
  return useApiQuery<Course | null, ApiError>({
    queryKey: publicWebsiteKeys.course(academyId, courseId),
    queryFn: () => publicWebsiteService.getPublicCourse(academyId!, courseId!),
    enabled: !!academyId && !!courseId,
  });
}

export function usePublicCourseCurriculum(
  academyId: string | undefined,
  courseId: string | undefined
) {
  return useApiQuery<readonly PublicCourseCurriculumSection[] | null, ApiError>(
    {
      queryKey: publicWebsiteKeys.courseCurriculum(academyId, courseId),
      queryFn: () =>
        publicWebsiteService.getPublicCourseCurriculum(academyId!, courseId!),
      enabled: !!academyId && !!courseId,
    }
  );
}
