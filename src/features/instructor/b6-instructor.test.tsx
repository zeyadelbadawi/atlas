/**
 * B6 (UX audit) — the instructor area, with the real EN/AR catalogues:
 *   V02 the Announcements quick link is hidden without `announcement.manage`;
 *   V03/V13 manual points are whole numbers; a server refusal on
 *       `grades.<index>.points` lands on THAT question's field, naming the
 *       question's own maximum;
 *   V06 a graded submission says so (and who graded it, by name), and
 *       replacing its grade asks first;
 *   V07/V08 a failed grade is ONE inline message with the real reason;
 *   V09/V10 the score accepts 92.5, refuses 100.5 and an empty value with
 *       the app's own translated message (the forms are `noValidate`);
 *   V11 typed points are protected by the unsaved-changes guard;
 *   V18 an override window that already ended is refused;
 *   V21 plurals; V23 both ends of the points hint use one digit style;
 *   V27 grades can be saved in parts.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type * as Providers from '@app/providers';
import type {
  AssignmentSubmissionReview,
  InstructorCourseOverview,
  QuizAttemptReview,
} from '@types';
import { quizOverrideSchema } from './schemas/instructor.schemas';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??=
  ResizeObserverStub;

const state = vi.hoisted(() => ({
  unsaved: [] as boolean[],
  permissions: new Set<string>(),
  confirm: vi.fn(async () => true),
  toast: vi.fn(),
  grade: vi.fn(async (_v: unknown): Promise<unknown> => ({})),
  gradeAttempt: vi.fn(async (_v: unknown): Promise<unknown> => ({})),
  submission: undefined as unknown,
  attempt: undefined as unknown,
  overview: undefined as unknown,
}));

/** A mutation whose `error` follows its last call, like TanStack's. */
function useFakeMutation(fn: (variables: unknown) => Promise<unknown>) {
  const [error, setError] = useState<unknown>(null);
  return {
    isPending: false,
    error,
    reset: () => setError(null),
    mutateAsync: async (variables: unknown) => {
      setError(null);
      try {
        return await fn(variables);
      } catch (caught) {
        setError(caught);
        throw caught;
      }
    },
  };
}

vi.mock('./hooks', () => ({
  useInstructorSubmission: () => ({
    data: state.submission,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGradeSubmission: () => useFakeMutation(state.grade),
  useInstructorCourseOverview: () => ({
    data: state.overview,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useQuizAttemptReview: () => ({
    data: state.attempt,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGradeQuizAttempt: () => useFakeMutation(state.gradeAttempt),
  useInvalidateQuizAttempt: () => useFakeMutation(async () => ({})),
}));
vi.mock('@features/learning', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAssignments: () => ({
    data: { items: [{ id: 'as-1', title: 'Essay on rivers' }] },
  }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof Providers>()),
  useConfirmDialog: () => ({ confirm: state.confirm }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: state.toast,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'me' } }),
  usePermissions: () => ({
    hasPermission: (permission: string) => state.permissions.has(permission),
  }),
  useUnsavedChanges: ({ isDirty }: { isDirty: boolean }) => {
    state.unsaved.push(isDirty);
    return { markSaved: () => undefined };
  },
}));

const { default: InstructorSubmissionReviewPage } =
  await import('./pages/InstructorSubmissionReviewPage');
const { default: InstructorQuizAttemptPage } =
  await import('./pages/InstructorQuizAttemptPage');
const { default: InstructorCourseOverviewPage } =
  await import('./pages/InstructorCourseOverviewPage');

afterEach(() => {
  cleanup();
  state.unsaved = [];
  state.permissions = new Set();
  state.confirm.mockReset();
  state.confirm.mockResolvedValue(true);
  state.toast.mockReset();
  state.grade.mockReset();
  state.grade.mockResolvedValue({});
  state.gradeAttempt.mockReset();
});

function renderAt(
  path: string,
  route: string,
  element: JSX.Element,
  language: 'en' | 'ar' = 'en'
) {
  return render(
    <AtlasLocalizationProvider initialLanguage={language}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </AtlasLocalizationProvider>
  );
}

/* ---------- submission review ---------- */

const SUBMISSION = {
  id: 'sub-1',
  assignmentId: 'as-1',
  studentId: 'st-1',
  studentName: 'Sarah Ali',
  status: 'submitted',
  response: 'El Cairo es grande.',
  submittedAt: '2026-11-01T10:00:00.000Z',
  isLate: false,
  submittedRevision: 1,
  gradingStatus: 'ungraded',
} as unknown as AssignmentSubmissionReview;

const GRADED = {
  ...SUBMISSION,
  gradingStatus: 'graded',
  grade: {
    score: 92,
    feedback: 'Good',
    gradedAt: '2026-11-02T09:00:00.000Z',
    gradedBy: 'me',
  },
} as unknown as AssignmentSubmissionReview;

function renderReview(language: 'en' | 'ar' = 'en') {
  state.permissions = new Set(['instructor.assignment.grade']);
  return renderAt(
    '/review/c-1/as-1/sub-1',
    '/review/:courseId/:assignmentId/:submissionId',
    <InstructorSubmissionReviewPage />,
    language
  );
}

const scoreInput = () => screen.getByRole('spinbutton');

describe('submission review — score (V09, V10, V14)', () => {
  it('accepts 92.5, which the server keeps', async () => {
    state.submission = SUBMISSION;
    renderReview();
    await userEvent.type(scoreInput(), '92.5');
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    await waitFor(() =>
      expect(state.grade).toHaveBeenCalledWith({
        submissionId: 'sub-1',
        payload: { score: 92.5, feedback: undefined },
      })
    );
  });

  it('refuses 100.5 and an empty score in the app’s words, EN and AR', async () => {
    state.submission = SUBMISSION;
    renderReview();
    expect(scoreInput().closest('form')?.noValidate).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    expect(
      await screen.findByText(
        'Enter a score from 0 to 100, with at most two decimals (for example 92.5).'
      )
    ).toBeTruthy();
    await userEvent.type(scoreInput(), '100.5');
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    expect(await screen.findByText(/Enter a score from 0 to 100/)).toBeTruthy();
    expect(state.grade).not.toHaveBeenCalled();
    cleanup();

    renderReview('ar');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الدرجة' }));
    expect(await screen.findByText(/أدخل درجة من 0 إلى 100/)).toBeTruthy();
    expect(screen.queryByText('Required')).toBeNull();
  });

  it('names the assignment and course, the scale and the required mark', () => {
    state.submission = SUBMISSION;
    state.overview = { title: 'Spanish Basics' };
    renderReview();
    expect(screen.getByText('Essay on rivers · Spanish Basics')).toBeTruthy();
    expect(screen.getByText(/Score \(out of 100\)/)).toBeTruthy();
    expect(screen.getByText('This field is required')).toBeTruthy();
    // V15 — the student's text keeps its own direction.
    expect(screen.getByText('El Cairo es grande.').getAttribute('dir')).toBe(
      'auto'
    );
    state.overview = undefined;
  });
});

describe('submission review — failure and regrade (V06, V07, V08)', () => {
  it('a refusal shows once, inline, with the real reason — no toast', async () => {
    state.submission = SUBMISSION;
    state.grade.mockRejectedValue(
      createApiError('forbidden', {
        messageKey: 'errors.submission.notSubmitted',
      })
    );
    renderReview();
    await userEvent.type(scoreInput(), '80');
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("The grade wasn't saved");
    expect(alert.textContent).toContain(
      "This submission hasn't been handed in yet, so it can't be graded."
    );
    expect(screen.getAllByTestId('save-failed')).toHaveLength(1);
    expect(state.toast).not.toHaveBeenCalled();
  });

  it('shows the grade in the header and asks before replacing 92 with 40', async () => {
    state.submission = GRADED;
    renderReview();
    expect(screen.getByText('Graded · 92 / 100')).toBeTruthy();
    expect(screen.getByTestId('graded-at').textContent).toMatch(
      /^Graded by you on /
    );

    state.confirm.mockResolvedValueOnce(false);
    await userEvent.clear(scoreInput());
    await userEvent.type(scoreInput(), '40');
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionKey: 'instructor:grading.regradeConfirm.description',
        values: expect.objectContaining({ previous: '92', next: '40' }),
      })
    );
    expect(state.grade).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    await waitFor(() => expect(state.grade).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledTimes(2);
  });

  it('the confirmation reads as a question with both grades, EN and AR', () => {
    const values = { previous: '92', next: '40', student: 'Sarah' };
    expect(
      createI18nInstance('en').t(
        'instructor:grading.regradeConfirm.description',
        values
      )
    ).toMatch(/^Replace the grade of 92 with 40\?/);
    expect(
      createI18nInstance('ar').t(
        'instructor:grading.regradeConfirm.description',
        values
      )
    ).toMatch(/^استبدال الدرجة 92 بالدرجة 40؟/);
  });

  it('the confirmation buttons and title carry no placeholders (only the description is interpolated)', () => {
    for (const lang of ['en', 'ar'] as const) {
      const t = createI18nInstance(lang).t;
      for (const key of ['title', 'confirmLabel', 'cancelLabel']) {
        expect(t(`instructor:grading.regradeConfirm.${key}`)).not.toMatch(
          /\{\{/
        );
      }
    }
  });

  it('saving the same score again does not ask', async () => {
    state.submission = GRADED;
    renderReview();
    fireEvent.click(screen.getByRole('button', { name: 'Save Grade' }));
    await waitFor(() => expect(state.grade).toHaveBeenCalledTimes(1));
    expect(state.confirm).not.toHaveBeenCalled();
  });
});

/* ---------- manual grading ---------- */

const essay = (questionId: string, points: number) => ({
  questionId,
  prompt: `Prompt ${questionId}`,
  type: 'essay',
  points,
  answered: true,
  correct: null,
  pointsAwarded: 0,
  needsManualGrading: true,
  manualPoints: null,
  text: 'An answer',
  options: [],
});

const ATTEMPT = {
  id: 'at-1',
  quizId: 'q-1',
  studentId: 'st-1',
  status: 'submitted',
  answers: [],
  attemptNumber: 2,
  canRetry: false,
  startedAt: '2026-11-01T10:00:00.000Z',
  submittedAt: '2026-11-01T10:20:00.000Z',
  deadlineAt: null,
  revision: 1,
  lastSavedAt: null,
  autoSubmitted: false,
  autoSubmittedReason: null,
  isLate: false,
  violationCount: 0,
  integrityFlagged: false,
  gradingStatus: 'pending',
  pointsEarned: null,
  pointsTotal: null,
  score: null,
  invalidatedAt: null,
  invalidationReason: null,
  studentName: 'Sarah Ali',
  studentEmail: 'sarah@example.com',
  durationSeconds: 1200,
  questions: [essay('q1', 10), essay('q2', 10)],
  events: [],
  gradedByName: null,
  invalidatedByName: null,
  integrityMode: 'off',
  requireFullscreen: false,
  maxViolations: 0,
  signals: [],
} as unknown as QuizAttemptReview;

function renderAttempt(language: 'en' | 'ar' = 'en') {
  state.permissions = new Set(['instructor.assignment.grade']);
  state.attempt = ATTEMPT;
  return renderAt(
    '/attempt/c-1/q-1/at-1',
    '/attempt/:courseId/:quizId/:attemptId',
    <InstructorQuizAttemptPage />,
    language
  );
}

describe('manual grading (V03, V11, V13, V23, V27)', () => {
  it('refuses 7.5 points with the question’s own range; nothing is sent', async () => {
    renderAttempt();
    const q1 = screen.getByLabelText('Points for question 1');
    expect(q1.closest('form')?.noValidate).toBe(true);
    await userEvent.type(q1, '7.5');
    fireEvent.click(screen.getByRole('button', { name: 'Save grades' }));
    expect(
      await screen.findByText('Enter a whole number of points from 0 to 10.')
    ).toBeTruthy();
    expect(state.gradeAttempt).not.toHaveBeenCalled();
  });

  it('asks for at least one grade when none is entered', async () => {
    renderAttempt();
    fireEvent.click(screen.getByRole('button', { name: 'Save grades' }));
    expect(
      await screen.findByText(
        'Enter points for at least one question before saving.'
      )
    ).toBeTruthy();
    expect(state.gradeAttempt).not.toHaveBeenCalled();
  });

  it('saves part of the grading, and a server cap refusal lands on that question with {{max}}', async () => {
    state.gradeAttempt.mockRejectedValue(
      createApiError('validation', {
        messageKey: 'errors.quiz.pointsExceedMaximum',
        violations: [
          {
            field: 'grades.0.points',
            messageKey: 'errors.quiz.pointsExceedMaximum',
            values: { max: 10 },
          },
        ],
      })
    );
    renderAttempt();
    const q2 = screen.getByLabelText('Points for question 2');
    await userEvent.type(q2, '8');
    expect(state.unsaved.at(-1)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save grades' }));
    await waitFor(() =>
      expect(state.gradeAttempt).toHaveBeenCalledWith({
        attemptId: 'at-1',
        payload: { grades: [{ questionId: 'q2', points: 8 }] },
      })
    );
    const message = await screen.findByText(
      'This question is worth 10 points. Enter 10 or fewer.'
    );
    // On question 2's field — index 0 of what was sent — not question 1's.
    expect(q2.getAttribute('aria-invalid')).toBe('true');
    expect(
      screen
        .getByLabelText('Points for question 1')
        .getAttribute('aria-invalid')
    ).toBe('false');
    expect(q2.getAttribute('aria-describedby')).toContain(message.id);
    // One message: no alert, no toast.
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(state.toast).not.toHaveBeenCalled();
  });

  it('a non-field failure is one alert in the card with the real reason', async () => {
    state.gradeAttempt.mockRejectedValue(
      createApiError('conflict', {
        messageKey: 'errors.quiz.attemptInvalidated',
      })
    );
    renderAttempt();
    await userEvent.type(screen.getByLabelText('Points for question 1'), '5');
    fireEvent.click(screen.getByRole('button', { name: 'Save grades' }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain('A reviewer voided this attempt.');
    expect(state.toast).not.toHaveBeenCalled();
  });

  it('writes both ends of the points hint in the same digits (AR)', () => {
    renderAttempt('ar');
    const hints = screen.getAllByText(/نقاط، أعداد صحيحة/);
    expect(hints[0].textContent).toContain('0–10');
  });
});

/* ---------- overview, overrides, plurals ---------- */

const OVERVIEW = {
  courseId: 'c-1',
  title: 'Spanish Basics',
  status: 'published',
  visibility: 'public',
  enrolledCount: 3,
  totalSections: 1,
  totalLessons: 5,
  pendingSubmissionsCount: 1,
  pendingGradingCount: 0,
  recentActivity: [],
} as unknown as InstructorCourseOverview;

describe('course overview (V02, V16, V21)', () => {
  function renderOverview(permissions: string[]) {
    state.permissions = new Set(permissions);
    return renderAt(
      '/overview/c-1',
      '/overview/:courseId',
      <InstructorCourseOverviewPage />
    );
  }

  it('hides the Announcements link from an instructor without announcement.manage', () => {
    state.overview = OVERVIEW;
    renderOverview([]);
    expect(screen.getByRole('button', { name: 'Students' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Announcements' })).toBeNull();
    cleanup();
    renderOverview(['announcement.manage']);
    expect(screen.getByRole('button', { name: 'Announcements' })).toBeTruthy();
  });

  it('says "1 section · 5 lessons" and labels the counts without a contradiction', () => {
    state.overview = OVERVIEW;
    renderOverview([]);
    expect(screen.getByText('1 section · 5 lessons')).toBeTruthy();
    expect(screen.getByText('Assignments submitted')).toBeTruthy();
    expect(screen.getByText('Assignments awaiting grading')).toBeTruthy();
    expect(screen.queryByText('Pending Submissions')).toBeNull();
  });
});

describe('overrides window (V18)', () => {
  it('refuses a window that has already ended', () => {
    const result = quizOverrideSchema.safeParse({
      studentId: 's-1',
      timeMultiplier: 1,
      extraAttempts: 0,
      availableFrom: '2020-01-01T10:00',
      availableUntil: '2020-01-02T10:00',
    });
    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0].message).toBe(
      'instructor:quizResults.overrides.windowEnded'
    );
  });

  it('says what to enter for a blank multiplier or attempts (V10)', () => {
    const result = quizOverrideSchema.safeParse({
      studentId: 's-1',
      timeMultiplier: undefined,
      extraAttempts: undefined,
    });
    const messages = result.success
      ? []
      : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual([
      'instructor:quizResults.overrides.timeMultiplierRange',
      'instructor:quizResults.overrides.extraAttemptsRange',
    ]);
  });
});

describe('plurals (V21)', () => {
  const en = createI18nInstance('en');
  const ar = createI18nInstance('ar');

  it('English singular and plural', () => {
    expect(en.t('instructor:assessments.questionCount', { count: 1 })).toBe(
      '1 question'
    );
    expect(en.t('instructor:assessments.questionCount', { count: 3 })).toBe(
      '3 questions'
    );
    expect(
      en.t('instructor:attemptReview.answers.pointsWorth', {
        count: 1,
        points: '1',
      })
    ).toBe('1 point');
    expect(en.t('forum:list.replyCount', { count: 1 })).toBe('1 reply');
  });

  it('Arabic forms, never "1 أسئلة"', () => {
    expect(ar.t('instructor:assessments.questionCount', { count: 1 })).toBe(
      'سؤال واحد'
    );
    expect(ar.t('instructor:assessments.questionCount', { count: 2 })).toBe(
      'سؤالان'
    );
    expect(ar.t('instructor:assessments.questionCount', { count: 5 })).toBe(
      '5 أسئلة'
    );
    expect(ar.t('instructor:assessments.questionCount', { count: 11 })).toBe(
      '11 سؤالًا'
    );
    expect(ar.t('instructor:overview.sectionCount', { count: 1 })).toBe(
      'قسم واحد'
    );
  });
});

describe('submission review — who graded it (V06)', () => {
  it('names another grader, in English and Arabic', () => {
    state.submission = {
      ...GRADED,
      grade: { ...GRADED.grade, gradedBy: 'u-2', gradedByName: 'Hana Saleh' },
    };
    renderReview();
    expect(screen.getByTestId('graded-at').textContent).toMatch(
      /^Graded by \u2068?Hana Saleh\u2069? on /
    );
    cleanup();
    renderReview('ar');
    expect(screen.getByTestId('graded-at').textContent).toMatch(
      /^صحّحه \u2068?Hana Saleh\u2069? في /
    );
  });

  it('says "by you" for your own grade, and only the date when the grader is unknown', () => {
    state.submission = {
      ...GRADED,
      grade: { ...GRADED.grade, gradedByName: 'Me Myself' },
    };
    renderReview();
    expect(screen.getByTestId('graded-at').textContent).toMatch(
      /^Graded by you on /
    );
    cleanup();
    state.submission = {
      ...GRADED,
      grade: { ...GRADED.grade, gradedBy: 'u-gone', gradedByName: undefined },
    };
    renderReview();
    expect(screen.getByTestId('graded-at').textContent).toMatch(/^Graded on /);
  });
});

describe('quiz results columns (V17)', () => {
  it('keeps the headers in one case', async () => {
    const { DataTable } = await import('@components/table');
    render(
      <AtlasLocalizationProvider initialLanguage="en">
        <DataTable
          columns={[
            { accessorKey: 'a', header: 'Student' },
            { id: 'b', header: 'Points', enableSorting: false },
          ]}
          data={[{ a: 'x' }]}
        />
      </AtlasLocalizationProvider>
    );
    const headers = within(screen.getByRole('table')).getAllByRole(
      'columnheader'
    );
    for (const header of headers) {
      expect(header.className).not.toContain('uppercase');
    }
  });
});
