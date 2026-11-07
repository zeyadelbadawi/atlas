/**
 * Plan management — a plan's history labels a restore and says where the
 * plan went (listed at a position, or hidden), and an archive says how many
 * organizations were on it, instead of "no change detail".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type { PlanHistoryEntry } from '@types';

const entries: PlanHistoryEntry[] = [
  {
    id: 'h-restored',
    action: 'plan.restored',
    actor: { id: 'u-1', name: 'Owner' },
    occurredAt: '2026-11-02T10:00:00.000Z',
    context: { key: 'growth', displayOrder: 3 },
  },
  {
    id: 'h-restored-hidden',
    action: 'plan.restored',
    actor: { id: 'u-1', name: 'Owner' },
    occurredAt: '2026-11-02T09:00:00.000Z',
    context: { key: 'growth', displayOrder: 0 },
  },
  {
    id: 'h-archived',
    action: 'plan.archived',
    actor: { id: 'u-1', name: 'Owner' },
    occurredAt: '2026-11-01T10:00:00.000Z',
    context: {
      key: 'growth',
      payingAtArchive: 1200,
      trialingAtArchive: 4,
      foundingLocksAtArchive: 2,
    },
  },
];

vi.mock('../hooks/usePlatformPlans', () => ({
  usePlanHistory: () => ({
    data: {
      items: entries,
      pagination: { page: 1, pageSize: 10, totalItems: 3, totalPages: 1 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { PlanHistoryPanel } from './PlanHistoryPanel';

afterEach(() => cleanup());

describe('PlanHistoryPanel — restore and archive', () => {
  it('says where a restored plan went and who an archive reached', () => {
    render(
      <AtlasLocalizationProvider initialLanguage="en">
        <PlanHistoryPanel planKey="growth" />
      </AtlasLocalizationProvider>
    );
    const restored = screen.getByTestId('plan-history-h-restored');
    expect(restored.textContent).toContain('Plan restored');
    expect(restored.textContent).toContain(
      'Restored and shown to customers at position 3.'
    );
    expect(restored.textContent).not.toContain('No change detail');
    expect(
      screen.getByTestId('plan-history-h-restored-hidden').textContent
    ).toContain('Restored as a hidden plan.');
    expect(screen.getByTestId('plan-history-h-archived').textContent).toContain(
      'When archived: paying 1,200 · trialing 4 · founding 2.'
    );
  });
});
