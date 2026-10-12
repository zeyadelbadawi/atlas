/**
 * B0-BIL-07 — a plan's change history shows how many subscribing
 * organizations were told about a price/limit edit, instead of "no change
 * detail" (a notice run has counts, not a field diff).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type { PlanHistoryEntry } from '@types';

const entry: PlanHistoryEntry = {
  id: 'h-1',
  action: 'plan.subscribers_notified',
  actor: { id: 'u-1', name: 'Owner' },
  occurredAt: '2026-11-01T10:00:00.000Z',
  context: {
    key: 'academy',
    planVersion: 4,
    notified: 3,
    cleared: 0,
    failed: 1,
  },
};

vi.mock('../hooks/usePlatformPlans', () => ({
  usePlanHistory: () => ({
    data: {
      items: [entry],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { PlanHistoryPanel } from './PlanHistoryPanel';

afterEach(() => cleanup());

describe('PlanHistoryPanel — subscriber notices', () => {
  it('labels the entry and shows the notified and failed counts', () => {
    render(
      <AtlasLocalizationProvider initialLanguage="en">
        <PlanHistoryPanel planKey="academy" />
      </AtlasLocalizationProvider>
    );
    const row = screen.getByTestId('plan-history-h-1');
    expect(row.textContent).toContain('Subscribers notified');
    expect(row.textContent).toContain('Organizations notified: 3');
    expect(row.textContent).toContain('(see server logs): 1');
    expect(row.textContent).not.toContain('No change detail');
  });
});
