import { describe, expect, it } from 'vitest';
import { reconcileActiveAcademy } from './active-academy.utils';

const own = { id: 'own-1', status: 'active' } as const;
const ownDraft = { id: 'own-2', status: 'draft' } as const;
const archived = { id: 'own-3', status: 'archived' } as const;

describe('reconcileActiveAcademy', () => {
  it('leaves the stored id alone while the academy list is still loading', () => {
    expect(reconcileActiveAcademy('foreign-1', undefined)).toEqual({
      academyId: 'foreign-1',
      changed: false,
    });
  });

  it('keeps an id that belongs to the active organization', () => {
    expect(reconcileActiveAcademy('own-2', [own, ownDraft])).toEqual({
      academyId: 'own-2',
      changed: false,
    });
  });

  it("replaces an id the account cannot reach (another account's academy) with the first reachable one", () => {
    expect(reconcileActiveAcademy('foreign-1', [own, ownDraft])).toEqual({
      academyId: 'own-1',
      changed: true,
    });
  });

  it('replaces an archived academy with a live one', () => {
    expect(reconcileActiveAcademy('own-3', [archived, ownDraft])).toEqual({
      academyId: 'own-2',
      changed: true,
    });
  });

  it('clears the id when the organization has no reachable academy', () => {
    expect(reconcileActiveAcademy('foreign-1', [])).toEqual({
      academyId: undefined,
      changed: true,
    });
    expect(reconcileActiveAcademy('own-3', [archived])).toEqual({
      academyId: undefined,
      changed: true,
    });
  });

  it('selects the first live academy when nothing was remembered', () => {
    expect(reconcileActiveAcademy(undefined, [archived, own])).toEqual({
      academyId: 'own-1',
      changed: true,
    });
  });

  it('reports no change when nothing was remembered and nothing qualifies', () => {
    expect(reconcileActiveAcademy(undefined, [archived])).toEqual({
      academyId: undefined,
      changed: false,
    });
  });
});
