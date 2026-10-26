/**
 * G1 — the organization "Acquisition" card (Platform Owner organization
 * detail): the channel, how it was decided, their answer and the captured
 * UTM/referrer; "Set channel" PATCHes `{ channel, note }` and "Automatic"
 * clears it (`channel: null`).
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
import { acquisition } from './__tests__/fixtures';
import { RAW_KEY, installDomShims, renderPage } from './__tests__/render';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));

const { AcquisitionCard } = await import('./components/AcquisitionCard');

const patch = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(installDomShims);
beforeEach(() => {
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [patch, notifySuccess, notifyError].forEach((fn) => fn.mockReset());
});

const openCard = (value = acquisition(), language: 'en' | 'ar' = 'en') =>
  renderPage(<AcquisitionCard organizationId="org-1" acquisition={value} />, {
    language,
    url: '/dashboard/platform/organizations/org-1',
    path: '/dashboard/platform/organizations/:organizationId',
    toast: { notifySuccess, notifyError },
  });

describe('Acquisition card', () => {
  it('shows the channel, how it was decided, their answer and the captured link', () => {
    openCard();
    const card = screen.getByTestId('organization-acquisition');
    expect(within(card).getByText('Facebook', { selector: 'dd' })).toBeTruthy();
    expect(
      within(card).getByText('The UTM tags on the link they arrived from.')
    ).toBeTruthy();
    expect(within(card).getByText('Other', { selector: 'dd' })).toBeTruthy();
    expect(card.textContent).toContain('“A poster at the centre”');
    expect(within(card).getByText('season-2027')).toBeTruthy();
    expect(within(card).getByText('l.facebook.com')).toBeTruthy();
  });

  it('sets a channel with a note', async () => {
    patch.mockResolvedValue(
      acquisition({
        resolvedChannel: 'whatsapp',
        decidedBy: 'override',
        override: {
          channel: 'whatsapp',
          note: 'WhatsApp call',
          updatedAt: '2026-10-26T10:00:00.000Z',
          updatedByName: 'Ziad',
        },
      })
    );
    const user = userEvent.setup(USER);
    openCard();
    const save = screen.getByRole('button', { name: 'Save channel' });
    expect((save as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Channel' }),
      'whatsapp'
    );
    await user.type(screen.getByLabelText(/^Note/), 'WhatsApp call');
    await user.click(save);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        'platform-growth/organizations/org-1/channel',
        { channel: 'whatsapp', note: 'WhatsApp call' }
      )
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformGrowth:acquisition.override.saved'
    );
  });

  it('clears an override with Automatic', async () => {
    patch.mockResolvedValue(acquisition());
    const user = userEvent.setup(USER);
    openCard(
      acquisition({
        resolvedChannel: 'whatsapp',
        decidedBy: 'override',
        override: {
          channel: 'whatsapp',
          note: 'WhatsApp call',
          updatedAt: '2026-10-26T10:00:00.000Z',
          updatedByName: 'Ziad',
        },
      })
    );
    expect(screen.getByText('You set this channel.')).toBeTruthy();
    expect(screen.getByText(/Set by Ziad on/)).toBeTruthy();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Channel' }),
      'automatic'
    );
    await user.click(screen.getByRole('button', { name: 'Save channel' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        'platform-growth/organizations/org-1/channel',
        { channel: null, note: null }
      )
    );
  });

  it('renders nothing without acquisition data, and Arabic without raw keys', () => {
    const { container } = renderPage(
      <AcquisitionCard organizationId="org-1" acquisition={undefined} />,
      { url: '/x', path: '/x' }
    );
    expect(
      container.querySelector('[data-testid="organization-acquisition"]')
    ).toBeNull();
    cleanup();
    openCard(
      acquisition({
        decidedBy: 'none',
        attribution: null,
        heardFrom: null,
        heardFromOther: null,
      }),
      'ar'
    );
    expect(screen.getByText('الاكتساب')).toBeTruthy();
    expect(screen.getByText('لم يُجيبوا')).toBeTruthy();
    expect(document.body.textContent ?? '').not.toMatch(RAW_KEY);
  });
});
