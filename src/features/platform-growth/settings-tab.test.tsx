/**
 * G1 — Settings tab.
 *
 * Settings: loads the values with their limits; explains problems next to
 * the field and in a summary; saves only the changed fields with the
 * loaded version; a 409 keeps what was typed and offers the latest
 * version, which untouched fields then follow; switching away with
 * unsaved changes is guarded (the registry hook reports dirty).
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '@api';
import type * as HooksModule from '@hooks';
import { growthSettings } from './__tests__/fixtures';
import {
  RAW_KEY,
  apiError,
  installDomShims,
  renderPage,
} from './__tests__/render';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));
const dirtyReports = vi.hoisted(() => [] as boolean[]);
vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof HooksModule>();
  return {
    ...actual,
    useUnsavedChanges: (options: { isDirty: boolean }) => {
      dirtyReports.push(options.isDirty);
      return { markSaved: () => undefined };
    },
  };
});

const { SettingsTab, rebaseDraft } = await import('./components/SettingsTab');
const { settingsDraftOf } = await import('./utils/growth.utils');

const get = vi.fn();
const patch = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(installDomShims);
beforeEach(() => {
  dirtyReports.length = 0;
  vi.spyOn(apiClient, 'get').mockImplementation(((path: string) =>
    get(path)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [get, patch, notifySuccess, notifyError].forEach((fn) => fn.mockReset());
});

const openSettings = (language: 'en' | 'ar' = 'en') =>
  renderPage(<SettingsTab />, {
    language,
    url: '/dashboard/platform/growth?tab=settings',
    path: '/dashboard/platform/growth',
    toast: { notifySuccess, notifyError },
  });

describe('Settings tab', () => {
  beforeEach(() => get.mockResolvedValue(growthSettings()));

  it('shows the saved values with their limits', async () => {
    openSettings();
    const hours = (await screen.findByLabelText(
      'Your hours per week'
    )) as HTMLInputElement;
    expect(hours.value).toBe('15');
    expect(
      screen.getByText(
        'Hours you give to onboarding and support in the season, 1–80, one decimal allowed.'
      )
    ).toBeTruthy();
    expect(
      (screen.getByLabelText('Season starts') as HTMLInputElement).value
    ).toBe('2027-06-01');
    expect(
      (screen.getByLabelText('Hire now at') as HTMLInputElement).value
    ).toBe('40');
    expect(screen.getByText(/Last saved .* by Ziad/)).toBeTruthy();
  });

  it('explains problems next to the field and in a summary, and sends nothing', async () => {
    const user = userEvent.setup(USER);
    openSettings();
    const end = await screen.findByLabelText('Season ends');
    await user.clear(end);
    await user.type(end, '2027-05-01');
    const hireNow = screen.getByLabelText('Hire now at');
    await user.clear(hireNow);
    await user.type(hireNow, '20');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    const summary = await screen.findByText('Check these fields:');
    expect(summary.parentElement!.textContent).toContain(
      'Season ends: The end must be after the start.'
    );
    expect(end.getAttribute('aria-invalid')).toBe('true');
    expect(end.getAttribute('aria-describedby')).toContain(
      'growth-seasonEnd-error'
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('saves only what changed, with the loaded version', async () => {
    patch.mockResolvedValue(
      growthSettings({ weeklyOwnerHours: 20, version: 4 })
    );
    const user = userEvent.setup(USER);
    openSettings();
    const hours = await screen.findByLabelText('Your hours per week');
    await user.clear(hours);
    await user.type(hours, '20');
    expect(dirtyReports.at(-1)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('platform-growth/settings', {
        weeklyOwnerHours: 20,
        version: 3,
      })
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'platformGrowth:settings.toasts.saved'
      )
    );
    expect(dirtyReports.at(-1)).toBe(false);
  });

  it('keeps the draft on a 409 and loads the latest version on request', async () => {
    patch.mockRejectedValue(apiError(409, 'errors.growth.settingsStale'));
    const user = userEvent.setup(USER);
    openSettings();
    const hours = await screen.findByLabelText('Your hours per week');
    await user.clear(hours);
    await user.type(hours, '20');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Someone else saved first');
    get.mockResolvedValue(
      growthSettings({ onboardingCapPerWeek: 6, version: 5 })
    );
    await user.click(
      within(alert).getByRole('button', { name: 'Load the latest version' })
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Onboardings per week') as HTMLInputElement)
          .value
      ).toBe('6')
    );
    expect(
      (screen.getByLabelText('Your hours per week') as HTMLInputElement).value
    ).toBe('20');
    patch.mockResolvedValue(
      growthSettings({ weeklyOwnerHours: 20, version: 6 })
    );
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(patch).toHaveBeenLastCalledWith('platform-growth/settings', {
        weeklyOwnerHours: 20,
        version: 5,
      })
    );
  });

  it('rebases a draft: untouched fields follow the newer version', () => {
    const before = settingsDraftOf(growthSettings());
    const after = settingsDraftOf(growthSettings({ onboardingCapPerWeek: 6 }));
    const draft = { ...before, weeklyOwnerHours: '20' };
    expect(rebaseDraft(draft, before, after)).toEqual({
      ...after,
      weeklyOwnerHours: '20',
    });
  });

  it('renders in Arabic without raw keys', async () => {
    openSettings('ar');
    await screen.findByLabelText('ساعاتك في الأسبوع');
    expect(document.body.textContent ?? '').not.toMatch(RAW_KEY);
  });
});
