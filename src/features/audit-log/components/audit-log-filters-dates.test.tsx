/**
 * B4 (UX audit) V17 — Activity filters: "From" after "To" says so, with
 * Swap, in English and Arabic (the list alone just read "No activity").
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { AuditLogFilters } from './AuditLogFilters';
import { EMPTY_AUDIT_FILTERS } from '../utils/audit-filters';

afterEach(cleanup);

function renderFilters(
  value: typeof EMPTY_AUDIT_FILTERS,
  onChange = vi.fn(),
  language: 'en' | 'ar' = 'en'
) {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AuditLogFilters value={value} onChange={onChange} categories={[]} />
    </I18nextProvider>
  );
  return onChange;
}

describe('AuditLogFilters — reversed dates', () => {
  it('explains a reversed range and swaps it', () => {
    const onChange = renderFilters({
      ...EMPTY_AUDIT_FILTERS,
      from: '2026-10-20',
      to: '2026-10-01',
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'The start date is after the end date'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Swap dates' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-10-01', to: '2026-10-20' })
    );
  });

  it('says nothing for dates in order, and speaks Arabic', () => {
    renderFilters({
      ...EMPTY_AUDIT_FILTERS,
      from: '2026-10-01',
      to: '2026-10-20',
    });
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();
    renderFilters(
      { ...EMPTY_AUDIT_FILTERS, from: '2026-10-20', to: '2026-10-01' },
      vi.fn(),
      'ar'
    );
    expect(screen.getByRole('alert').textContent).toContain(
      createI18nInstance('ar').t('validation:dateRangeReversed')
    );
  });
});
