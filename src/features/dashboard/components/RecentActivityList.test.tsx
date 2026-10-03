/**
 * Task 3 — the dashboard's recent activity no longer falls back to the
 * contentless "{{actor}} made a change": every catalogue action (including
 * the ones the old 27-action table never covered, such as website pages)
 * reads as a full sentence, and Atlas staff are shown as "Atlas".
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { DashboardActivityItem } from '@types';
import { RecentActivityList } from './RecentActivityList';

afterEach(cleanup);

const ITEMS: DashboardActivityItem[] = [
  {
    id: 'a1',
    action: 'website_page.published',
    category: 'website',
    targetType: 'website_page',
    targetLabel: 'Pricing',
    actorName: 'Sara',
    actorRole: 'manager',
    occurredAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'a2',
    action: 'domain.platform_release',
    category: 'domains',
    targetType: 'domain_connection',
    targetLabel: 'old.example.org',
    actorName: 'Atlas',
    actorIsPlatformStaff: true,
    occurredAt: '2026-10-01T09:00:00.000Z',
  },
];

function renderList(language: 'en' | 'ar') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <RecentActivityList items={ITEMS} />
    </I18nextProvider>
  );
}

describe('RecentActivityList', () => {
  it('renders full English sentences, never the generic fallback', () => {
    renderList('en');
    const rows = screen
      .getAllByTestId('audit-entry')
      .map((row) => row.textContent);
    expect(rows[0]).toContain('Sara published the website page “Pricing”');
    expect(rows[1]).toContain('Atlas released the domain “old.example.org”');
    expect(rows.join(' ')).not.toContain('made a change');
  });

  it('renders Arabic sentences', () => {
    renderList('ar');
    const rows = screen
      .getAllByTestId('audit-entry')
      .map((row) => row.textContent);
    expect(rows[0]).toContain('Sara نشر صفحة الموقع «Pricing»');
    expect(rows[1]).toContain('أطلس حرّر النطاق «old.example.org»');
  });
});
