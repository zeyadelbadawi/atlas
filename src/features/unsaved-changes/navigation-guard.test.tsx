/**
 * Unsaved-changes guard, end to end through a real data router (Task I).
 *
 * The registry tests check the bookkeeping; these check what a user sees:
 * the dialog appears only for genuinely unsaved work, "Save and leave"
 * really saves before leaving (and stays on failure), and saving then
 * navigating in the same handler is never met with "Leave without
 * saving?". Each case below reproduces a reported failure of the old
 * guard; the noted assertions failed before the fix.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useUnsavedChanges } from '@hooks';
import { UnsavedChangesProvider } from './UnsavedChangesProvider';
import { NavigationBlockDialog } from './NavigationBlockDialog';

afterEach(cleanup);

interface EditorProps {
  readonly onSave?: (value: string) => Promise<boolean>;
  /** Saves via the editor's own button, then navigates — like a create form. */
  readonly saveAndGo?: (value: string) => Promise<boolean>;
}

/** A guarded form: an input whose dirtiness is its difference from the saved value. */
function Editor({ onSave, saveAndGo }: EditorProps): JSX.Element {
  const navigate = useNavigate();
  const [saved, setSaved] = useState('');
  const [value, setValue] = useState('');
  const { markSaved } = useUnsavedChanges({
    isDirty: value !== saved,
    onSave: onSave
      ? async () => {
          const ok = await onSave(value);
          if (ok) setSaved(value);
          return ok;
        }
      : undefined,
  });
  return (
    <div>
      <input
        aria-label="field"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="button" onClick={() => navigate('/elsewhere')}>
        go
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      {saveAndGo ? (
        <button
          type="button"
          onClick={async () => {
            if (!(await saveAndGo(value))) return;
            // Exactly what a create/save handler does: mark saved, then
            // navigate in the same tick, before React re-renders.
            markSaved();
            navigate('/elsewhere');
          }}
        >
          save-and-go
        </button>
      ) : null}
    </div>
  );
}

function Where(): JSX.Element {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function Shell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      {children}
      <Where />
      <NavigationBlockDialog />
    </>
  );
}

function renderGuard(props: EditorProps = {}) {
  const router = createMemoryRouter(
    [
      { path: '/start', element: <Shell>start</Shell> },
      {
        path: '/edit',
        element: (
          <Shell>
            <Editor {...props} />
          </Shell>
        ),
      },
      { path: '/elsewhere', element: <Shell>elsewhere</Shell> },
    ],
    { initialEntries: ['/start', '/edit'], initialIndex: 1 }
  );
  render(
    <UnsavedChangesProvider>
      <RouterProvider router={router} />
    </UnsavedChangesProvider>
  );
  return router;
}

const where = () => screen.getByTestId('where').textContent;
const type = (text: string) =>
  fireEvent.change(screen.getByLabelText('field'), { target: { value: text } });
const click = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

describe('unsaved-changes guard — real navigation', () => {
  it('lets a clean form navigate with no dialog', async () => {
    renderGuard();
    await click('go');
    expect(where()).toBe('/elsewhere');
    expect(screen.queryByTestId('unsaved-stay')).toBeNull();
  });

  it('asks before leaving a dirty form; Stay keeps the edit and the page', async () => {
    renderGuard();
    type('draft');
    await click('go');
    expect(screen.getByTestId('unsaved-stay')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-stay')));
    expect(where()).toBe('/edit');
    expect((screen.getByLabelText('field') as HTMLInputElement).value).toBe(
      'draft'
    );
  });

  it('Leave discards and navigates exactly once', async () => {
    const router = renderGuard();
    const navigations: string[] = [];
    router.subscribe((state) => {
      if (state.navigation.state === 'idle') {
        navigations.push(state.location.pathname);
      }
    });
    type('draft');
    await click('go');
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-leave')));
    expect(where()).toBe('/elsewhere');
    expect(navigations.filter((path) => path === '/elsewhere')).toHaveLength(1);
  });

  // Reported: "Save changes and leave does not save". It used to behave
  // exactly like Leave — no form registered a save, and saveAll skipped
  // forms without one and reported success.
  it('Save and leave runs the form save, then continues to the destination', async () => {
    const onSave = vi.fn(async () => true);
    renderGuard({ onSave });
    type('draft');
    await click('go');
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-save')));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('draft');
    expect(where()).toBe('/elsewhere');
  });

  it('a failed save keeps the dialog open, the edit and the page', async () => {
    const onSave = vi.fn(async () => false);
    renderGuard({ onSave });
    type('draft');
    await click('go');
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-save')));
    expect(where()).toBe('/edit');
    expect(screen.getByTestId('unsaved-save-failed')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-stay')));
    expect((screen.getByLabelText('field') as HTMLInputElement).value).toBe(
      'draft'
    );
  });

  it('a save that throws is a failure: no navigation', async () => {
    renderGuard({
      onSave: async () => {
        throw new Error('network');
      },
    });
    type('draft');
    await click('go');
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-save')));
    expect(where()).toBe('/edit');
  });

  it('repeated Save clicks save once', async () => {
    let finish: (ok: boolean) => void = () => undefined;
    const onSave = vi.fn(
      () => new Promise<boolean>((resolve) => (finish = resolve))
    );
    renderGuard({ onSave });
    type('draft');
    await click('go');
    const save = screen.getByTestId('unsaved-save');
    await act(async () => {
      fireEvent.click(save);
      fireEvent.click(save);
      fireEvent.click(save);
    });
    await act(async () => finish(true));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(where()).toBe('/elsewhere');
  });

  // A form that cannot save itself must not be offered a Save that would
  // silently drop its work.
  it('offers only Stay and Leave when the dirty form cannot save', async () => {
    renderGuard();
    type('draft');
    await click('go');
    expect(screen.getByTestId('unsaved-leave')).toBeTruthy();
    expect(screen.queryByTestId('unsaved-save')).toBeNull();
  });

  // Reported: "the dialog appears after an entity was already saved or
  // created". Saving, then navigating in the same handler, was blocked by
  // the dirt that had just been saved (state reaches the blocker an
  // effect late).
  it('saving then navigating in the same handler is not blocked', async () => {
    renderGuard({ saveAndGo: async () => true });
    type('new course');
    await click('save-and-go');
    expect(screen.queryByTestId('unsaved-stay')).toBeNull();
    expect(where()).toBe('/elsewhere');
  });

  it('a failed save-and-go stays and keeps protection armed', async () => {
    renderGuard({ saveAndGo: async () => false });
    type('new course');
    await click('save-and-go');
    expect(where()).toBe('/edit');
    await click('go');
    expect(screen.getByTestId('unsaved-stay')).toBeTruthy();
  });

  it('browser back is guarded too', async () => {
    renderGuard();
    type('draft');
    await click('back');
    expect(screen.getByTestId('unsaved-stay')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByTestId('unsaved-leave')));
    expect(where()).toBe('/start');
  });

  it('clean again (edit undone) lets navigation through', async () => {
    renderGuard();
    type('draft');
    type('');
    await click('go');
    expect(screen.queryByTestId('unsaved-stay')).toBeNull();
    expect(where()).toBe('/elsewhere');
  });
});
