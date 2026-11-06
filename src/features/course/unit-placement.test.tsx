/**
 * Choosing the UNIT when creating a quiz or an assignment — every create
 * path: the quiz editor page, the assignments page, and the course
 * wizard's quiz sheet and in-place assignment dialog.
 *
 *   - `UnitPickerField`: units in course order + "Not in a unit", help for
 *     the item type (EN/AR), hidden when the course has no units;
 *   - a quiz is placed atomically (`sectionId` on the create itself);
 *   - an assignment is created, then attached to the chosen unit;
 *   - "Not in a unit" places nothing; `?sectionId=` preselects its unit;
 *   - a failed attach keeps the created assignment and says where to add it.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { assignmentService, quizService } from '@features/learning';
import type {
  Assignment,
  Course,
  CourseSection,
  PaginatedResult,
  QuizAuthoring,
} from '@types';

const service = vi.hoisted(() => ({
  getCourse: vi.fn(async () => ({ id: 'c1', title: 'Course One' })),
  getCourseSections: vi.fn(),
  attachUnitItem: vi.fn(),
}));
const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('./services/CourseService', () => ({ courseService: service }));
vi.mock('@/hooks/use-toast', () => ({ toast: toastSpy, useToast: () => ({}) }));
vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organization: { id: 'org-1' } }),
}));
vi.mock('@app/providers/toast/useToast', () => ({
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@app/providers/dialog/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn(async () => true) }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));

import { UnitPickerField } from './components/UnitPickerField';
import CourseQuizEditorPage from './pages/CourseQuizEditorPage';
import CourseAssignmentsPage from './pages/CourseAssignmentsPage';
import { AssessmentsStep } from './wizard/AssessmentsStep';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

const unit = (id: string, title: string, order: number): CourseSection =>
  ({
    id,
    courseId: 'c1',
    title,
    order,
    lessons: [],
  }) as unknown as CourseSection;

// Deliberately out of order: the picker shows course order.
const UNITS = [unit('s2', 'Unit Two', 1), unit('s1', 'Unit One', 0)];
const page = <T,>(items: T[]) =>
  ({
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: 1,
    },
  }) as unknown as PaginatedResult<T>;

const NEW_ASSIGNMENT = {
  id: 'as-new',
  courseId: 'c1',
  title: 'Essay',
  status: 'draft',
  allowResubmission: false,
  latePolicy: 'accept_flagged',
  requiredForCompletion: false,
} as Assignment;

function renderAt(
  path: string,
  pattern: string,
  element: ReactNode,
  language: 'en' | 'ar' = 'en'
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
            <Route path="*" element={<p>elsewhere</p>} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return userEvent.setup();
}

let createQuiz: MockInstance<typeof quizService.createQuiz>;
let createAssignment: MockInstance<typeof assignmentService.createAssignment>;

beforeEach(() => {
  service.getCourseSections.mockResolvedValue(page(UNITS));
  service.attachUnitItem.mockResolvedValue([]);
  createQuiz = vi
    .spyOn(quizService, 'createQuiz')
    .mockResolvedValue({ id: 'quiz-new' } as QuizAuthoring);
  createAssignment = vi
    .spyOn(assignmentService, 'createAssignment')
    .mockResolvedValue(NEW_ASSIGNMENT);
  vi.spyOn(assignmentService, 'getAssignmentsForAuthoring').mockResolvedValue(
    page<Assignment>([])
  );
  vi.spyOn(quizService, 'getQuizzesForAuthoring').mockResolvedValue(
    page([]) as never
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function chooseUnit(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  scope: HTMLElement = document.body
) {
  await user.click(
    within(scope).getByRole('combobox', { name: 'Place in unit' })
  );
  await user.click(await screen.findByRole('option', { name }));
}

async function fillQuiz(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /^Title/ }), 'Check-in');
  await user.type(screen.getByRole('textbox', { name: /^Prompt/ }), '2 + 2?');
  await user.type(screen.getByPlaceholderText('Option 1'), '4');
  await user.type(screen.getByPlaceholderText('Option 2'), '5');
  await user.click(screen.getByRole('radio', { name: 'Option 1 is correct' }));
}

/* ---------------- UnitPickerField ---------------- */

describe('UnitPickerField', () => {
  function renderField(
    props: Partial<Parameters<typeof UnitPickerField>[0]> = {},
    language: 'en' | 'ar' = 'en'
  ) {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={createI18nInstance(language)}>
        <UnitPickerField
          sections={[UNITS[1], UNITS[0]]}
          value="s1"
          onChange={onChange}
          itemType="assignment"
          {...props}
        />
      </I18nextProvider>
    );
    return { onChange, user: userEvent.setup() };
  }

  it('lists the units in the order given, then "Not in a unit"', async () => {
    const { user, onChange } = renderField();
    await user.click(screen.getByRole('combobox', { name: 'Place in unit' }));
    const options = (await screen.findAllByRole('option')).map(
      (o) => o.textContent
    );
    expect(options).toEqual(['Unit One', 'Unit Two', 'Not in a unit']);
    await user.click(screen.getByRole('option', { name: 'Unit Two' }));
    expect(onChange).toHaveBeenCalledWith('s2');
  });

  it('explains the placement for the item type, in English and Arabic', () => {
    renderField({ itemType: 'assignment' });
    expect(
      screen.getByText(/The assignment is added at the end of the unit/)
    ).toBeTruthy();
    cleanup();
    renderField({ itemType: 'quiz' });
    expect(
      screen.getByText(/The quiz is added at the end of the unit/)
    ).toBeTruthy();
    cleanup();
    renderField({ itemType: 'assignment' }, 'ar');
    expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeTruthy();
    expect(screen.getByText(/يُضاف الواجب في نهاية الوحدة/)).toBeTruthy();
  });

  it('is hidden when the course has no units', () => {
    renderField({ sections: [] });
    expect(screen.queryByTestId('unit-picker')).toBeNull();
  });
});

/* ---------------- Quiz editor page ---------------- */

const QUIZ_CREATE =
  '/dashboard/academy/:academyId/courses/:courseId/quizzes/create';

describe('Quiz editor page — create', { timeout: 30_000 }, () => {
  it('defaults to the first unit and sends it with the create (no second call)', async () => {
    const user = renderAt(
      '/dashboard/academy/acad/courses/c1/quizzes/create',
      QUIZ_CREATE,
      <CourseQuizEditorPage />
    );
    const picker = await screen.findByRole('combobox', {
      name: 'Place in unit',
    });
    await waitFor(() => expect(picker.textContent).toBe('Unit One'));
    await fillQuiz(user);
    await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
    await waitFor(() => expect(createQuiz).toHaveBeenCalledTimes(1));
    expect(createQuiz.mock.calls[0][1]).toMatchObject({ sectionId: 's1' });
    expect(service.attachUnitItem).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith({ title: 'Quiz added to Unit One.' });
  });

  it('places it in the unit the author picks', async () => {
    const user = renderAt(
      '/dashboard/academy/acad/courses/c1/quizzes/create',
      QUIZ_CREATE,
      <CourseQuizEditorPage />
    );
    await screen.findByRole('combobox', { name: 'Place in unit' });
    await chooseUnit(user, 'Unit Two');
    await fillQuiz(user);
    await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
    await waitFor(() => expect(createQuiz).toHaveBeenCalledTimes(1));
    expect(createQuiz.mock.calls[0][1]).toMatchObject({ sectionId: 's2' });
  });

  it('"Not in a unit" places nothing', async () => {
    const user = renderAt(
      '/dashboard/academy/acad/courses/c1/quizzes/create',
      QUIZ_CREATE,
      <CourseQuizEditorPage />
    );
    await screen.findByRole('combobox', { name: 'Place in unit' });
    await chooseUnit(user, 'Not in a unit');
    await fillQuiz(user);
    await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
    await waitFor(() => expect(createQuiz).toHaveBeenCalledTimes(1));
    expect(createQuiz.mock.calls[0][1]).not.toHaveProperty('sectionId');
    expect(toastSpy).toHaveBeenCalledWith({ title: 'Quiz created' });
  });

  it('preselects the unit the page was opened from (?sectionId=)', async () => {
    renderAt(
      '/dashboard/academy/acad/courses/c1/quizzes/create?sectionId=s2',
      QUIZ_CREATE,
      <CourseQuizEditorPage />
    );
    const picker = await screen.findByRole('combobox', {
      name: 'Place in unit',
    });
    await waitFor(() => expect(picker.textContent).toBe('Unit Two'));
  });

  it('hides the field when the course has no units', async () => {
    service.getCourseSections.mockResolvedValue(page([]));
    renderAt(
      '/dashboard/academy/acad/courses/c1/quizzes/create',
      QUIZ_CREATE,
      <CourseQuizEditorPage />
    );
    await screen.findByRole('button', { name: 'Save Quiz' });
    await waitFor(() => expect(service.getCourseSections).toHaveBeenCalled());
    expect(screen.queryByTestId('unit-picker')).toBeNull();
  });
});

/* ---------------- Assignments page ---------------- */

const ASSIGNMENTS =
  '/dashboard/academy/:academyId/courses/:courseId/assignments';

async function createAssignmentIn(
  user: ReturnType<typeof userEvent.setup>,
  unitName?: string
) {
  await user.click(
    (await screen.findAllByRole('button', { name: 'Add Assignment' }))[0]
  );
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('combobox', { name: 'Place in unit' });
  if (unitName) await chooseUnit(user, unitName, dialog);
  await user.type(
    within(dialog).getByRole('textbox', { name: /^Title/ }),
    'Essay'
  );
  await user.click(within(dialog).getByRole('button', { name: 'Save' }));
}

describe('Assignments page — create', { timeout: 30_000 }, () => {
  const open = (path = '/dashboard/academy/acad/courses/c1/assignments') =>
    renderAt(path, ASSIGNMENTS, <CourseAssignmentsPage />);

  it('creates the assignment, then attaches it to the chosen unit', async () => {
    const user = open();
    await createAssignmentIn(user, 'Unit Two');
    await waitFor(() =>
      expect(service.attachUnitItem).toHaveBeenCalledTimes(1)
    );
    expect(createAssignment).toHaveBeenCalledTimes(1);
    expect(createAssignment.mock.calls[0][1]).not.toHaveProperty('sectionId');
    expect(service.attachUnitItem).toHaveBeenCalledWith('acad', 'c1', 's2', {
      type: 'assignment',
      itemId: 'as-new',
    });
    expect(toastSpy).toHaveBeenCalledWith({
      title: 'Assignment added to Unit Two.',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('defaults to the first unit, or to ?sectionId=', async () => {
    let user = open();
    await createAssignmentIn(user);
    await waitFor(() =>
      expect(service.attachUnitItem).toHaveBeenCalledWith('acad', 'c1', 's1', {
        type: 'assignment',
        itemId: 'as-new',
      })
    );
    cleanup();
    service.attachUnitItem.mockClear();
    user = open('/dashboard/academy/acad/courses/c1/assignments?sectionId=s2');
    await createAssignmentIn(user);
    await waitFor(() =>
      expect(service.attachUnitItem).toHaveBeenCalledWith(
        'acad',
        'c1',
        's2',
        expect.anything()
      )
    );
  });

  it('"Not in a unit" attaches nothing', async () => {
    const user = open();
    await createAssignmentIn(user, 'Not in a unit');
    await waitFor(() => expect(createAssignment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(service.attachUnitItem).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith({ title: 'Assignment created' });
  });

  it('a failed attach keeps the created assignment and says where to add it (EN)', async () => {
    service.attachUnitItem.mockRejectedValue(new Error('boom'));
    const user = open();
    await createAssignmentIn(user, 'Unit Two');
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        title:
          'The assignment was saved, but it could not be added to Unit Two. Add it from Curriculum: in that unit, choose “Add content”, then “Add existing assignment”.',
        variant: 'destructive',
      })
    );
    // Created once and kept: the dialog closes, nothing is retried or undone.
    expect(createAssignment).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a failed attach is explained in Arabic too', async () => {
    service.attachUnitItem.mockRejectedValue(new Error('boom'));
    const user = renderAt(
      '/dashboard/academy/acad/courses/c1/assignments',
      ASSIGNMENTS,
      <CourseAssignmentsPage />,
      'ar'
    );
    await user.click(
      (await screen.findAllByRole('button', { name: 'إضافة واجب' }))[0]
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('combobox', { name: 'الوحدة' });
    await user.type(within(dialog).getAllByRole('textbox')[0], 'مقال');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        title: expect.stringContaining(
          'حُفظ الواجب، لكن تعذّرت إضافته إلى Unit One'
        ),
        variant: 'destructive',
      })
    );
  });

  it('hides the field when the course has no units, and attaches nothing', async () => {
    service.getCourseSections.mockResolvedValue(page([]));
    const user = open();
    await user.click(
      (await screen.findAllByRole('button', { name: 'Add Assignment' }))[0]
    );
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(service.getCourseSections).toHaveBeenCalled());
    expect(within(dialog).queryByTestId('unit-picker')).toBeNull();
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Title/ }),
      'Essay'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(createAssignment).toHaveBeenCalledTimes(1));
    expect(service.attachUnitItem).not.toHaveBeenCalled();
  });

  it('shows the unit of an existing assignment when editing (read-only)', async () => {
    vi.spyOn(assignmentService, 'getAssignmentsForAuthoring').mockResolvedValue(
      page<Assignment>([{ ...NEW_ASSIGNMENT, sectionId: 's2' }])
    );
    const user = open();
    expect(await screen.findByText('In Unit Two')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: /Actions for Essay|Essay/ })
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const note = within(dialog).getByTestId('unit-placement-note');
    expect(note.textContent).toContain('Unit Two');
    expect(
      within(dialog).queryByRole('combobox', { name: 'Place in unit' })
    ).toBeNull();
  });
});

/* ---------------- Course wizard — Assessments step ---------------- */

describe('Course wizard — Assessments step', { timeout: 30_000 }, () => {
  const COURSE = { id: 'c1', title: 'Course One' } as Course;
  const open = () =>
    renderAt(
      '/wizard',
      '/wizard',
      <AssessmentsStep
        academyId="acad"
        course={COURSE}
        onNext={vi.fn()}
        goToStep={vi.fn()}
      />
    );

  it('creates an assignment in place and attaches it to the chosen unit', async () => {
    const user = open();
    await user.click(
      await screen.findByRole('button', { name: 'Create assignment' })
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('combobox', { name: 'Place in unit' });
    await chooseUnit(user, 'Unit Two', dialog);
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Title/ }),
      'Essay'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(service.attachUnitItem).toHaveBeenCalledWith('acad', 'c1', 's2', {
        type: 'assignment',
        itemId: 'as-new',
      })
    );
  });

  it('creates a quiz in the sheet with the unit sent on the create', async () => {
    const user = open();
    await user.click(
      await screen.findByRole('button', { name: 'Create quiz' })
    );
    const sheet = await screen.findByRole('dialog');
    const picker = await within(sheet).findByRole('combobox', {
      name: 'Place in unit',
    });
    await waitFor(() => expect(picker.textContent).toBe('Unit One'));
    await chooseUnit(user, 'Unit Two', sheet);
    await fillQuiz(user);
    await user.click(within(sheet).getByRole('button', { name: 'Save Quiz' }));
    await waitFor(() => expect(createQuiz).toHaveBeenCalledTimes(1));
    expect(createQuiz.mock.calls[0][1]).toMatchObject({
      sectionId: 's2',
      status: 'published',
    });
    expect(service.attachUnitItem).not.toHaveBeenCalled();
  });
});
