/**
 * Course-builder cache freshness (Task 6, builder part).
 *
 * The builder rows come from `courseKeys.unitItems`, the attach picker from
 * `courseKeys.availableContent`. Lesson/quiz/assignment mutations used to
 * invalidate only their own keys, so the builder showed a new lesson only
 * after a refresh. These run the real hooks against a stubbed service and
 * check (a) exactly the course's curriculum reads go stale — every unit,
 * the picker, sections, detail, authoring lists — and nothing of another
 * course; (b) a mounted unit list actually refetches and shows the lesson;
 * (c) the optimistic section reorder rolls back on failure.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  assignmentKeys,
  courseKeys,
  quizKeys,
} from '@services/query/query-keys';
import { isCourseCurriculumKey } from '@services/query/curriculum-invalidation';
import type { CourseSection, CurriculumItem, PaginatedResult } from '@types';

const ACADEMY = 'academy-1';
const COURSE = 'course-1';
const OTHER_COURSE = 'course-2';

const courseService = vi.hoisted(() => ({
  createCourseLesson: vi.fn(),
  getUnitItems: vi.fn(),
  reorderCourseSections: vi.fn(),
}));
const quizService = vi.hoisted(() => ({
  createQuiz: vi.fn(async () => ({ id: 'qz' })),
}));

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'author-1' } }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@features/course/services/CourseService', () => ({ courseService }));
vi.mock('@features/learning/services/QuizService', () => ({ quizService }));

const { useCreateCourseLesson } = await import('./useCreateCourseLesson');
const { useUnitItems } = await import('./useUnitCurriculum');
const { useReorderCourseSections } = await import('./useReorderCourseSections');
const { useCreateQuiz } =
  await import('@features/learning/hooks/useCreateQuiz');

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function seedBuilderCaches(queryClient: QueryClient) {
  const keys = {
    unitA: courseKeys.unitItems(ACADEMY, COURSE, 'unit-a'),
    unitB: courseKeys.unitItems(ACADEMY, COURSE, 'unit-b'),
    sections: courseKeys.sections(ACADEMY, COURSE),
    available: courseKeys.availableContent(ACADEMY, COURSE),
    detail: courseKeys.detail(ACADEMY, COURSE),
    quizAuthoring: quizKeys.authoringList('author-1', COURSE),
    assignmentAuthoring: assignmentKeys.authoringList('author-1', COURSE),
    otherCourseUnit: courseKeys.unitItems(ACADEMY, OTHER_COURSE, 'unit-x'),
    otherCourseSections: courseKeys.sections(ACADEMY, OTHER_COURSE),
    courseList: courseKeys.lists(ACADEMY),
  };
  Object.values(keys).forEach((key) => queryClient.setQueryData(key, []));
  return keys;
}

const isStale = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated === true;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('builder curriculum invalidation', () => {
  it('lesson create marks every unit list, the picker, sections, detail and authoring lists of THIS course stale', async () => {
    courseService.createCourseLesson.mockResolvedValue({ id: 'new-lesson' });
    const { queryClient, wrapper } = setup();
    const keys = seedBuilderCaches(queryClient);

    const { result } = renderHook(
      () => useCreateCourseLesson(ACADEMY, COURSE),
      { wrapper }
    );
    await act(() =>
      result.current.mutateAsync({
        sectionId: 'unit-a',
        payload: { title: 'New', contentType: 'text' },
      })
    );

    for (const key of [
      keys.unitA,
      keys.unitB,
      keys.sections,
      keys.available,
      keys.detail,
      keys.quizAuthoring,
      keys.assignmentAuthoring,
    ]) {
      expect(isStale(queryClient, key), JSON.stringify(key)).toBe(true);
    }
    for (const key of [
      keys.otherCourseUnit,
      keys.otherCourseSections,
      keys.courseList,
    ]) {
      expect(isStale(queryClient, key), JSON.stringify(key)).toBe(false);
    }
  });

  it('a mounted unit list refetches after lesson create, so the builder shows the new lesson', async () => {
    const before: CurriculumItem[] = [
      {
        id: 'q1',
        type: 'quiz',
        title: 'Quiz',
        order: 0,
        status: 'published',
        sectionId: 'unit-a',
      },
    ];
    const created: CurriculumItem = {
      id: 'new-lesson',
      type: 'lesson',
      title: 'Fresh lesson',
      order: 1,
      status: 'draft',
      sectionId: 'unit-a',
    };
    courseService.getUnitItems.mockResolvedValueOnce(before);
    courseService.createCourseLesson.mockResolvedValue({ id: 'new-lesson' });
    const { wrapper } = setup();

    const { result } = renderHook(
      () => ({
        items: useUnitItems(ACADEMY, COURSE, 'unit-a'),
        create: useCreateCourseLesson(ACADEMY, COURSE),
      }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.items.data).toEqual(before));

    courseService.getUnitItems.mockResolvedValueOnce([...before, created]);
    await act(() =>
      result.current.create.mutateAsync({
        sectionId: 'unit-a',
        payload: { title: 'Fresh lesson', contentType: 'text' },
      })
    );

    await waitFor(() =>
      expect(result.current.items.data?.map((item) => item.title)).toEqual([
        'Quiz',
        'Fresh lesson',
      ])
    );
    expect(courseService.getUnitItems).toHaveBeenCalledTimes(2);
  });

  it('quiz create (which knows no academy id) still refreshes the builder of its course', async () => {
    const { queryClient, wrapper } = setup();
    const keys = seedBuilderCaches(queryClient);

    const { result } = renderHook(() => useCreateQuiz(COURSE), { wrapper });
    await act(() =>
      result.current.mutateAsync({ title: 'Q', questions: [] } as never)
    );

    expect(isStale(queryClient, keys.available)).toBe(true);
    expect(isStale(queryClient, keys.unitA)).toBe(true);
    expect(isStale(queryClient, keys.quizAuthoring)).toBe(true);
    expect(isStale(queryClient, keys.otherCourseUnit)).toBe(false);
  });

  it('matches by template, never by a looser prefix', () => {
    const scope = { academyId: ACADEMY, courseId: COURSE };
    expect(
      isCourseCurriculumKey(courseKeys.unitItems(ACADEMY, COURSE, 'u'), scope)
    ).toBe(true);
    expect(
      isCourseCurriculumKey(
        courseKeys.unitItems('other-academy', COURSE, 'u'),
        scope
      )
    ).toBe(false);
    expect(
      isCourseCurriculumKey(courseKeys.unitItems('any', COURSE, 'u'), {
        courseId: COURSE,
      })
    ).toBe(true);
    expect(isCourseCurriculumKey(courseKeys.categories(ACADEMY), scope)).toBe(
      false
    );
  });

  it('optimistic section reorder applies at once and rolls back when the save fails', async () => {
    const sections: PaginatedResult<CourseSection> = {
      items: [
        {
          id: 's1',
          courseId: COURSE,
          title: 'One',
          order: 0,
          lessons: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 's2',
          courseId: COURSE,
          title: 'Two',
          order: 1,
          lessons: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      pagination: { page: 1, pageSize: 2, totalItems: 2, totalPages: 1 },
    } as PaginatedResult<CourseSection>;
    let fail!: (error: unknown) => void;
    courseService.reorderCourseSections.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      })
    );
    const { queryClient, wrapper } = setup();
    const key = courseKeys.sections(ACADEMY, COURSE);
    queryClient.setQueryData(key, sections);

    const { result } = renderHook(
      () => useReorderCourseSections(ACADEMY, COURSE),
      { wrapper }
    );
    let settled: Promise<unknown> = Promise.resolve();
    act(() => {
      settled = result.current
        .mutateAsync({
          orderedIds: ['s2', 's1'],
          expectedOrderedIds: ['s1', 's2'],
        })
        .catch(() => undefined);
    });

    await waitFor(() =>
      expect(
        queryClient
          .getQueryData<PaginatedResult<CourseSection>>(key)
          ?.items.map((s) => s.id)
      ).toEqual(['s2', 's1'])
    );
    expect(courseService.reorderCourseSections).toHaveBeenCalledWith(
      ACADEMY,
      COURSE,
      {
        orderedIds: ['s2', 's1'],
        expectedOrderedIds: ['s1', 's2'],
      }
    );

    await act(async () => {
      fail(new Error('boom'));
      await settled;
    });
    expect(
      queryClient
        .getQueryData<PaginatedResult<CourseSection>>(key)
        ?.items.map((s) => s.id)
    ).toEqual(['s1', 's2']);
  });
});
