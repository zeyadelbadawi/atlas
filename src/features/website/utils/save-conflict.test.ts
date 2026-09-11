/**
 * The safety argument for "keep my changes", asserted directly.
 *
 * The dangerous version of this feature is the one where taking over means
 * force-writing the local copy — which is the same silent data loss the
 * whole mechanism exists to prevent, just moved behind a button the user
 * was nudged into pressing. `versionForSave` is the single line that
 * decides which of those two products this is, so it gets tested on its
 * own rather than only through a component.
 */
import { describe, expect, it } from 'vitest';
import { createApiError } from '@api';
import { readSaveConflict, versionForSave } from './save-conflict.utils';

describe('readSaveConflict', () => {
  it('reads a stale-version conflict, including who saved it', () => {
    const error = createApiError('conflict', {
      status: 409,
      code: 'stale_resource_version',
      details: {
        submittedVersion: 4,
        currentVersion: 5,
        lastEditedByName: 'Ahmed',
        lastEditedAt: '2026-09-11T10:00:00.000Z',
      },
    });

    expect(readSaveConflict(error)).toEqual({
      currentVersion: 5,
      lastEditedByName: 'Ahmed',
      lastEditedAt: '2026-09-11T10:00:00.000Z',
    });
  });

  it('reports no name when the row has no recorded editor, rather than inventing one', () => {
    const error = createApiError('conflict', {
      status: 409,
      details: { currentVersion: 2 },
    });

    expect(readSaveConflict(error)?.lastEditedByName).toBeUndefined();
  });

  /*
   * A duplicate slug is also a 409. It is not a version conflict, and
   * opening the conflict dialog for it would offer two buttons that both
   * do nothing useful — "reload" discards the user's typing and "keep
   * mine" retries a save that will fail the same way.
   */
  it('ignores a 409 that carries no version, so other conflicts keep their own handling', () => {
    const error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.website.slugTaken',
    });

    expect(readSaveConflict(error)).toBeNull();
  });

  it('ignores non-conflict errors', () => {
    expect(readSaveConflict(createApiError('server', { status: 500 }))).toBeNull();
    expect(readSaveConflict(createApiError('forbidden', { status: 403 }))).toBeNull();
    expect(readSaveConflict(null)).toBeNull();
  });

  it('ignores a malformed version rather than trusting the wire', () => {
    const error = createApiError('conflict', {
      status: 409,
      // A string where a number belongs — a client that trusted this would
      // send it straight back as `expectedVersion`.
      details: { currentVersion: 'five' as unknown as number },
    });

    expect(readSaveConflict(error)).toBeNull();
  });
});

describe('versionForSave', () => {
  it('bases an ordinary save on the version that was loaded', () => {
    expect(versionForSave(7, null)).toBe(7);
  });

  /*
   * THE LOAD-BEARING ASSERTION. After a conflict the retry must be based
   * on the SERVER's current version — that is what makes this editor's
   * work land on top of the colleague's committed save instead of erasing
   * it. If this ever returned the locally-loaded version, "keep my
   * changes" would silently overwrite newer work.
   */
  it('bases a take-over on the server version, not the stale local one', () => {
    expect(versionForSave(7, { currentVersion: 9 })).toBe(9);
  });

  it('never falls back to the stale local version when a conflict is present', () => {
    const staleLocal = 7;
    const result = versionForSave(staleLocal, { currentVersion: 9 });
    expect(result).not.toBe(staleLocal);
  });

  it('sends no version when none is known, keeping the pre-existing behaviour', () => {
    expect(versionForSave(undefined, null)).toBeUndefined();
  });
});
