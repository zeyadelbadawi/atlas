/**
 * SearchInput — the caller owns the committed value; the input only reports
 * the user's settled typing.
 *
 * The regression pinned here: when the caller clears the value externally
 * ("Clear filters"), the input's debounced draft still holds the old text
 * for one debounce window. URL-backed callers (React Router's
 * `setSearchParams`) hand over a new `onValueChange` whenever the URL
 * changes, and that re-ran the reporting effect with the stale draft, so
 * the cleared search came straight back.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useCallback, useState } from 'react';
import { SearchInput } from './SearchInput';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const DEBOUNCE_MS = 300;

/** A caller whose change handler changes identity with its value, like a URL-backed one. */
function Harness({
  initial,
  onReport,
}: {
  readonly initial: string;
  readonly onReport: (value: string) => void;
}): JSX.Element {
  const [value, setValue] = useState(initial);
  const handleChange = useCallback(
    (next: string) => {
      onReport(next);
      setValue(next);
    },
    // Recreated on every value change, as `setSearchParams` is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, onReport]
  );
  return (
    <>
      <SearchInput
        value={value}
        onValueChange={handleChange}
        debounceMs={DEBOUNCE_MS}
      />
      <button type="button" onClick={() => setValue('')}>
        Clear filters
      </button>
      <output data-testid="committed">{value}</output>
    </>
  );
}

describe('SearchInput', () => {
  it('does not bring back a search the caller cleared', () => {
    vi.useFakeTimers();
    const onReport = vi.fn();
    render(<Harness initial="nobody" onReport={onReport} />);

    act(() => {
      screen.getByRole('button', { name: 'Clear filters' }).click();
    });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS * 2);
    });

    expect(onReport).not.toHaveBeenCalledWith('nobody');
    expect(screen.getByTestId('committed').textContent).toBe('');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  });

  it('reports typing once the user pauses', () => {
    vi.useFakeTimers();
    const onReport = vi.fn();
    render(<Harness initial="" onReport={onReport} />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'lay' } });
    // Nothing is reported while the user may still be typing.
    expect(onReport).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledWith('lay');
    expect(screen.getByTestId('committed').textContent).toBe('lay');
  });
});
