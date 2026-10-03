/**
 * The builder's unit curriculum: ONE ordered list of mixed content whose
 * order is persisted to the backend (never client-only state), reorderable
 * by keyboard drag-and-drop or the move buttons, optimistic with rollback,
 * serialized while saving, and honest about conflicts.
 *
 * These run the REAL hooks against a real QueryClient with only the HTTP
 * service stubbed, so the optimistic update, rollback, refetch and pending
 * state are the production code paths, not mocks of them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@/services/api/api-error';
import type { CourseSection, CurriculumItem } from '@types';

const service = vi.hoisted(() => ({
  getUnitItems: vi.fn(),
  getAvailableContent: vi.fn(async () => []),
  reorderUnitItems: vi.fn(),
  attachUnitItem: vi.fn(),
  detachUnitItem: vi.fn(async () => []),
}));
const toastSpy = vi.hoisted(() => vi.fn());
const confirmSpy = vi.hoisted(() => vi.fn(async () => true));

vi.mock('../services/CourseService', () => ({ courseService: service }));
vi.mock('@/hooks/use-toast', () => ({ toast: toastSpy, useToast: () => ({}) }));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
  useConfirmDialog: () => ({ confirm: confirmSpy }),
}));

import { UnitCurriculum } from './UnitCurriculum';

const section: CourseSection = {
  id: 's1',
  courseId: 'c1',
  title: 'Unit 1',
  order: 0,
  lessons: [],
  createdAt: '',
  updatedAt: '',
};

const ITEMS: CurriculumItem[] = [
  {
    id: 'l1',
    type: 'lesson',
    title: 'Intro',
    order: 0,
    status: 'published',
    sectionId: 's1',
  },
  {
    id: 'q1',
    type: 'quiz',
    title: 'Quiz',
    order: 1,
    status: 'published',
    sectionId: 's1',
  },
  {
    id: 'a1',
    type: 'assignment',
    title: 'Homework',
    order: 2,
    status: 'draft',
    sectionId: 's1',
  },
];

/** A promise the test resolves/rejects by hand, to observe the pending state. */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderComp(language: 'en' | 'ar' = 'en') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const i18n = createI18nInstance(language);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
  const utils = render(
    <UnitCurriculum
      academyId="acad"
      courseId="c1"
      section={section}
      onAddLesson={vi.fn()}
      onEditLesson={vi.fn()}
      onDeleteLesson={vi.fn()}
    />,
    { wrapper }
  );
  return { ...utils, queryClient };
}

function rowTitles(): string[] {
  const list = screen.getByRole('list', { name: 'Unit 1' });
  return within(list)
    .getAllByRole('listitem')
    .map((row) =>
      (within(row).getByText(/^\d+\. /).textContent ?? '').replace(
        /^\d+\. /,
        ''
      )
    );
}

// jsdom has no layout. dnd-kit's keyboard sensor finds the "next" row from
// measured rects, so give each sortable row a stacked 40px box.
const nativeRect = Element.prototype.getBoundingClientRect;
beforeEach(() => {
  service.getUnitItems.mockResolvedValue(ITEMS);
  Element.prototype.getBoundingClientRect = function rect(this: Element) {
    const row = this.closest('[data-sortable-index]');
    const index = row ? Number(row.getAttribute('data-sortable-index')) : 0;
    const top = index * 50;
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 400,
      height: 40,
      right: 400,
      bottom: top + 40,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = nativeRect;
  cleanup();
  vi.clearAllMocks();
});

/** The unit's own polite region (dnd-kit renders a second, internal one). */
const liveRegion = () =>
  document.querySelector('p[role="status"][aria-live="polite"]')?.textContent ??
  '';
const addContentButton = () =>
  screen.getByRole('button', { name: /add content/i }) as HTMLButtonElement;

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('UnitCurriculum', () => {
  it('renders mixed content as one ordered list', async () => {
    renderComp();
    await screen.findByText(/1\. Intro/);
    expect(rowTitles()).toEqual(['Intro', 'Quiz', 'Homework']);
  });

  it('keyboard drag (Space, ArrowDown, Space) persists the new full order with the order the author saw', async () => {
    // The stub server applies the write, so the post-save refetch agrees.
    service.reorderUnitItems.mockImplementation(
      async (
        _a: string,
        _c: string,
        _s: string,
        payload: { orderedIds: string[] }
      ) => {
        service.getUnitItems.mockResolvedValue(
          payload.orderedIds.map((id) => ITEMS.find((item) => item.id === id)!)
        );
      }
    );
    renderComp();
    const handle = await screen.findByRole('button', { name: 'Reorder Intro' });

    handle.focus();
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    await tick();
    fireEvent.keyDown(handle, { code: 'ArrowDown', key: 'ArrowDown' });
    await tick();
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    await tick();

    await waitFor(() =>
      expect(service.reorderUnitItems).toHaveBeenCalledWith(
        'acad',
        'c1',
        's1',
        {
          orderedIds: ['q1', 'l1', 'a1'],
          expectedOrderedIds: ['l1', 'q1', 'a1'],
        }
      )
    );
    expect(rowTitles()).toEqual(['Quiz', 'Intro', 'Homework']);
  });

  it('move down is optimistic, keeps focus on the moved item and announces the save', async () => {
    const save = deferred();
    service.reorderUnitItems.mockReturnValue(save.promise);
    const user = userEvent.setup();
    renderComp();
    await screen.findByText(/1\. Intro/);

    const moveDown = screen.getAllByRole('button', {
      name: /move lesson down/i,
    })[0];
    await user.click(moveDown);

    // In place before the server answers…
    await waitFor(() =>
      expect(rowTitles()).toEqual(['Quiz', 'Intro', 'Homework'])
    );
    // …focus followed the moved row instead of dropping to <body>…
    const introRow = screen.getByText(/2\. Intro/).closest('li')!;
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(introRow).getByRole('button', { name: /move lesson down/i })
      )
    );
    // …and the save is announced and shown on the row.
    expect(liveRegion()).toMatch(/Intro moved to position 2 of 3/);
    expect(liveRegion()).toMatch(/Saving order/);
    expect(within(introRow).getByText(/Saving order/)).toBeTruthy();

    await act(async () => save.resolve());
    await waitFor(() => expect(liveRegion()).toBe('Order saved'));
  });

  it('disables conflicting actions while a reorder is pending, and re-enables them after', async () => {
    const save = deferred();
    service.reorderUnitItems.mockReturnValue(save.promise);
    const user = userEvent.setup();
    renderComp();
    await screen.findByText(/1\. Intro/);

    await user.click(
      screen.getAllByRole('button', { name: /move lesson down/i })[0]
    );
    await waitFor(() =>
      expect(
        screen.getByRole('list', { name: 'Unit 1' }).getAttribute('aria-busy')
      ).toBe('true')
    );

    // Move buttons stay focusable but refuse (no second, stale reorder).
    const moveUps = screen.getAllByRole('button', { name: /move lesson up/i });
    expect(moveUps[1].getAttribute('aria-disabled')).toBe('true');
    await user.click(moveUps[1]);
    expect(service.reorderUnitItems).toHaveBeenCalledTimes(1);
    // Drag handles, item menus (detach/delete) and "Add content" are off.
    expect(
      screen
        .getByRole('button', { name: 'Reorder Quiz' })
        .getAttribute('aria-disabled')
    ).toBe('true');
    screen
      .getAllByRole('button', { name: /item actions/i })
      .forEach((button) =>
        expect((button as HTMLButtonElement).disabled).toBe(true)
      );
    expect(addContentButton().disabled).toBe(true);

    await act(async () => save.resolve());
    await waitFor(() => expect(addContentButton().disabled).toBe(false));
    expect(
      screen
        .getAllByRole('button', { name: /move lesson up/i })[1]
        .hasAttribute('aria-disabled')
    ).toBe(false);
  });

  it('rolls back to the previous order and says so when the save fails', async () => {
    const save = deferred();
    service.reorderUnitItems.mockReturnValue(save.promise);
    const user = userEvent.setup();
    renderComp();
    await screen.findByText(/1\. Intro/);

    await user.click(
      screen.getAllByRole('button', { name: /move lesson down/i })[0]
    );
    await waitFor(() =>
      expect(rowTitles()).toEqual(['Quiz', 'Intro', 'Homework'])
    );

    await act(async () =>
      save.reject(createApiError('server', { status: 500 }))
    );

    await waitFor(() =>
      expect(rowTitles()).toEqual(['Intro', 'Quiz', 'Homework'])
    );
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed to save the new order',
        variant: 'destructive',
      })
    );
    expect(liveRegion()).toMatch(/previous order has been restored/);
  });

  it('on a stale-order 409 it refetches the current order and shows the conflict message', async () => {
    service.reorderUnitItems.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        code: 'stale_resource_version',
        messageKey: 'errors.concurrency.staleVersion',
      })
    );
    const user = userEvent.setup();
    renderComp();
    await screen.findByText(/1\. Intro/);
    expect(service.getUnitItems).toHaveBeenCalledTimes(1);
    // Someone else's order, served by the refetch.
    service.getUnitItems.mockResolvedValue([ITEMS[2], ITEMS[0], ITEMS[1]]);

    await user.click(
      screen.getAllByRole('button', { name: /move lesson down/i })[0]
    );

    await waitFor(() =>
      expect(rowTitles()).toEqual(['Homework', 'Intro', 'Quiz'])
    );
    expect(service.getUnitItems).toHaveBeenCalledTimes(2);
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/Someone else changed this order/),
      })
    );
  });

  it('asks before removing a quiz from the unit, and only removes it on confirm', async () => {
    const user = userEvent.setup();
    renderComp();
    await screen.findByText(/2\. Quiz/);
    const quizRow = screen.getByText(/2\. Quiz/).closest('li')!;

    confirmSpy.mockResolvedValueOnce(false);
    await user.click(
      within(quizRow).getByRole('button', { name: /item actions/i })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /remove from unit/i })
    );
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'course:builder.detachConfirm.title',
        values: { title: 'Quiz' },
      })
    );
    expect(service.detachUnitItem).not.toHaveBeenCalled();

    confirmSpy.mockResolvedValueOnce(true);
    await user.click(
      within(quizRow).getByRole('button', { name: /item actions/i })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /remove from unit/i })
    );
    await waitFor(() =>
      expect(service.detachUnitItem).toHaveBeenCalledWith('acad', 'c1', 's1', {
        type: 'quiz',
        itemId: 'q1',
      })
    );
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = renderComp('ar');
    await screen.findByText(/1\. Intro/);
    expect(container.textContent).not.toMatch(/course:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
