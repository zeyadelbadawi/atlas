/**
 * Task 1 — the Academy Owner sees ONE status: whether their website is
 * published. The Academy's internal lifecycle status (draft/active/
 * suspended/archived) gates nothing an owner controls — draft and active
 * behave identically, suspension is a platform action and archiving has
 * its own Delete flow — so the Settings page no longer offers it and the
 * dashboard no longer shows it.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Academy } from '@types';

const academy = {
  id: 'aca-1',
  organizationId: 'org-1',
  name: 'Horizon Academy',
  slug: 'horizon',
  description: 'Learn things',
  status: 'draft',
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  contactEmail: null,
  contactPhone: null,
  website: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as unknown as Academy;

const updateAcademy = vi.fn(async () => academy);
let websiteStatus: string | undefined = 'published';
let canViewWebsite = true;

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({
    organization: { id: 'org-1' },
    user: { id: 'u-1', name: 'Owner' },
  }),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
  usePermissions: () => ({
    hasPermission: (permission: string) =>
      permission === 'academy.website.view' ? canViewWebsite : true,
  }),
  usePlatform: () => ({ setActiveAcademy: vi.fn() }),
}));
vi.mock('@features/domain', () => ({
  useAcademyDomain: () => ({ data: undefined }),
}));
vi.mock('@forms', () => ({ useServerValidation: () => undefined }));
// Task 3 — the dashboard's activity widget reads the audit-log feature.
vi.mock('@features/audit-log', () => ({
  useAcademyActivityLog: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  AuditEntryRow: () => null,
  tenantEntryToRow: (entry: unknown) => entry,
}));
vi.mock('./hooks', () => ({
  useAcademy: () => ({
    data: academy,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateAcademy: () => ({
    mutateAsync: updateAcademy,
    isPending: false,
    error: null,
  }),
  useAcademies: () => ({
    data: { items: [academy] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAcademyStats: () => ({ data: undefined, isLoading: false, error: null }),
  useAcademyActivity: () => ({ data: undefined, isLoading: false, error: null }),
  useAcademyWebsiteStatus: (_id: string, options: { enabled?: boolean }) => ({
    status: options.enabled === false ? undefined : websiteStatus,
  }),
}));
for (const card of [
  'DeleteAcademyCard',
  'RegistrationPolicyCard',
  'CommunicationSettingsCard',
  'AcademyInvitesCard',
  'ContentProtectionCard',
  'VideoTierCard',
  'DevicePolicyCard',
]) {
  vi.doMock(`./components/${card}`, () => ({ [card]: () => null }));
}

const { default: AcademySettingsPage } =
  await import('./pages/AcademySettingsPage');
const { default: AcademyDashboardPage } =
  await import('./pages/AcademyDashboardPage');

function renderWithI18n(element: JSX.Element) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/dashboard/academy/aca-1/settings']}>
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/settings"
            element={element}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  updateAcademy.mockClear();
  websiteStatus = 'published';
  canViewWebsite = true;
});

describe('Academy Settings', () => {
  it('offers no lifecycle status, and saving never sends one', async () => {
    const user = userEvent.setup();
    renderWithI18n(<AcademySettingsPage />);
    expect(screen.queryByText('Academy Status')).toBeNull();
    expect(screen.queryByText('Suspended')).toBeNull();
    expect(screen.queryByText('Archived')).toBeNull();

    const name = screen.getByLabelText('Academy Name');
    await user.clear(name);
    await user.type(name, 'Horizon Academy 2');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(updateAcademy).toHaveBeenCalledTimes(1));
    const call = updateAcademy.mock.calls[0] as unknown as [
      { payload: Record<string, unknown> },
    ];
    expect(call[0].payload.name).toBe('Horizon Academy 2');
    expect(call[0].payload).not.toHaveProperty('status');
  });
});

describe('Academy dashboard', () => {
  it('shows the website publish state, not the internal lifecycle status', () => {
    renderWithI18n(<AcademyDashboardPage />);
    const status = screen.getByTestId('academy-website-status');
    expect(status.textContent).toContain('Website');
    expect(status.textContent).toContain('Published');
    // The academy is internally `draft`; that is not what the owner sees.
    expect(screen.queryByText('Draft')).toBeNull();
  });

  it('an unpublished site reads as such', () => {
    websiteStatus = 'draft';
    renderWithI18n(<AcademyDashboardPage />);
    expect(screen.getByTestId('academy-website-status').textContent).toContain(
      'Draft'
    );
  });

  it('a member who cannot see the website gets no status line, not an error', () => {
    canViewWebsite = false;
    renderWithI18n(<AcademyDashboardPage />);
    expect(screen.queryByTestId('academy-website-status')).toBeNull();
  });
});
