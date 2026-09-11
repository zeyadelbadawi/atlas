/**
 * Unsaved-changes registry — P112-UNS-001..010.
 *
 * The registry is the part that decides whether navigation gets blocked
 * at all, so these test the decision, not the dialog's markup. The bugs
 * that actually matter here are the quiet ones: a form that stays
 * registered after unmount blocks every later navigation with nothing on
 * screen to explain why, and a form that never registers silently loses
 * the user's work.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import {
  UnsavedChangesProvider,
  useUnsavedChangesRegistry,
} from './UnsavedChangesProvider';

const wrapper = ({ children }: { children: ReactNode }) => (
  <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
);

describe('unsaved-changes registry — P112-UNS-001..010', () => {
  it('P112-UNS-001 — nothing is dirty to begin with', () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });
    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-002 — a dirty form makes the registry dirty', () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => result.current?.setDirty('form-a', true));

    expect(result.current?.isDirty).toBe(true);
  });

  it('P112-UNS-003 — saving a form clears it', () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => result.current?.setDirty('form-a', true));
    act(() => result.current?.setDirty('form-a', false));

    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-004 — registering the same id twice is idempotent', () => {
    // A counter-based implementation would end up at 2 here and never
    // return to clean, blocking navigation forever.
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => {
      result.current?.setDirty('form-a', true);
      result.current?.setDirty('form-a', true);
    });
    act(() => result.current?.setDirty('form-a', false));

    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-005 — the registry stays dirty while ANY form is dirty', () => {
    // A modal over a page editor: clearing one must not unblock the other.
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => {
      result.current?.setDirty('page-editor', true);
      result.current?.setDirty('modal', true);
    });
    act(() => result.current?.setDirty('modal', false));

    expect(result.current?.isDirty).toBe(true);

    act(() => result.current?.setDirty('page-editor', false));
    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-006 — clearing an id removes it even while dirty', () => {
    // This is the unmount path. Without it a form navigated away from via
    // "Leave" would block the NEXT navigation too.
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => result.current?.setDirty('form-a', true));
    act(() => result.current?.clear('form-a'));

    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-007 — discardAll drops every dirty form', () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => {
      result.current?.setDirty('a', true);
      result.current?.setDirty('b', true);
    });
    act(() => result.current?.discardAll());

    expect(result.current?.isDirty).toBe(false);
  });

  it('P112-UNS-008 — saveAll runs every registered save and reports success', async () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });
    const saveA = vi.fn().mockResolvedValue(true);
    const saveB = vi.fn().mockResolvedValue(true);

    act(() => {
      result.current?.setDirty('a', true, { save: saveA });
      result.current?.setDirty('b', true, { save: saveB });
    });

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current?.saveAll();
    });

    expect(saveA).toHaveBeenCalledTimes(1);
    expect(saveB).toHaveBeenCalledTimes(1);
    expect(outcome).toBe(true);
  });

  it('P112-UNS-009 — a failed save reports failure, so navigation is not allowed', async () => {
    // The consequence that matters: leaving after a failed save would
    // destroy exactly the work the dialog exists to protect.
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() => {
      result.current?.setDirty('a', true, {
        save: vi.fn().mockResolvedValue(true),
      });
      result.current?.setDirty('b', true, {
        save: vi.fn().mockResolvedValue(false),
      });
    });

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current?.saveAll();
    });

    expect(outcome).toBe(false);
  });

  it('P112-UNS-010 — a save that THROWS is a failure, not a crash', async () => {
    const { result } = renderHook(() => useUnsavedChangesRegistry(), {
      wrapper,
    });

    act(() =>
      result.current?.setDirty('a', true, {
        save: vi.fn().mockRejectedValue(new Error('network down')),
      })
    );

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current?.saveAll();
    });

    expect(outcome).toBe(false);
  });

  it('P112-UNS-011 — a form outside the provider degrades instead of throwing', () => {
    // Deliberate: losing an "are you sure" is not worth crashing a page.
    const { result } = renderHook(() => useUnsavedChangesRegistry());
    expect(result.current).toBeNull();
  });

  it('P112-UNS-012 — a form that registers on mount and clears on unmount leaves it clean', () => {
    // The real `useUnsavedChanges` lifecycle, end to end: without the
    // unmount cleanup a form left via "Leave without saving" would keep
    // blocking navigation with nothing on screen to explain why.
    const dirtyStates: boolean[] = [];

    function DirtyForm({ id }: { id: string }) {
      const registry = useUnsavedChangesRegistry();
      useEffect(() => {
        registry?.setDirty(id, true);
        return () => registry?.clear(id);
      }, [registry, id]);
      return null;
    }

    function Probe() {
      dirtyStates.push(useUnsavedChangesRegistry()?.isDirty ?? false);
      return null;
    }

    const view = render(
      <UnsavedChangesProvider>
        <Probe />
        <DirtyForm id="mounted-form" />
      </UnsavedChangesProvider>
    );
    expect(dirtyStates.at(-1)).toBe(true);

    view.rerender(
      <UnsavedChangesProvider>
        <Probe />
      </UnsavedChangesProvider>
    );
    expect(dirtyStates.at(-1)).toBe(false);
  });
});
