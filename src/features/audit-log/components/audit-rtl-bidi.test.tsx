/**
 * RTL sweep — the two bidi defects the product owner saw on Arabic pages.
 *
 *   1. "What changed" table: Latin values ("manara" → "riwaq") sat at the
 *      LEFT of their cells while the Arabic headers sat at the right,
 *      because the cells carried `dir="auto"` and resolved `text-align:
 *      start` against their own (LTR) direction. Now the cell keeps the
 *      table's direction and the value is a `<bdi>` inside it.
 *   2. "Ziad Elbadawi صحّح محاولة اختبار في الدورة «test1»" rendered as a
 *      left-to-right line with its Arabic phrases reversed: the sentence
 *      element was `dir="auto"`, so the Latin name decided its direction.
 *      Now the sentence takes the page's direction and each interpolated
 *      value is isolated (U+2068 … U+2069). English output is unchanged.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { AuditChangesTable } from './AuditChangesTable';
import { AuditEntryRow, type AuditRowModel } from './AuditEntryRow';
import { AuditEntryDetailsSheet } from './AuditEntryDetailsSheet';
import { formatAuditEntry } from '../utils/formatAuditEntry';

const FSI = '⁨';
const PDI = '⁩';
const iso = (value: string): string => `${FSI}${value}${PDI}`;

afterEach(cleanup);

function inLanguage(language: 'en' | 'ar', ui: JSX.Element) {
  const i18n = createI18nInstance(language);
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  );
}

const GRADED: AuditRowModel = {
  id: 'row-1',
  occurredAt: '2026-11-01T10:00:00.000Z',
  input: {
    action: 'quiz_attempt.graded',
    actorName: 'Ziad Elbadawi',
    targetType: 'quiz_attempt',
    context: { courseTitle: 'test1' },
  },
  role: 'owner',
  academyName: 'Manara Academy',
};

/** Every element from `el` up to (excluding) `stop` — `dir` must be on none. */
function chain(el: Element, stop: Element): Element[] {
  const out: Element[] = [];
  for (let node: Element | null = el; node && node !== stop;) {
    out.push(node);
    node = node.parentElement;
  }
  return out;
}

describe('What changed table (RTL alignment)', () => {
  const changes = [
    { field: 'theme', label: 'السمة', from: 'manara', to: 'riwaq' },
  ];

  it('keeps the cells in the table direction and isolates the values', () => {
    inLanguage('ar', <AuditChangesTable changes={changes} />);
    const table = screen.getByTestId('audit-changes-table');
    const cells = within(table).getAllByRole('cell');
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      // No own direction on the cell: its `text-align: start` resolves
      // against the table's RTL, like the headers' does.
      expect(cell.hasAttribute('dir')).toBe(false);
      expect(cell.className).toContain('text-start');
      const value = cell.querySelector('bdi');
      expect(value).not.toBeNull();
      expect(value?.hasAttribute('dir')).toBe(false); // <bdi> = auto
    }
    expect(cells[0].textContent).toBe('manara');
    expect(cells[1].textContent).toBe('riwaq');
    for (const header of within(table).getAllByRole('columnheader')) {
      expect(header.className).toContain('text-start');
      expect(header.hasAttribute('dir')).toBe(false);
    }
  });
});

describe('activity sentences (RTL direction + isolation)', () => {
  it('Arabic: the sentence takes the page direction, the values are isolated', () => {
    inLanguage('ar', <AuditEntryRow row={GRADED} compact />);
    const row = screen.getByTestId('audit-entry');
    const sentence = within(row).getByText(
      (_, el) =>
        Boolean(el?.textContent?.startsWith(`${iso('Ziad Elbadawi')} صحّح`)) &&
        el?.tagName === 'SPAN'
    );
    expect(sentence.textContent).toBe(
      `${iso('Ziad Elbadawi')} صحّح محاولة اختبار في الدورة «${iso('test1')}»`
    );
    // Nothing between the sentence and the row decides its direction.
    for (const el of chain(sentence, row)) {
      expect(el.getAttribute('dir'), el.outerHTML.slice(0, 80)).toBeNull();
    }
    expect(row.querySelectorAll('[dir="auto"]')).toHaveLength(0);
  });

  it('English: no isolates and no dir="auto" — output unchanged', () => {
    inLanguage('en', <AuditEntryRow row={GRADED} compact />);
    const row = screen.getByTestId('audit-entry');
    expect(row.textContent).not.toMatch(/[⁨⁩]/);
    expect(row.textContent).toContain(
      formatAuditEntry(GRADED.input, createI18nInstance('en')).sentence
    );
    expect(row.querySelectorAll('[dir="auto"]')).toHaveLength(0);
  });

  it('the "in academy" chip isolates the academy name', () => {
    inLanguage('ar', <AuditEntryRow row={GRADED} showAcademy />);
    expect(screen.getByTestId('audit-entry').textContent).toContain(
      iso('Manara Academy')
    );
  });

  it('details sheet: heading sentence and "who" row follow the page', () => {
    inLanguage(
      'ar',
      <AuditEntryDetailsSheet
        row={{
          ...GRADED,
          input: {
            action: 'website.configuration.updated',
            actorName: 'Ziad Elbadawi',
          },
        }}
        open
        onOpenChange={() => undefined}
        changes={{ theme: { from: 'manara', to: 'riwaq' } }}
      />
    );
    const details = screen.getByTestId('audit-details');
    const heading = details.querySelector('p');
    expect(heading?.textContent?.startsWith(iso('Ziad Elbadawi'))).toBe(true);
    expect(heading?.hasAttribute('dir')).toBe(false);
    // "Who": the name in a <bdi>, the dd itself in the layout direction.
    const who = details.querySelector('dd');
    expect(who?.hasAttribute('dir')).toBe(false);
    expect(who?.querySelector('bdi')?.textContent).toBe('Ziad Elbadawi');
    // And the changes table inside it is the isolated-value table.
    const table = within(details).getByTestId('audit-changes-table');
    for (const cell of within(table).getAllByRole('cell')) {
      expect(cell.hasAttribute('dir')).toBe(false);
      expect(cell.querySelector('bdi')).not.toBeNull();
    }
  });
});
