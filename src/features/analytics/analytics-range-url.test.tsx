/**
 * The Analysis date range lives in the URL (P59).
 *
 * WHY IT MOVED THERE. The four Analysis areas are now four routes. While
 * they were tabs, the range was `useState` in the one component that owned
 * all four panels, so it survived switching tabs for free. Once they became
 * separate routes that state unmounted on every navigation — an operator
 * looking at 90 days of revenue clicked Users and silently got 30.
 *
 * The URL is also user-editable text, so the two cases that matter are
 * "a range I typed is honoured" and "a range I mistyped does not break the
 * page".
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAnalyticsRange } from './pages/useAnalyticsRange';

function atUrl(url: string) {
  return renderHook(() => useAnalyticsRange(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    ),
  });
}

describe('useAnalyticsRange', () => {
  it('reads the preset out of the query string', () => {
    expect(atUrl('/dashboard/analytics/revenue?range=90d').result.current.preset).toBe(
      '90d'
    );
    expect(atUrl('/dashboard/analytics?range=7d').result.current.preset).toBe('7d');
  });

  it('defaults to 30 days when no range is given', () => {
    expect(atUrl('/dashboard/analytics').result.current.preset).toBe('30d');
  });

  it('falls back to the default for an unrecognised range rather than erroring', () => {
    // A hand-edited or stale URL must not take the page down.
    expect(atUrl('/dashboard/analytics?range=all-time').result.current.preset).toBe('30d');
    expect(atUrl('/dashboard/analytics?range=').result.current.preset).toBe('30d');
  });

  it('exposes a concrete date range for the chosen preset', () => {
    const { result } = atUrl('/dashboard/analytics?range=7d');
    const { from, to } = result.current.query.dateRange;
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
    // 7d means seven days back, not an arbitrary window.
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(7);
  });

  it('keeps the same query object identity while the preset is unchanged', () => {
    // The object goes straight into a TanStack Query key; a new identity on
    // every render would refetch every analytics endpoint continuously.
    const { result, rerender } = atUrl('/dashboard/analytics?range=90d');
    const first = result.current.query;
    rerender();
    expect(result.current.query).toBe(first);
  });
});
