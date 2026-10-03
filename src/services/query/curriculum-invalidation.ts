/**
 * Course-builder curriculum cache invalidation.
 *
 * The builder renders ONE course's curriculum from several reads at once:
 * the section list (`courseKeys.sections`), each unit's unified item list
 * (`courseKeys.unitItems` — this is what the rows actually come from), the
 * attach picker (`courseKeys.availableContent`), the course detail (its
 * counts) and the quiz/assignment authoring lists on their own pages.
 * Lesson, quiz and assignment mutations each used to invalidate only their
 * own key, so a new lesson was missing from the builder, a renamed one kept
 * its old title, and a deleted quiz stayed attachable until a refresh.
 * Every curriculum mutation now calls `invalidateCourseCurriculum` instead,
 * and the fan-out is declared here once.
 *
 * WHY A PREDICATE. Every course key embeds the academy id, and every
 * authoring key embeds the author id; the quiz/assignment hooks know
 * neither. Matching by template keeps the targeting exactly as narrow as a
 * prefix (one course's curriculum reads, nothing else) while letting a
 * caller that lacks the academy id treat it as a wildcard. Templates are
 * built from the key factories themselves, so a key-shape change cannot
 * silently drift away from this matcher.
 */
import type { QueryClient } from '@tanstack/react-query';
import { assignmentKeys, courseKeys, quizKeys } from './query-keys';

export interface CourseCurriculumScope {
  /** The academy that owns the course; omitted = any academy (course ids are unique). */
  readonly academyId?: string;
  readonly courseId: string;
}

/** Wildcard placeholder used while building templates from the factories. */
const ANY = Symbol('any');
type Template = readonly unknown[];

/** The key templates (prefixes, with wildcards) a curriculum change makes stale. Exported for tests. */
export function courseCurriculumTemplates({
  academyId,
  courseId,
}: CourseCurriculumScope): readonly Template[] {
  const academy = (academyId ?? ANY) as string;
  const anyAuthor = ANY as unknown as string;
  return [
    courseKeys.sections(academy, courseId),
    // Every unit of the course: an attach can move an item out of ANOTHER
    // unit, and a delete/rename shows up in whichever unit holds the item.
    courseKeys.unitItems(academy, courseId, '').slice(0, -1),
    courseKeys.availableContent(academy, courseId),
    courseKeys.detail(academy, courseId),
    quizKeys.authoringList(anyAuthor, courseId),
    assignmentKeys.authoringList(anyAuthor, courseId),
  ];
}

function matchesTemplate(key: readonly unknown[], template: Template): boolean {
  if (key.length < template.length) return false;
  return template.every((part, index) => part === ANY || part === key[index]);
}

/** True when `key` is one of the course-curriculum reads for `scope`. */
export function isCourseCurriculumKey(
  key: readonly unknown[],
  scope: CourseCurriculumScope
): boolean {
  return courseCurriculumTemplates(scope).some((template) =>
    matchesTemplate(key, template)
  );
}

/**
 * Marks every builder read of one course stale: sections, all of its units'
 * item lists, the attach picker, the course detail and the quiz/assignment
 * authoring lists. Only the ones on screen refetch.
 */
export async function invalidateCourseCurriculum(
  queryClient: QueryClient,
  scope: CourseCurriculumScope
): Promise<void> {
  if (!scope.courseId) return;
  const templates = courseCurriculumTemplates(scope);
  await queryClient.invalidateQueries({
    predicate: (query) =>
      templates.some((template) => matchesTemplate(query.queryKey, template)),
  });
}
