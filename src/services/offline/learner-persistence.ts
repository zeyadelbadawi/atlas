/**
 * Academy offline — what an Academy website may keep on disk (default deny).
 *
 * This is the Academy website's counterpart of the dashboard allowlist in
 * `query-persistence.ts`, and deliberately a separate, much shorter list:
 * the learner portal is a different product with different data.
 *
 * PUBLIC (owner `PUBLIC_OWNER`, restored for anyone opening THIS academy's
 * site — the store itself is per academy, see `offline-scope.ts`): the
 * published website a visitor already saw — hostname resolution, theme
 * configuration, pages, identity, categories, the public course list and
 * course pages. Not the public reviews (other learners' names and words).
 *
 * THE LEARNER'S OWN (owner = the signed-in user, and only when the key
 * itself names that same user): their enrolments, the course outline
 * (`learner/sequence`: titles, order, lock state — it carries no content),
 * their own lesson progress, and an assignment's brief (so a draft can be
 * written offline).
 *
 * NEVER, whatever the key family's other members do: the lesson GRANT
 * (credentials, signed URLs — `Cache-Control: no-store`), the staff-style
 * `course-content` curriculum (it can carry a durable `contentUrl`), quiz
 * sessions, attempts and results, assignment submissions and grades, the
 * learner overview (it lists recent results), assessments lists (scores),
 * devices, certificates, orders, payments, notifications. Lesson TEXT is
 * kept separately and only when the server explicitly permits it
 * (`lesson-text-cache.ts`).
 *
 * Even an allowlisted response is refused if it contains a credential- or
 * media-shaped field anywhere (`containsForbiddenField`).
 */
import type { QueryKey } from '@tanstack/react-query';
import {
  PUBLIC_OWNER,
  containsForbiddenField,
  type PersistencePolicy,
} from './query-persistence';

/** Published academy website reads that are safe on disk. */
const PUBLIC_WEBSITE_INCLUDED = new Set([
  'resolve',
  'configuration',
  'pages',
  'page',
  'identity',
  'statistics',
  'categories',
  'courses',
  'course',
  'course-curriculum',
  'course-rating',
]);

/** `[root, kind]` pairs of the learner's own reads; position 2 is always the student id. */
const LEARNER_OWN: Readonly<Record<string, ReadonlySet<string>>> = {
  learner: new Set(['sequence']),
  enrollment: new Set(['list', 'course']),
  progress: new Set(['course']),
  assignment: new Set(['detail']),
};

/** Learner records: three days (a weekend away, a long flight). */
export const LEARNER_OFFLINE_TTL_MS = 72 * 60 * 60 * 1000;
export const LEARNER_MAX_ENTRY_BYTES = 512 * 1024;
/** A published configuration can embed data-URI logos; it is the site's skeleton, so it gets more room. */
export const PUBLIC_CONFIGURATION_MAX_BYTES = 2 * 1024 * 1024;
export const LEARNER_MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const LEARNER_MAX_ENTRIES = 300;

export function learnerOwnerOf(
  queryKey: QueryKey,
  userId: string | null
): string | null {
  const [root, kind, scope] = queryKey as readonly unknown[];
  if (typeof root !== 'string' || typeof kind !== 'string') return null;
  if (root === 'public-website') {
    return PUBLIC_WEBSITE_INCLUDED.has(kind) ? PUBLIC_OWNER : null;
  }
  const kinds = LEARNER_OWN[root];
  if (!kinds?.has(kind) || !userId) return null;
  // The key must name the signed-in learner themself — never a copy
  // addressed to anyone else, whatever is in the cache.
  return scope === userId ? userId : null;
}

export const learnerPersistencePolicy: PersistencePolicy = {
  name: 'learner',
  ownerOf: learnerOwnerOf,
  maxEntryBytes: (queryKey) => {
    const [root, kind] = queryKey as readonly unknown[];
    return root === 'public-website' && kind === 'configuration'
      ? PUBLIC_CONFIGURATION_MAX_BYTES
      : LEARNER_MAX_ENTRY_BYTES;
  },
  ttlMs: LEARNER_OFFLINE_TTL_MS,
  maxEntries: LEARNER_MAX_ENTRIES,
  maxTotalBytes: LEARNER_MAX_TOTAL_BYTES,
  rejectsData: containsForbiddenField,
};

/** True when `queryKey` belongs to course `courseId` of the learner (for purging a revoked enrolment). */
export function isLearnerCourseKey(
  queryKey: QueryKey,
  courseId: string
): boolean {
  const [root, kind, , id] = queryKey as readonly unknown[];
  if (root === 'learner' && kind === 'sequence') return id === courseId;
  if (root === 'enrollment' && kind === 'course') return id === courseId;
  if (root === 'progress' && kind === 'course') return id === courseId;
  if (root === 'assignment' && kind === 'detail') return id === courseId;
  return false;
}
