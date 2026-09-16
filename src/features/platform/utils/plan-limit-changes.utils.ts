/**
 * Converting between a plan's limits and the editor's draft, and deciding
 * which limits a draft REDUCES (P57).
 *
 * WHY THIS IS ITS OWN FILE. `findReducedLimitKeys` is the trigger for the
 * whole destructive-change flow: the impact check, the warning, and the
 * confirmation that gates the save button all hang off its result. A limit
 * it fails to recognise as a reduction is silently saved with no warning at
 * all — which is exactly the outcome the flow exists to prevent. Logic with
 * that property belongs somewhere it can be tested directly, not inside a
 * dialog component.
 */
import type { PlanLimitKey, PlanResourceLimits } from '@types';

/** `'unlimited'` is a real, explicit value in Atlas — never a magic number. */
export const UNLIMITED = 'unlimited';

/**
 * The editor holds every limit as a STRING while it is being typed —
 * `Number('')` is `0`, so keeping numbers here would turn a half-deleted
 * field into a real "0 academies" limit mid-keystroke. Conversion happens
 * once, on submit.
 *
 * Keyed by `PlanLimitKey`, not `string`, so adding a limit to the plan
 * vocabulary makes this fail to compile rather than silently skip it.
 */
export type LimitDraft = Partial<Record<PlanLimitKey, string>>;

export function limitsToDraft(
  limits: PlanResourceLimits,
  keys: readonly PlanLimitKey[]
): LimitDraft {
  const draft: LimitDraft = {};
  for (const key of keys) {
    const value = limits[key];
    draft[key] = value === UNLIMITED ? UNLIMITED : String(value ?? 0);
  }
  return draft;
}

export function draftToLimits(
  draft: LimitDraft,
  keys: readonly PlanLimitKey[]
): PlanResourceLimits {
  // Built key-by-key from the caller's `PlanLimitKey[]`, so every required
  // field of `PlanResourceLimits` is assigned exactly once.
  const limits = {} as Record<PlanLimitKey, number | typeof UNLIMITED>;
  for (const key of keys) {
    const raw = (draft[key] ?? '').trim();
    if (raw === UNLIMITED) {
      limits[key] = UNLIMITED;
      continue;
    }
    // `Number('')` is 0, and a silent 0 here is a real, saveable limit of
    // zero — an operator who clears a field and saves without retyping
    // would set "no academies at all" for every customer on the plan.
    // NaN instead, which `isCompleteDraft` refuses at the save button and
    // `findReducedLimitKeys` ignores rather than flashing a warning
    // mid-keystroke.
    limits[key] = raw === '' ? Number.NaN : Number(raw);
  }
  return limits;
}

/**
 * Which limits the draft LOWERS relative to the saved plan.
 *
 * Two things count as a reduction, and the second is the one that is easy
 * to miss: a smaller number, and `unlimited` becoming ANY finite number.
 * Going the other way — a number becoming `unlimited`, or a larger number —
 * is a widening and needs no warning.
 *
 * A draft that does not parse to a finite number (mid-edit, or garbage) is
 * deliberately NOT reported as a reduction: `Number('')` is 0 and would
 * otherwise make every cleared field look like a catastrophic cut to zero.
 * The submit-time validation is what refuses those.
 */
export function findReducedLimitKeys(
  current: PlanResourceLimits,
  next: PlanResourceLimits,
  keys: readonly PlanLimitKey[]
): PlanLimitKey[] {
  return keys.filter((key) => {
    const currentValue = current[key];
    const nextValue = next[key];
    if (currentValue === UNLIMITED && nextValue !== UNLIMITED) {
      return typeof nextValue === 'number' && Number.isFinite(nextValue);
    }
    if (typeof currentValue === 'number' && typeof nextValue === 'number') {
      return Number.isFinite(nextValue) && nextValue < currentValue;
    }
    return false;
  });
}

/**
 * Whether every limit in the draft is a value that can actually be saved.
 *
 * Guards the save button. Without it a blank or non-numeric field reaches
 * the API as `NaN`, which serialises to `null` in JSON — the backend would
 * reject it, but only after the operator believed the edit had gone
 * through.
 */
export function isCompleteDraft(
  draft: LimitDraft,
  keys: readonly PlanLimitKey[]
): boolean {
  return keys.every((key) => {
    const raw = (draft[key] ?? '').trim();
    if (raw === UNLIMITED) return true;
    const value = Number(raw);
    return raw !== '' && Number.isFinite(value) && value >= 0;
  });
}
