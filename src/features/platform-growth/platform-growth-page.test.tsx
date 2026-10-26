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
