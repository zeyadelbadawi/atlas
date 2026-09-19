/**
 * Naming an assessment's state, for a field that is a plain string on the
 * wire (§E.1).
 *
 * WHY THIS IS NOT A TYPED UNION. `LearnerAssessmentItem.state` and
 * `RecentResult.status` are declared `string` in the backend contract on
 * purpose: they are composed from three different server-side enums —
 * `QuizAttemptStatus` (`not_started`, `in_progress`, `submitted`,
 * `passed`, `failed`), `AssignmentSubmissionStatus` (`draft`,
 * `submitting`, `submitted`, `failed`), and `graded`/`overdue` derived on
 * top of both — and the union of three enums that each may gain a member
 * is precisely the shape that breaks a frontend at runtime the day the
 * backend adds one.
 *
 * SO THE FALLBACK IS THE POINT. A state this build knows gets its own
 * translated word; a state it does not know renders as the raw value
 * rather than as a blank or a crash. A learner briefly seeing
 * `needs_revision` in English on an Arabic screen is a small, obvious,
 * fixable defect; an empty cell where their result should be is neither
 * obvious nor fixable by the person looking at it.
 */

/** Every state this build has copy for. Add to `learning.json` and here together. */
export const KNOWN_ASSESSMENT_STATES: readonly string[] = [
  'not_started',
  'in_progress',
  'submitted',
  'submitting',
  'draft',
  'passed',
  'failed',
  'graded',
  'overdue',
];

/**
 * The translation key for one state, or `undefined` when this build has
 * no word for it.
 *
 * Returning `undefined` rather than a guessed key keeps i18next from
 * rendering the key path itself — `learning:…state.needs_revision` on
 * screen is worse than the raw value, because it looks like a bug in the
 * page rather than a gap in the copy.
 */
export function learnerAssessmentStateKey(state: string): string | undefined {
  return KNOWN_ASSESSMENT_STATES.includes(state)
    ? `learning:learnerDashboard.assessments.state.${state}`
    : undefined;
}

/**
 * The word to show for a state: the translation when there is one, the
 * raw server value when there is not.
 *
 * One function so no call site has to remember the fallback — the whole
 * failure mode this file guards against is a page that forgot it.
 */
export function learnerAssessmentStateLabel(
  state: string,
  translate: (key: string) => string
): string {
  const key = learnerAssessmentStateKey(state);
  return key ? translate(key) : state;
}

/** Whether a state means the learner still owes work. Drives the "due" emphasis. */
export function isAssessmentOutstanding(state: string): boolean {
  return (
    state === 'not_started' ||
    state === 'in_progress' ||
    state === 'draft' ||
    state === 'overdue'
  );
}
