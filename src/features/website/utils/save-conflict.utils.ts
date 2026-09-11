/**
 * Turning a failed save into either a conflict to resolve or an ordinary
 * error, and deciding what the retry is based on.
 *
 * Pulled out of the editor component because these two decisions are the
 * entire safety argument for "take over", and a safety argument buried in a
 * 400-line page component is one nobody can check. Both are pure, so both
 * can be asserted directly.
 */
import type { ApiError } from '@api';

export const STALE_RESOURCE_VERSION_CODE = 'stale_resource_version';

export interface SaveConflict {
  readonly currentVersion: number;
  readonly lastEditedByName?: string;
  readonly lastEditedAt?: string;
}

/**
 * A save conflict, or `null` for anything else.
 *
 * Requires BOTH the conflict kind and a usable `currentVersion`. A 409
 * without one is a different conflict — a duplicate slug, say — and must
 * fall through to ordinary error handling rather than opening a dialog
 * whose only two buttons would both be meaningless.
 */
export function readSaveConflict(error: ApiError | null): SaveConflict | null {
  if (!error || error.kind !== 'conflict') return null;

  const details = error.details;
  const currentVersion = details?.currentVersion;
  if (typeof currentVersion !== 'number') return null;

  const name = details?.lastEditedByName;
  const at = details?.lastEditedAt;

  return {
    currentVersion,
    lastEditedByName: typeof name === 'string' ? name : undefined,
    lastEditedAt: typeof at === 'string' ? at : undefined,
  };
}

/**
 * The version a save should be based on.
 *
 * THIS IS THE WHOLE POINT OF "KEEP MY CHANGES". After a conflict, the
 * retry is based on the version the SERVER reported — so this editor's work
 * is applied on top of the colleague's committed save. It is emphatically
 * not a bypass: the retry still carries a version, the server still checks
 * it, and if a third save lands in between this conflicts again rather than
 * overwriting that one too.
 *
 * Returning `undefined` (no conflict, no loaded page) is the ordinary first
 * save, where the loaded version is the right base.
 */
export function versionForSave(
  loadedVersion: number | undefined,
  conflict: SaveConflict | null
): number | undefined {
  return conflict?.currentVersion ?? loadedVersion;
}
