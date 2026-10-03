/**
 * FAQ / testimonial library: moving an entry up or down.
 *
 * A move is two `order` writes (the entry takes its neighbour's position
 * and vice versa). The tabs used to fire both at once and ignore their
 * pending state, so a quick second click raced the first. These tests run
 * the real tabs, hooks and query cache against a small in-memory library
 * whose writes resolve only when the test says so, and pin:
 *  - the two writes are sequential (the second waits for the first);
 *  - every move control is disabled, and progress announced, while a move
 *    is in flight;
 *  - the list is refetched once the move settles (also after a failure).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteFaqEntry, WebsiteTestimonialEntry } from '@types';

const ACADEMY = 'academy-1';

interface Pending {
  readonly entryId: string;
  readonly order: number;
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}

let faqs: WebsiteFaqEntry[] = [];
let testimonials: WebsiteTestimonialEntry[] = [];
let pendingWrites: Pending[] = [];
const getFaqEntries = vi.fn();
const getTestimonialEntries = vi.fn();

function queueWrite<T extends { id: string; order: number }>(
  list: () => T[],
  setList: (next: T[]) => void,
  entryId: string,
  payload: { order?: number }
) {
  return new Promise<T>((resolve, reject) => {
    pendingWrites.push({
      entryId,
      order: payload.order ?? -1,
      resolve: () => {
        const next = list().map((item) =>
          item.id === entryId && payload.order !== undefined
            ? { ...item, order: payload.order }
            : item
        );
        setList(next);
        resolve(next.find((item) => item.id === entryId)!);
      },
      reject,
    });
  });
}

vi.mock('../services/WebsiteContentService', () => ({
  websiteContentService: {
    getFaqEntries: () => getFaqEntries() as unknown,
    getTestimonialEntries: () => getTestimonialEntries() as unknown,
    updateFaqEntry: (
      _academyId: string,
      entryId: string,
      payload: { order?: number }
    ) =>
      queueWrite(
        () => faqs,
        (next) => {
          faqs = next;
        },
        entryId,
        payload
      ),
    updateTestimonialEntry: (
      _academyId: string,
      entryId: string,
      payload: { order?: number }
    ) =>
      queueWrite(
        () => testimonials,
        (next) => {
          testimonials = next;
        },
        entryId,
        payload
      ),
    createFaqEntry: vi.fn(),
    publishFaqEntry: vi.fn(),
    archiveFaqEntry: vi.fn(),
    createTestimonialEntry: vi.fn(),
    publishTestimonialEntry: vi.fn(),
    archiveTestimonialEntry: vi.fn(),
  },
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
  useUnsavedChanges: () => undefined,
}));

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm: vi.fn() }),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

vi.mock('./WebsiteImageField', () => ({ WebsiteImageField: () => null }));

const { WebsiteFaqContentTab } = await import('./WebsiteFaqContentTab');
const { WebsiteTestimonialContentTab } =
  await import('./WebsiteTestimonialContentTab');

function faq(id: string, order: number): WebsiteFaqEntry {
  return {
    id,
    academyId: ACADEMY,
    question: { en: `Question ${id}`, ar: '' },
    answer: { en: 'Answer', ar: '' },
    order,
    visible: true,
    status: 'draft',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function testimonial(id: string, order: number): WebsiteTestimonialEntry {
  return {
    id,
    academyId: ACADEMY,
    quote: { en: `Quote ${id}`, ar: '' },
    authorName: `Author ${id}`,
    order,
    visible: true,
    status: 'draft',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function page<T>(items: T[]) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 50,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

async function renderTab(tab: 'faq' | 'testimonial') {
  const i18n = await createI18nInstance('en');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        {tab === 'faq' ? (
          <WebsiteFaqContentTab academyId={ACADEMY} />
        ) : (
          <WebsiteTestimonialContentTab academyId={ACADEMY} />
        )}
      </QueryClientProvider>
    </I18nextProvider>
  );
}

const moveDownButtons = () =>
  screen.getAllByRole('button', { name: /move down/i });
const moveUpButtons = () => screen.getAllByRole('button', { name: /move up/i });
const isDisabled = (element: HTMLElement) =>
  (element as HTMLButtonElement).disabled;
const statusText = () => screen.getByRole('status').textContent ?? '';

beforeEach(() => {
  faqs = [faq('f1', 1), faq('f2', 2), faq('f3', 3)];
  testimonials = [testimonial('t1', 1), testimonial('t2', 2)];
  pendingWrites = [];
  getFaqEntries.mockReset().mockImplementation(async () => page(faqs));
  getTestimonialEntries
    .mockReset()
    .mockImplementation(async () => page(testimonials));
});

afterEach(cleanup);

describe('FAQ library reorder', () => {
  it('writes the two positions one after the other, never in parallel', async () => {
    await renderTab('faq');
    await screen.findByText('Question f1');

    fireEvent.click(moveDownButtons()[0]);

    // Only the first write is in flight; the second waits for it.
    await waitFor(() => expect(pendingWrites).toHaveLength(1));
    expect(pendingWrites[0]).toMatchObject({ entryId: 'f1', order: 2 });

    await act(async () => pendingWrites[0].resolve());
    await waitFor(() => expect(pendingWrites).toHaveLength(2));
    expect(pendingWrites[1]).toMatchObject({ entryId: 'f2', order: 1 });

    const fetchesBefore = getFaqEntries.mock.calls.length;
    await act(async () => pendingWrites[1].resolve());

    // The list is refetched and renders the new order.
    await waitFor(() =>
      expect(getFaqEntries.mock.calls.length).toBeGreaterThan(fetchesBefore)
    );
    await waitFor(() => {
      const questions = screen
        .getAllByText(/^Question f/)
        .map((node) => node.textContent);
      expect(questions).toEqual(['Question f2', 'Question f1', 'Question f3']);
    });
  });

  it('disables every move control and announces progress while a move is pending', async () => {
    await renderTab('faq');
    await screen.findByText('Question f1');

    fireEvent.click(moveDownButtons()[0]);
    await waitFor(() => expect(pendingWrites).toHaveLength(1));

    for (const button of [...moveDownButtons(), ...moveUpButtons()]) {
      expect(isDisabled(button)).toBe(true);
    }
    expect(statusText()).toMatch(/saving the new order/i);

    // A click on a disabled control starts nothing new.
    fireEvent.click(moveDownButtons()[1]);
    expect(pendingWrites).toHaveLength(1);

    await act(async () => pendingWrites[0].resolve());
    await waitFor(() => expect(pendingWrites).toHaveLength(2));
    await act(async () => pendingWrites[1].resolve());

    await waitFor(() => expect(isDisabled(moveDownButtons()[0])).toBe(false));
    expect(isDisabled(moveUpButtons()[0])).toBe(true); // first row: nothing above
    expect(statusText()).toBe('');
  });

  it('refetches after a failed move so the list shows what the server saved', async () => {
    await renderTab('faq');
    await screen.findByText('Question f1');
    const fetchesBefore = getFaqEntries.mock.calls.length;

    fireEvent.click(moveDownButtons()[0]);
    await waitFor(() => expect(pendingWrites).toHaveLength(1));
    await act(async () => pendingWrites[0].reject(new Error('conflict')));

    await waitFor(() =>
      expect(getFaqEntries.mock.calls.length).toBeGreaterThan(fetchesBefore)
    );
    // The second write never ran, and the controls are usable again.
    expect(pendingWrites).toHaveLength(1);
    await waitFor(() => expect(isDisabled(moveDownButtons()[0])).toBe(false));
  });
});

describe('Testimonial library reorder', () => {
  it('serializes the two writes and disables the controls while pending', async () => {
    await renderTab('testimonial');
    await screen.findByText('Author t1');

    fireEvent.click(moveUpButtons()[1]);
    await waitFor(() => expect(pendingWrites).toHaveLength(1));
    expect(pendingWrites[0]).toMatchObject({ entryId: 't2', order: 1 });
    for (const button of [...moveDownButtons(), ...moveUpButtons()]) {
      expect(isDisabled(button)).toBe(true);
    }

    await act(async () => pendingWrites[0].resolve());
    await waitFor(() => expect(pendingWrites).toHaveLength(2));
    expect(pendingWrites[1]).toMatchObject({ entryId: 't1', order: 2 });
    await act(async () => pendingWrites[1].resolve());

    await waitFor(() => {
      const rows = screen
        .getAllByText(/^Author t/)
        .map((node) => node.textContent);
      expect(rows).toEqual(['Author t2', 'Author t1']);
    });
    await waitFor(() => expect(isDisabled(moveDownButtons()[0])).toBe(false));
    expect(statusText()).toBe('');
  });
});
