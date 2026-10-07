/**
 * The one data source behind every theme's `courseSpotlight` renderer
 * (Theme 4 plan §6): the course the section names, or — with no
 * `courseId` — the Academy's newest published course, plus its public
 * curriculum. Only real course data: nothing here is invented, and a
 * course that is missing, unpublished or private resolves to `course:
 * null`, which the renderers turn into "hidden on the public site".
 */
import { usePublicCourse, usePublicCourseCurriculum, usePublicCourses } from '@hooks';
import type { Course, CourseSpotlightSectionConfig, PublicCourseCurriculumSection } from '@types';
import {
  MAX_SPOTLIGHT_MODULES,
  MIN_SPOTLIGHT_MODULES,
} from '../constants/website.constants';

export interface CourseSpotlightData {
  readonly course: Course | null;
  /** The curriculum sections to show, already capped at `maxModules`. */
  readonly sections: readonly PublicCourseCurriculumSection[];
  /** Every section the course has (for "and N more"). */
  readonly totalSections: number;
  readonly totalLessons: number;
  readonly isLoading: boolean;
}

const NEWEST = {
  pagination: { page: 1, pageSize: 1 },
  sort: { field: 'createdAt', direction: 'desc' },
} as const;

/** Defends the render against a persisted value outside the schema's bounds. */
function resolveMaxModules(value: number): number {
  if (!Number.isFinite(value)) return MAX_SPOTLIGHT_MODULES;
  return Math.min(
    MAX_SPOTLIGHT_MODULES,
    Math.max(MIN_SPOTLIGHT_MODULES, Math.trunc(value))
  );
}

export function useCourseSpotlight(
  config: CourseSpotlightSectionConfig,
  academyId: string
): CourseSpotlightData {
  const named = config.courseId || undefined;
  const newest = usePublicCourses(academyId, {
    query: NEWEST,
    enabled: !named,
  });
  const courseId = named ?? newest.data?.items[0]?.id;
  const single = usePublicCourse(academyId, named);
  const curriculum = usePublicCourseCurriculum(
    academyId,
    config.showSyllabus ? courseId : undefined
  );

  const course = named
    ? (single.data ?? null)
    : (newest.data?.items[0] ?? null);
  const all = curriculum.data ?? [];
  const ordered = [...all].sort((a, b) => a.order - b.order);

  return {
    course,
    sections: config.showSyllabus
      ? ordered.slice(0, resolveMaxModules(config.maxModules))
      : [],
    totalSections: ordered.length,
    totalLessons: ordered.reduce((sum, s) => sum + s.lessons.length, 0),
    isLoading:
      (named ? single.isLoading : newest.isLoading) ||
      (config.showSyllabus && !!courseId && curriculum.isLoading),
  };
}
