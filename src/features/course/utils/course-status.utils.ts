/**
 * Course status → tone mapping.
 *
 * Centralizes how Course lifecycle/visibility/pricing states map onto the
 * shared `StatusBadge` tones, so every page renders status consistently
 * instead of each hand-rolling its own badge variant.
 */
import type { StatusTone } from '@components/data-display';
import type {
  CourseStatus,
  CourseVisibility,
  CoursePricingType,
  CourseLessonStatus,
} from '@types';

/** Maps a course's lifecycle status to a status tone. */
export function getCourseStatusTone(status: CourseStatus): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'archived':
      return 'destructive';
    default:
      return 'neutral';
  }
}

/** Course status → translation key, reusing the `course:status.*` namespace. */
export function getCourseStatusLabelKey(status: CourseStatus): string {
  return `course:status.${status}`;
}

/** Maps a course's visibility to a status tone. */
export function getCourseVisibilityTone(
  visibility: CourseVisibility
): StatusTone {
  return visibility === 'public' ? 'info' : 'neutral';
}

/** Course visibility → translation key. */
export function getCourseVisibilityLabelKey(
  visibility: CourseVisibility
): string {
  return `course:visibility.${visibility}`;
}

/** Maps a course's pricing type to a status tone. */
export function getCoursePricingTone(
  pricingType: CoursePricingType
): StatusTone {
  return pricingType === 'paid' ? 'success' : 'neutral';
}

/** Maps a lesson's status to a status tone. */
export function getLessonStatusTone(status: CourseLessonStatus): StatusTone {
  return status === 'published' ? 'success' : 'neutral';
}

/** Lesson status → translation key. */
export function getLessonStatusLabelKey(status: CourseLessonStatus): string {
  return `course:lessonStatus.${status}`;
}
