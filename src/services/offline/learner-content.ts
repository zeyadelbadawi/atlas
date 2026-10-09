/**
 * Academy offline — the learner's own offline material, in the `content`
 * store of the academy's own database (`offline-scope.ts`).
 *
 * Three record kinds, each keyed by the signed-in user's id first, so a
 * record is only ever read back for that same person:
 *
 *   lesson|<user>|<course>|<lesson>   TEXT of a lesson, ONLY when the
 *                                     server's grant said `offlineReading
 *                                     .allowed` — title, body and the
 *                                     completion rule; never the grant's
 *                                     URLs, video, resources, watermark or
 *                                     lease. Deleted at the server's
 *                                     `until`, at sign-out, and as soon as
 *                                     the server refuses the lesson or the
 *                                     course again.
 *   draft|<user>|<course>|<asg>       the learner's assignment text, saved
 *                                     on every edit so a reload, a closed
 *                                     tab or a dead connection loses nothing;
 *                                     plus the idempotency key of a submit in
 *                                     progress, so every retry of it is the
 *                                     SAME submit to the server.
 *   quiz|<user>|<attempt>             answer journal of an UNTIMED quiz
 *                                     attempt only. Timed attempts are
 *                                     never journalled: their clock and
 *                                     their completion stay on the server.
 *
 * Sizes are capped per record and in total; the oldest lesson copies go
 * first. Video is never stored, in any form.
 */
import type { LessonContentGrant, QuizAnswer } from '@types';
import { offlineStore } from './offline-store';

export const OFFLINE_LESSON_MAX_BYTES = 256 * 1024;
export const OFFLINE_LESSON_MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const OFFLINE_LESSON_MAX_COUNT = 120;
/** Never kept longer than this, whatever `until` the server sent. */
export const OFFLINE_LESSON_HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const QUIZ_JOURNAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface OfflineLessonText {
  readonly kind: 'lesson';
  readonly userId: string;
  readonly courseId: string;
  readonly lessonId: string;
  readonly title: string;
  readonly bodyHtml: string;
  readonly completionRule: LessonContentGrant['completionRule'];
  readonly durationSeconds: number | null;
  readonly savedAt: number;
  readonly until: number;
  readonly bytes: number;
}

export interface OfflineAssignmentDraft {
  readonly kind: 'draft';
  readonly userId: string;
  readonly courseId: string;
  readonly assignmentId: string;
  readonly response: string;
  /** The server `draftSavedAt` this text was based on (compare-and-set base). */
  readonly baseDraftSavedAt: string | null;
  /** True once the server confirmed this exact text. */
  readonly synced: boolean;
  readonly updatedAt: number;
  /** A submit pressed but not yet confirmed: the same key on every retry. */
  readonly pendingSubmit?: {
    readonly idempotencyKey: string;
    readonly baseRevision: number;
    readonly createdAt: number;
    /** What was submitted under this key; a changed text gets a new key (the server refuses a reused key with another payload). */
    readonly forPayload: string;
  };
}

export interface QuizAnswerJournal {
  readonly kind: 'quiz';
  readonly userId: string;
  readonly attemptId: string;
  readonly answers: readonly QuizAnswer[];
  /** The server revision these answers were edited on top of. */
  readonly baseRevision: number;
  readonly updatedAt: number;
}

type ContentRecord =
  OfflineLessonText | OfflineAssignmentDraft | QuizAnswerJournal;

const lessonKey = (userId: string, courseId: string, lessonId: string) =>
  `lesson|${userId}|${courseId}|${lessonId}`;
const draftKey = (userId: string, courseId: string, assignmentId: string) =>
  `draft|${userId}|${courseId}|${assignmentId}`;
const quizKey = (userId: string, attemptId: string) =>
  `quiz|${userId}|${attemptId}`;

/* ------------------------------------------------------------------ */
/* lesson text                                                         */
/* ------------------------------------------------------------------ */

/**
 * Keeps a lesson's TEXT for offline reading when — and only when — the
 * server permitted it on this grant. Returns whether it was kept.
 */
export async function saveOfflineLessonText(
  userId: string,
  grant: LessonContentGrant,
  now: number = Date.now()
): Promise<boolean> {
  const permission = grant.offlineReading;
  if (
    !permission?.allowed ||
    !permission.until ||
    grant.kind !== 'text' ||
    grant.video ||
    grant.isPreview ||
    typeof grant.bodyHtml !== 'string'
  ) {
    return false;
  }
  const until = Math.min(
    Date.parse(permission.until),
    now + OFFLINE_LESSON_HARD_TTL_MS
  );
  if (!Number.isFinite(until) || until <= now) return false;
  const bytes = grant.bodyHtml.length + grant.title.length;
  if (bytes > OFFLINE_LESSON_MAX_BYTES) return false;
  const record: OfflineLessonText = {
    kind: 'lesson',
    userId,
    courseId: grant.courseId,
    lessonId: grant.lessonId,
    title: grant.title,
    bodyHtml: grant.bodyHtml,
    completionRule: grant.completionRule,
    durationSeconds: grant.durationSeconds,
    savedAt: now,
    until,
    bytes,
  };
  const stored = await offlineStore().put(
    'content',
    lessonKey(userId, grant.courseId, grant.lessonId),
    record
  );
  if (stored) await trimLessonTexts(now);
  return stored;
}

export async function loadOfflineLessonText(
  userId: string,
  courseId: string,
  lessonId: string,
  now: number = Date.now()
): Promise<OfflineLessonText | null> {
  const key = lessonKey(userId, courseId, lessonId);
  const record = await offlineStore().get<OfflineLessonText>('content', key);
  if (!record) return null;
  if (record.userId !== userId || record.until <= now) {
    await offlineStore().delete('content', key);
    return null;
  }
  return record;
}

/** Oldest first out beyond the count/size budget; expired ones always. */
async function trimLessonTexts(now: number): Promise<void> {
  const all = (await offlineStore().getAll<ContentRecord>('content')).filter(
    (record): record is OfflineLessonText => record?.kind === 'lesson'
  );
  all.sort((a, b) => b.savedAt - a.savedAt);
  let total = 0;
  let count = 0;
  for (const record of all) {
    const expired = record.until <= now;
    if (
      expired ||
      count >= OFFLINE_LESSON_MAX_COUNT ||
      total + record.bytes > OFFLINE_LESSON_MAX_TOTAL_BYTES
    ) {
      await offlineStore().delete(
        'content',
        lessonKey(record.userId, record.courseId, record.lessonId)
      );
      continue;
    }
    total += record.bytes;
    count += 1;
  }
}

export async function purgeOfflineLesson(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  await offlineStore().delete('content', lessonKey(userId, courseId, lessonId));
}

/** Every saved lesson text and draft of one course — its enrolment was refused. */
export async function purgeOfflineCourse(
  userId: string,
  courseId: string
): Promise<void> {
  const all = await offlineStore().getAll<ContentRecord>('content');
  for (const record of all) {
    if (record?.userId !== userId) continue;
    if (record.kind === 'lesson' && record.courseId === courseId)
      await purgeOfflineLesson(userId, courseId, record.lessonId);
    if (record.kind === 'draft' && record.courseId === courseId)
      await offlineStore().delete(
        'content',
        draftKey(userId, courseId, record.assignmentId)
      );
  }
}

/* ------------------------------------------------------------------ */
/* assignment drafts                                                   */
/* ------------------------------------------------------------------ */

export async function loadAssignmentDraft(
  userId: string,
  courseId: string,
  assignmentId: string,
  now: number = Date.now()
): Promise<OfflineAssignmentDraft | null> {
  const key = draftKey(userId, courseId, assignmentId);
  const record = await offlineStore().get<OfflineAssignmentDraft>(
    'content',
    key
  );
  if (!record) return null;
  if (record.userId !== userId || now - record.updatedAt > DRAFT_TTL_MS) {
    await offlineStore().delete('content', key);
    return null;
  }
  return record;
}

export async function saveAssignmentDraft(
  draft: Omit<OfflineAssignmentDraft, 'kind' | 'updatedAt'> & {
    readonly updatedAt?: number;
  }
): Promise<boolean> {
  const record: OfflineAssignmentDraft = {
    ...draft,
    kind: 'draft',
    updatedAt: draft.updatedAt ?? Date.now(),
  };
  return offlineStore().put(
    'content',
    draftKey(draft.userId, draft.courseId, draft.assignmentId),
    record
  );
}

export async function deleteAssignmentDraft(
  userId: string,
  courseId: string,
  assignmentId: string
): Promise<void> {
  await offlineStore().delete(
    'content',
    draftKey(userId, courseId, assignmentId)
  );
}

/* ------------------------------------------------------------------ */
/* untimed quiz answer journal                                         */
/* ------------------------------------------------------------------ */

/**
 * Journals the answers of an UNTIMED attempt. A timed attempt is refused
 * here, not merely skipped by the caller: its integrity is the server's.
 */
export async function saveQuizJournal(
  journal: Omit<QuizAnswerJournal, 'kind' | 'updatedAt'> & {
    readonly timed: boolean;
  }
): Promise<boolean> {
  if (journal.timed) return false;
  const record: QuizAnswerJournal = {
    kind: 'quiz',
    userId: journal.userId,
    attemptId: journal.attemptId,
    answers: journal.answers,
    baseRevision: journal.baseRevision,
    updatedAt: Date.now(),
  };
  return offlineStore().put(
    'content',
    quizKey(journal.userId, journal.attemptId),
    record
  );
}

export async function loadQuizJournal(
  userId: string,
  attemptId: string,
  now: number = Date.now()
): Promise<QuizAnswerJournal | null> {
  const key = quizKey(userId, attemptId);
  const record = await offlineStore().get<QuizAnswerJournal>('content', key);
  if (!record) return null;
  if (
    record.userId !== userId ||
    now - record.updatedAt > QUIZ_JOURNAL_TTL_MS
  ) {
    await offlineStore().delete('content', key);
    return null;
  }
  return record;
}

export async function deleteQuizJournal(
  userId: string,
  attemptId: string
): Promise<void> {
  await offlineStore().delete('content', quizKey(userId, attemptId));
}
