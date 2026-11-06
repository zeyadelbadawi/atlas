/**
 * RTL sweep — the shared display components that take `values` (PageHeader,
 * SectionCard, EmptyState, StatusBadge, the confirm dialog) isolate the
 * text values they interpolate in a right-to-left language, so a page
 * titled "تسليمات {{course}}" with a Latin course title keeps its Arabic
 * order. English output is untouched.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { EmptyState } from '@components/feedback';
import { PageHeader } from './PageHeader';

afterEach(cleanup);

function inLanguage(language: 'en' | 'ar', ui: JSX.Element) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  );
}

describe('PageHeader / EmptyState values', () => {
  it('Arabic: the interpolated course title in the description is isolated', () => {
    inLanguage(
      'ar',
      <PageHeader
        titleKey="instructor:students.title"
        descriptionKey="instructor:students.subtitleCourse"
        values={{ course: 'Chemistry 101' }}
      />
    );
    const heading = screen.getByText(/Chemistry 101/);
    expect(heading.textContent).toContain('⁨Chemistry 101⁩');
    expect(heading.hasAttribute('dir')).toBe(false);
  });

  it('English: unchanged', () => {
    inLanguage(
      'en',
      <PageHeader
        titleKey="instructor:students.title"
        descriptionKey="instructor:students.subtitleCourse"
        values={{ course: 'Chemistry 101' }}
      />
    );
    const heading = screen.getByText(/Chemistry 101/);
    expect(heading.textContent).toContain('Chemistry 101');
    expect(heading.textContent).not.toMatch(/[⁨⁩]/);
  });

  it('numbers pass through unisolated', () => {
    inLanguage(
      'ar',
      <EmptyState
        titleKey="common:pagination.page"
        values={{ page: 2, totalPages: 5 }}
      />
    );
    expect(screen.getByText('صفحة 2 من 5')).toBeTruthy();
  });
});
