/**
 * G1 — CAC and Spend tabs.
 *
 * CAC: asks the API for the URL's range (default: the last 6 Cairo
 * months); shows only channels with activity unless asked; "—" plus
 * "spent, no paying yet" when there is spend but no paying organization;
 * the blended row and the unknown-source note; the cash-only note; a range
 * over 36 months is refused before any request; empty months explain how
 * data appears.
 *
 * Spend: grouped by month with a total; add sends integer piastres; edit
 * sends the loaded version; a 409 reloads and says someone else changed
 * it; delete is confirmed.
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
import {
  cacReport,
  channelRows,
  spendEntry,
  totals,
} from './__tests__/fixtures';
import {
  RAW_KEY,
  apiError,
  installDomShims,
  renderPage,
} from './__tests__/render';
import { defaultCacRange } from './utils/growth.utils';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));

const { CacTab } = await import('./components/CacTab');
const { SpendTab, groupByMonth } = await import('./components/SpendTab');

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(installDomShims);
beforeEach(() => {
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: { params?: Record<string, string> }
  ) => get(path, options?.params)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'post').mockImplementation(((
    path: string,
    body: unknown
  ) => post(path, body)) as typeof apiClient.post);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
  vi.spyOn(apiClient, 'delete').mockImplementation(((path: string) =>
    del(path)) as typeof apiClient.delete);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [get, post, patch, del, notifySuccess, notifyError].forEach((fn) =>
    fn.mockReset()
  );
});

const openCac = (
  url = '/dashboard/platform/growth?tab=cac',
  language: 'en' | 'ar' = 'en'
) =>
  renderPage(<CacTab />, {
    language,
    url,
    path: '/dashboard/platform/growth',
  });

describe('CAC tab', () => {
  beforeEach(() => get.mockResolvedValue(cacReport()));

  it('asks for the last 6 Cairo months by default, and the URL range when given', async () => {
    openCac();
    await screen.findByText('Whole period');
    expect(get).toHaveBeenCalledWith('platform-growth/cac', defaultCacRange());
    cleanup();
    get.mockClear();
    openCac('/dashboard/platform/growth?tab=cac&from=2026-01&to=2026-03');
    await screen.findByText('Whole period');
    expect(get).toHaveBeenCalledWith('platform-growth/cac', {
      from: '2026-01',
      to: '2026-03',
    });
  });

  it('shows active channels, CAC, the blended row and the cash-only note', async () => {
    openCac();
    expect(
      screen.getByText('Cash spend only; founder time is not included.')
    ).toBeTruthy();
    const table = await screen.findByRole('table', {
      name: 'CAC by channel, October 2026',
    });
    const rows = within(table).getAllByRole('row');
    // header + 3 active channels (Meta ads, YouTube, WhatsApp) + blended + unknown note
    expect(rows.map((row) => row.textContent)).toEqual(
      [
        'ChannelSign-upsPayingSpendCAC',
        expect.stringMatching(/^YouTube00EGP\s?1,000—spent, no paying yet$/),
        expect.stringMatching(/^WhatsApp21EGP\s?0EGP\s?0$/),
        expect.stringMatching(
          /^Meta ads \(Facebook \/ Instagram\)42incl\. 1 foundingEGP\s?5,000EGP\s?2,500$/
        ),
        expect.stringMatching(
          /^All channels \(blended\)83incl\. 1 foundingEGP\s?6,000EGP\s?2,000$/
        ),
        '2 sign-ups with no known source count in the blended row only.',
      ].filter(Boolean) as unknown[]
    );
  });

  it('shows every channel when asked', async () => {
    const user = userEvent.setup(USER);
    openCac();
    const table = await screen.findByRole('table', {
      name: 'CAC by channel, October 2026',
    });
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    await user.click(
      screen.getByRole('checkbox', { name: 'Show channels with no activity' })
    );
    expect(within(table).getAllByRole('row')).toHaveLength(15 + 3);
  });

  it('says a month had no activity, and summarises the period', async () => {
    openCac();
    expect(
      await screen.findByText('No sign-ups or spend this month.')
    ).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('6 of 8 sign-ups')).toBeTruthy();
  });

  it('refuses a range over 36 months before asking the API', async () => {
    const user = userEvent.setup(USER);
    openCac();
    await screen.findByText('Whole period');
    get.mockClear();
    const from = screen.getByLabelText('From');
    await user.clear(from);
    await user.type(from, '2020-01');
    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Choose at most 36 months.'
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('explains how data appears when the period is empty', async () => {
    get.mockResolvedValue(
      cacReport({
        months: [
          { month: '2026-10', channels: channelRows(), totals: totals() },
        ],
        overall: { ...totals(), channels: channelRows() },
        coverage: { signups: 0, attributedSignups: 0, ratio: null },
      })
    );
    openCac();
    expect(
      await screen.findByText('No numbers for these months yet')
    ).toBeTruthy();
    expect(screen.getByText(/How did you first hear about us\?/)).toBeTruthy();
  });

  it('renders in Arabic without raw keys', async () => {
    openCac('/dashboard/platform/growth?tab=cac', 'ar');
    await screen.findByText('الفترة كاملة');
    expect(
      screen.getByText('المصروفات النقدية فقط؛ وقت المؤسس غير محسوب.')
    ).toBeTruthy();
    expect(document.body.textContent ?? '').not.toMatch(RAW_KEY);
  });
});

const openSpend = () =>
  renderPage(<SpendTab />, {
    url: '/dashboard/platform/growth?tab=spend',
    path: '/dashboard/platform/growth',
    toast: { notifySuccess, notifyError },
  });

const ENTRIES = [
  spendEntry(),
  spendEntry({
    id: 'spend-2',
    channel: 'youtube',
    amountMinorUnits: 100_000,
    description: null,
    version: 4,
  }),
  spendEntry({ id: 'spend-3', month: '2026-08', amountMinorUnits: 50_000 }),
];

describe('Spend tab', () => {
  beforeEach(() => {
    get.mockResolvedValue({ from: '2025-11', to: '2026-10', items: ENTRIES });
  });

  it('groups entries by month, newest first, with totals', () => {
    const groups = groupByMonth(ENTRIES);
    expect(groups.map((g) => [g.month, g.totalMinorUnits])).toEqual([
      ['2026-10', 225_050],
      ['2026-08', 50_000],
    ]);
  });

  it('lists months with their totals', async () => {
    openSpend();
    const october = await screen.findByRole('region', { name: 'October 2026' });
    expect(within(october).getByText(/Total EGP\s?2,250\.50/)).toBeTruthy();
    expect(
      within(october).getByRole('button', {
        name: 'Edit YouTube, October 2026',
      })
    ).toBeTruthy();
    expect(screen.getByRole('region', { name: 'August 2026' })).toBeTruthy();
  });

  it('adds spend in piastres', async () => {
    post.mockResolvedValue(spendEntry({ id: 'new' }));
    const user = userEvent.setup(USER);
    openSpend();
    await screen.findByRole('region', { name: 'October 2026' });
    await user.click(screen.getAllByRole('button', { name: 'Add spend' })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Choose a channel.')).toBeTruthy();
    expect(within(dialog).getByText(/Enter an amount above 0/)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    const month = within(dialog).getByLabelText('Month');
    await user.clear(month);
    await user.type(month, '2026-09');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Channel' }),
      'tiktok'
    );
    await user.type(within(dialog).getByLabelText('Amount (EGP)'), '1,250.5');
    await user.type(
      within(dialog).getByLabelText(/What it was for/),
      '  TikTok creators  '
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('platform-growth/spend', {
        month: '2026-09',
        channel: 'tiktok',
        amountMinorUnits: 125_050,
        description: 'TikTok creators',
      })
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformGrowth:spend.toasts.added'
    );
  });

  it('edits with the loaded version, and reloads on a 409', async () => {
    patch.mockRejectedValue(apiError(409, 'errors.growth.spendStale'));
    const user = userEvent.setup(USER);
    openSpend();
    await user.click(
      await screen.findByRole('button', { name: 'Edit YouTube, October 2026' })
    );
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText(
      'Amount (EGP)'
    ) as HTMLInputElement;
    expect(amount.value).toBe('1000');
    await user.clear(amount);
    await user.type(amount, '1500');
    get.mockClear();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('platform-growth/spend/spend-2', {
        month: '2026-10',
        channel: 'youtube',
        amountMinorUnits: 150_000,
        description: null,
        version: 4,
      })
    );
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'platformGrowth:common.conflictTitle',
        'platformGrowth:spend.conflictBody'
      )
    );
    await waitFor(() => expect(get).toHaveBeenCalled());
  });

  it('confirms before deleting', async () => {
    del.mockResolvedValue(undefined);
    const user = userEvent.setup(USER);
    openSpend();
    await user.click(
      await screen.findByRole('button', {
        name: 'Delete YouTube, October 2026',
      })
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm.textContent).toContain('YouTube, October 2026: EGP');
    expect(del).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('platform-growth/spend/spend-2')
    );
  });

  it('explains the ledger when it is empty', async () => {
    get.mockResolvedValue({ from: '2025-11', to: '2026-10', items: [] });
    openSpend();
    expect(
      await screen.findByText('No spend logged in these months')
    ).toBeTruthy();
  });
});
