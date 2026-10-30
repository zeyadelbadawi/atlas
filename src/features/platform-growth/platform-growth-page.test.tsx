/**
 * G1 — Growth & capacity page (`/dashboard/platform/growth`).
 *
 *  1. Capacity is the default tab; `?tab=` deep-links the others and an
 *     unknown value falls back to Capacity; choosing a tab updates the URL.
 *  2. Capacity: alerts most severe first with a severity WORD (not colour
 *     only) and a place to act; meters say value and state in words; the
 *     12-week chart has a legend and a table view with the same numbers.
 *  3. Every tab renders in EN and AR with no raw keys.
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
import { useLocation } from 'react-router-dom';
import { apiClient } from '@api';
import {
  cacReport,
  capacityReport,
  growthSettings,
  spendEntry,
} from './__tests__/fixtures';
import { RAW_KEY, installDomShims, renderPage } from './__tests__/render';
import type { CapacityReport } from './types';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));

const { default: Page, growthTabOf } =
  await import('./pages/PlatformGrowthPage');

const get = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

function serve(path: string) {
  if (path.endsWith('/capacity')) return capacityReport();
  if (path.endsWith('/cac')) return cacReport();
  if (path.endsWith('/spend'))
    return { from: '2025-11', to: '2026-10', items: [spendEntry()] };
  if (path.endsWith('/settings')) return growthSettings();
  throw new Error(`unexpected GET ${path}`);
}

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.search}</output>;
}

beforeAll(installDomShims);
beforeEach(() => {
  get.mockImplementation(async (path: string) => serve(path));
  vi.spyOn(apiClient, 'get').mockImplementation(((path: string) =>
    get(path)) as typeof apiClient.get);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
});

const open = (
  url = '/dashboard/platform/growth',
  language: 'en' | 'ar' = 'en'
) =>
  renderPage(
    <>
      <Page />
      <Where />
    </>,
    { language, url, path: '/dashboard/platform/growth' }
  );

describe('growthTabOf', () => {
  it('defaults to capacity for a missing or unknown tab', () => {
    expect(growthTabOf(null)).toBe('capacity');
    expect(growthTabOf('nope')).toBe('capacity');
    expect(growthTabOf('settings')).toBe('settings');
  });
});

describe('tabs', () => {
  it('opens on Capacity and deep-links the other tabs', async () => {
    open();
    expect(
      screen
        .getByRole('tab', { name: 'Capacity' })
        .getAttribute('aria-selected')
    ).toBe('true');
    expect(await screen.findByText('What needs attention')).toBeTruthy();
    cleanup();

    open('/dashboard/platform/growth?tab=cac');
    expect(
      screen.getByRole('tab', { name: 'CAC' }).getAttribute('aria-selected')
    ).toBe('true');
    expect(
      await screen.findByText('Cash spend only; founder time is not included.')
    ).toBeTruthy();
    cleanup();

    open('/dashboard/platform/growth?tab=unknown');
    expect(
      screen
        .getByRole('tab', { name: 'Capacity' })
        .getAttribute('aria-selected')
    ).toBe('true');
  });

  it('writes the chosen tab to the URL (Capacity clears it)', async () => {
    const user = userEvent.setup(USER);
    open();
    await user.click(screen.getByRole('tab', { name: 'Spend' }));
    expect(screen.getByTestId('where').textContent).toBe('?tab=spend');
    expect(
      await screen.findByText('Meta ads (Facebook / Instagram)')
    ).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Capacity' }));
    expect(screen.getByTestId('where').textContent).toBe('');
  });

  it.each(['en', 'ar'] as const)(
    'renders every tab without raw keys (%s)',
    async (language) => {
      for (const tab of ['capacity', 'cac', 'spend', 'settings']) {
        open(`/dashboard/platform/growth?tab=${tab}`, language);
        await waitFor(() =>
          expect(document.querySelector('[aria-busy="true"]')).toBeNull()
        );
        expect(document.body.textContent ?? '').not.toMatch(RAW_KEY);
        cleanup();
      }
    }
  );

  it('uses the owner’s Arabic title', async () => {
    open('/dashboard/platform/growth', 'ar');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'النمو والسعة' })
    ).toBeTruthy();
  });
});

describe('capacity tab', () => {
  it('lists alerts most severe first, in words, each with a place to act', async () => {
    open();
    const title = await screen.findByText('What needs attention');
    const list = title.parentElement!.querySelector('ul')!;
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-severity'))).toEqual([
      'critical',
      'warning',
      'warning',
    ]);
    expect(items[0].textContent).toContain('Act now:');
    expect(items[0].textContent).toContain(
      'This week needs about 15.7 h of your 15 h (105%).'
    );
    expect(
      within(items[0]).getByRole('link', { name: /Review your hours/ })
    ).toBeTruthy();
    expect(
      within(items[0])
        .getByRole('link', { name: /Review your hours/ })
        .getAttribute('href')
    ).toBe('/dashboard/platform/growth?tab=settings');
  });

  it('says the meters’ values and states in words', async () => {
    open();
    await screen.findByText('What needs attention');
    const meters = screen.getAllByRole('meter');
    const onboardings = meters.find(
      (meter) => meter.getAttribute('aria-label') === 'Onboardings'
    )!;
    expect(onboardings.getAttribute('aria-valuetext')).toBe(
      '5 of 5. At the weekly cap'
    );
    const hours = meters.find(
      (meter) => meter.getAttribute('aria-label') === 'Estimated hours'
    )!;
    expect(hours.getAttribute('aria-valuetext')).toBe(
      '15.7 h of 15 h. Over your hours (105%)'
    );
    expect(screen.getByText('Plan a hire', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('Plan a hire at 33 · Hire at 40')).toBeTruthy();
    expect(screen.getByText('Starts in 218 days')).toBeTruthy();
    expect(
      screen
        .getAllByRole('link', { name: /Open contact enquiries/ })[0]
        .getAttribute('href')
    ).toBe('/dashboard/platform/contact-submissions?status=new');
  });

  it('shows the 12 weeks as a table with the same numbers', async () => {
    const user = userEvent.setup(USER);
    open();
    await screen.findByText('Last 12 weeks', { selector: 'h3, div' });
    expect(screen.getByRole('list', { name: 'Legend' })).toBeTruthy();
    expect(
      screen.getByRole('img', { name: /Line chart of sign-ups, onboardings/ })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show as table' }));
    const table = screen.getByRole('table', { name: 'Last 12 weeks' });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual(['Week starting', 'Sign-ups', 'Onboardings', 'Paid conversions']);
  });

  it('alert sentences agree with their number, in English and Arabic', async () => {
    const alerts = [
      {
        key: 'onboarding_cap_reached',
        severity: 'warning',
        params: { onboardings: 1, cap: 1 },
      },
      {
        key: 'requests_backlog',
        severity: 'warning',
        params: { open: 1, oldestOpenHours: 50 },
      },
      {
        key: 'hire_warn',
        severity: 'warning',
        params: { payingOrgs: 10, warnAt: 10, hireAt: 40 },
      },
      {
        key: 'in_season',
        severity: 'info',
        params: { daysLeft: 0, end: '2027-09-30' },
      },
    ] as const;
    get.mockImplementation(async (path: string) =>
      path.endsWith('/capacity')
        ? capacityReport({
            alerts: alerts as unknown as CapacityReport['alerts'],
          })
        : serve(path)
    );
    open();
    const title = await screen.findByText('What needs attention');
    const items = within(
      title.parentElement!.querySelector('ul')!
    ).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')!.textContent)).toEqual([
      'Warning: 1 onboarding this week against a cap of 1.',
      'Warning: 1 unread contact enquiry; it has waited 50 h.',
      'Warning: 10 paying organizations: time to plan a hire (hire at 40).',
      'Note: In season until 30 Sept 2027 (the last day).',
    ]);
    cleanup();

    open('/dashboard/platform/growth', 'ar');
    const arTitle = await screen.findByText('ما يحتاج انتباهك');
    const ar = within(arTitle.parentElement!.querySelector('ul')!)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('p')!.textContent);
    expect(ar[0]).toContain('عملية تجهيز واحدة هذا الأسبوع');
    expect(ar[1]).toContain('استفسار تواصل واحد غير مقروء');
    expect(ar[2]).toContain('١٠ مؤسسات مدفوعة');
    expect(ar[3]).toContain('(اليوم الأخير)');
  });

  it('says so when nothing needs attention', async () => {
    get.mockImplementation(async (path: string) =>
      path.endsWith('/capacity') ? capacityReport({ alerts: [] }) : serve(path)
    );
    open();
    expect(
      await screen.findByText('Nothing needs attention right now.')
    ).toBeTruthy();
  });
});
