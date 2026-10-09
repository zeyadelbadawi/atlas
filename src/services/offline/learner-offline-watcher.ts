/**
 * Academy offline — keeps the learner's offline copies in step with what
 * the server says, from the query cache itself (no feature has to remember
 * to do it):
 *
 *  SAVE   a lesson grant that the server marked `offlineReading.allowed`
 *         → its TEXT is kept (`saveOfflineLessonText`); nothing else of the
 *         grant ever is.
 *
 *  PURGE  the server refusing what was saved:
 *           - the grant refused because access ENDED (revoked / refunded /
 *             expired enrolment, suspended account, device not allowed)
 *             → every saved copy of that course: lesson texts, drafts,
 *             the outline and progress records;
 *           - the grant refused for that lesson only (404: unpublished,
 *             removed, not reachable; locked; scheduled) → that lesson's
 *             text;
 *           - the course outline refused (403/404) → the whole course.
 *         A network failure, a timeout, a rate limit or a 5xx purges
 *         nothing: those say nothing about authorisation. A 401 is the
 *         session's business (a definitive one wipes everything).
 */
import type { Query, QueryClient } from '@tanstack/react-query';
import { normalizeUnknownError } from '@api';
import type { LessonContentGrant } from '@types';
import {
  purgeOfflineCourse,
  purgeOfflineLesson,
  saveOfflineLessonText,
} from './learner-content';
import { deletePersistedQueries } from './query-persistence';
import { isLearnerCourseKey } from './learner-persistence';

const COURSE_REVOKED_KEYS = new Set([
  'errors.learning.accessEnded',
  'errors.learning.deviceLimit',
  'errors.auth.accountSuspended',
]);
const LESSON_REFUSED_KEYS = new Set([
  'errors.learning.lessonLocked',
  'errors.learning.lessonScheduled',
  'errors.learning.lessonNoContent',
]);

export type RefusalScope = 'course' | 'lesson' | null;

/** What a refused grant means for the saved copies. Exported for tests. */
export function grantRefusalScope(error: unknown): RefusalScope {
  const normalized = normalizeUnknownError(error);
  if (normalized.messageKey && COURSE_REVOKED_KEYS.has(normalized.messageKey))
    return 'course';
  if (normalized.status === 403) return 'course';
  if (normalized.messageKey && LESSON_REFUSED_KEYS.has(normalized.messageKey))
    return 'lesson';
  if (normalized.status === 404) return 'lesson';
  return null;
}

/** A refused course outline: 403/404 mean the learner no longer has this course. */
export function sequenceRefusalScope(error: unknown): RefusalScope {
  const status = normalizeUnknownError(error).status;
  return status === 403 || status === 404 ? 'course' : null;
}

export async function purgeLearnerCourse(
  userId: string,
  courseId: string
): Promise<void> {
  await Promise.all([
    purgeOfflineCourse(userId, courseId),
    deletePersistedQueries(userId, (key) => isLearnerCourseKey(key, courseId)),
  ]);
}

function keyParts(query: Query): readonly unknown[] {
  return query.queryKey as readonly unknown[];
}

export function startLearnerOfflineWatcher(
  queryClient: QueryClient,
  getUserId: () => string | null
): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const [root, kind, studentId, courseId, lessonId] = keyParts(event.query);
    if (root !== 'learner') return;
    const userId = getUserId();
    if (!userId || studentId !== userId || typeof courseId !== 'string') return;

    if (kind === 'lesson-grant' && typeof lessonId === 'string') {
      if (event.action.type === 'success') {
        const grant = event.action.data as LessonContentGrant | undefined;
        if (grant && grant.lessonId === lessonId && grant.courseId === courseId)
          void saveOfflineLessonText(userId, grant);
      } else if (event.action.type === 'error') {
        const scope = grantRefusalScope(event.action.error);
        if (scope === 'course') void purgeLearnerCourse(userId, courseId);
        if (scope === 'lesson')
          void purgeOfflineLesson(userId, courseId, lessonId);
      }
      return;
    }
    if (kind === 'sequence' && event.action.type === 'error') {
      if (sequenceRefusalScope(event.action.error) === 'course')
        void purgeLearnerCourse(userId, courseId);
    }
  });
}
