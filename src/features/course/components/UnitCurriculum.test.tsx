/**
 * The builder's unit curriculum renders the unit's mixed content as ONE
 * ordered list and persists a reorder to the backend (never client-only
 * state). Attach/detach and the Radix "Add content" menu are covered by the
 * backend e2e and real-Chrome verification; this pins the render + the
 * authoritative reorder call.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CourseSection, CurriculumItem } from '@types';

const reorderMutate = vi.fn().mockResolvedValue(undefined);
const useUnitItems = vi.fn();

vi.mock('../hooks', () => ({
  useUnitItems: () => useUnitItems() as unknown,
  useAvailableContent: () => ({ data: [] }),
  useReorderUnitItems: () => ({ mutateAsync: reorderMutate, isPending: false }),
  useAttachUnitItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDetachUnitItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const items: CurriculumItem[] = [
  { id: 'l1', type: 'lesson', title: 'Intro', order: 0, status: 'published', sectionId: 's1' },
  { id: 'q1', type: 'quiz', title: 'Quiz', order: 1, status: 'published', sectionId: 's1' },
  { id: 'a1', type: 'assignment', title: 'Homework', order: 2, status: 'draft', sectionId: 's1' },
];

function renderComp(language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <UnitCurriculum
        academyId="a1"
        courseId="c1"
        section={section}
        onAddLesson={vi.fn()}
        onEditLesson={vi.fn()}
        onDeleteLesson={vi.fn()}
      />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UnitCurriculum', () => {
  it('renders mixed content as one ordered list', () => {
    useUnitItems.mockReturnValue({ data: items, isLoading: false });
    renderComp();
    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('1. Intro'),
      expect.stringContaining('2. Quiz'),
      expect.stringContaining('3. Homework'),
    ]);
  });

  it('persists a reorder to the backend when moving an item down', async () => {
    useUnitItems.mockReturnValue({ data: items, isLoading: false });
    const user = userEvent.setup();
    renderComp();

    // Move the first item (Intro) down -> order becomes quiz, intro, homework.
    const moveDownButtons = screen.getAllByRole('button', { name: /move lesson down/i });
    await user.click(moveDownButtons[0]);

    expect(reorderMutate).toHaveBeenCalledWith({
      sectionId: 's1',
      payload: { orderedIds: ['q1', 'l1', 'a1'] },
    });
  });

  it('renders in Arabic with no raw keys', () => {
    useUnitItems.mockReturnValue({ data: items, isLoading: false });
    const { container } = renderComp('ar');
    expect(container.textContent).not.toMatch(/course:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
