/**
 * The unified curriculum SEQUENCE (P64 Phase 2 §D.3/§E.2).
 *
 * A field-for-field mirror of the backend's
 * `src/learning/dto/course-sequence.contract.ts` — same rule as
 * `learner-overview.types.ts`: nothing renamed, nothing widened.
 *
 * WHY THE PLAYER READS ONE ARRAY. Before this endpoint the player
 * assembled "what comes next" itself from three lists — lessons from the
 * sections response, quizzes from one endpoint, assignments from another
 * — each ordered independently and none aware of the others, so
 * Previous/Next skipped every assessment. `items` is already ordered and
 * already numbered by the server (`unitNumber`, `itemNumber`,
 * `position`); the sidebar, Previous/Next and Continue are three views of
 * THIS array and therefore cannot disagree. Nothing in the player may
 * re-sort it or compute its own ordinals.
 *
 * NOTHING HERE IS CONTENT. Titles, ordinals, states and lock reasons —
 * never a URL, never a body, never a signed anything. A locked item is
 * listed (the learner has to see that it exists and why it is locked) and
 * carries nothing that could be fetched.
 */

export const SEQUENCE_ITEM_TYPES = [
  'lesson',
  'quiz',
  'assignment',
  'live_session',
] as const;
export type SequenceItemType = (typeof SEQUENCE_ITEM_TYPES)[number];

/**
 * Per-item state — ONE vocabulary across all four types, deliberately.
 *
 * The sidebar renders them in a single column, and a learner reading that
 * column should not have to know that a quiz's "passed" and a lesson's
 * "completed" are different words for the same shape of fact.
 */
export const SEQUENCE_ITEM_STATES = [
  'locked',
  'available',
  'in_progress',
  'completed',
  'passed',
  'failed',
  'submitted',
  'graded',
  'overdue',
] as const;
export type SequenceItemState = (typeof SEQUENCE_ITEM_STATES)[number];

/** Why an item is locked. Closed vocabulary — each reason renders a real translated sentence. */
export const SEQUENCE_LOCK_REASONS = [
  /** Sequential unlock: an earlier item is not finished yet. */
  'previousIncomplete',
  /** Drip: `availableAt` is in the future. */
  'scheduled',
  /** The live session has not started (and is not joinable yet). */
  'notStarted',
  /** Access to the course has ended (revoked, refunded, expired). */
  'accessEnded',
] as const;
export type SequenceLockReason = (typeof SEQUENCE_LOCK_REASONS)[number];

export interface CourseSequenceItem {
  readonly id: string;
  readonly type: SequenceItemType;
  readonly title: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  /** 1-based unit number, for the "2.3" label. Locale digits are the frontend's job. */
  readonly unitNumber: number;
  /** 1-based position within the unit. */
  readonly itemNumber: number;
  /** Position in the whole flattened sequence, so Previous/Next is an index step. */
  readonly position: number;
  readonly state: SequenceItemState;
  readonly lockReason: SequenceLockReason | null;
  readonly durationSeconds: number | null;
  readonly isPreview: boolean;
  /** Assignments and live sessions. Null for everything else. */
  readonly dueAt: string | null;
  readonly availableAt: string | null;
}

export interface CourseSequenceResponse {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly items: readonly CourseSequenceItem[];
  /** Where "Continue" goes: the first item that is not finished. Null when everything is done. */
  readonly continueItemId: string | null;
  readonly completedCount: number;
  readonly totalCount: number;
}
