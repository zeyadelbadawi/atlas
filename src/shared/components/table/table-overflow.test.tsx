/**
 * B4 (UX audit) — a table wider than the screen says so: a shade on the
 * side with hidden columns, a hint under it, and a keyboard-reachable,
 * named scroll region. At 375 px the members table hid Remove off-screen.
 */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { DataTable } from './DataTable';
import { measureOverflow } from './useHorizontalOverflow';

function box(scrollWidth: number, clientWidth: number, scrollLeft = 0) {
  return { scrollWidth, clientWidth, scrollLeft } as unknown as HTMLElement;
}

describe('measureOverflow', () => {
  it('nothing hidden when the content fits', () => {
    expect(measureOverflow(box(300, 300))).toEqual({
      overflows: false,
      hiddenStart: false,
      hiddenEnd: false,
    });
  });

  it('hidden at the end before scrolling, at both sides midway, at the start at the end', () => {
    expect(measureOverflow(box(800, 300, 0))).toMatchObject({
      overflows: true,
      hiddenStart: false,
      hiddenEnd: true,
    });
    expect(measureOverflow(box(800, 300, 200))).toMatchObject({
      hiddenStart: true,
      hiddenEnd: true,
    });
    expect(measureOverflow(box(800, 300, 500))).toMatchObject({
      hiddenStart: true,
      hiddenEnd: false,
    });
  });

  it('reads RTL negative scrollLeft the same way', () => {
    expect(measureOverflow(box(800, 300, -500))).toMatchObject({
      hiddenStart: true,
      hiddenEnd: false,
    });
  });
});

interface Row {
  readonly name: string;
}
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
];

describe('DataTable — wider than the screen', () => {
  it('shows the hint, the end shade and a named scroll region only when it overflows', () => {
    const widths = { scroll: 900, client: 375 };
    const scrollWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollWidth'
    );
    const clientWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => widths.scroll,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => widths.client,
    });
    try {
      render(
        <I18nextProvider i18n={createI18nInstance('en')}>
          <DataTable columns={columns} data={[{ name: 'Sarah' }]} />
        </I18nextProvider>
      );
      expect(
        screen.getByText('Scroll sideways to see every column.')
      ).not.toBeNull();
      expect(screen.getByTestId('table-shade-end')).not.toBeNull();
      expect(screen.queryByTestId('table-shade-start')).toBeNull();
      const region = screen.getByRole('region', {
        name: 'Table, scrolls sideways',
      });
      expect(region.getAttribute('tabindex')).toBe('0');

      widths.scroll = 375;
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(
        screen.queryByText('Scroll sideways to see every column.')
      ).toBeNull();
      expect(screen.queryByRole('region')).toBeNull();
    } finally {
      if (scrollWidth)
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollWidth',
          scrollWidth
        );
      if (clientWidth)
        Object.defineProperty(
          HTMLElement.prototype,
          'clientWidth',
          clientWidth
        );
    }
  });
});
