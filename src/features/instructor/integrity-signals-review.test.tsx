/**
 * P5 — the reviewer's integrity view: explainable signals (with their
 * innocent explanations), the evidence highlighted in the timeline, time
 * from start on every row, connection checks out of the way — and no
 * score, verdict or likelihood anywhere.
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
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type * as Hooks from '@hooks';
import type * as Providers from '@app/providers';
import type { QuizAttemptReview } from '@types';
import InstructorQuizAttemptPage from './pages/InstructorQuizAttemptPage';

let review: QuizAttemptReview;

vi.mock('./hooks', () => ({
  useQuizAttemptReview: () => ({
    data: review,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGradeQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInvalidateQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof Providers>()),
  useConfirmDialog: () => ({ confirm: vi.fn(async () => true) }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof Hooks>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));

const t0 = Date.parse('2026-03-01T10:00:00.000Z');
const iso = (s: number) => new Date(t0 + s * 1000).toISOString();
const event = (
  id: string,
  type: QuizAttemptReview['events'][number]['type'],
  s: number,
  counted = false
) => ({
  id,
  type,
  counted,
  clientAt: iso(s),
  serverAt: iso(s),
  payload: null,
});

function makeReview(
  overrides: Partial<QuizAttemptReview> = {}
): QuizAttemptReview {
  return {
    id: 'a1',
    quizId: 'q1',
    studentId: 's1',
    status: 'submitted',
    answers: [],
    attemptNumber: 1,
    canRetry: false,
    startedAt: iso(0),
    submittedAt: iso(900),
    deadlineAt: null,
    revision: 1,
    lastSavedAt: null,
    autoSubmitted: false,
    autoSubmittedReason: null,
    isLate: false,
    violationCount: 2,
    integrityFlagged: true,
    gradingStatus: 'graded',
    pointsEarned: 3,
    pointsTotal: 5,
    invalidatedAt: null,
    invalidationReason: null,
    studentName: 'Lina Haddad',
    studentEmail: 'lina@example.com',
    durationSeconds: 900,
    questions: [],
    events: [
      event('e1', 'heartbeat', 60),
      event('e2', 'visibility_hidden', 125, true),
      event('e3', 'visibility_visible', 170),
      event('e4', 'heartbeat', 120),
      event('e5', 'copy', 300),
    ],
    gradedByName: null,
    invalidatedByName: null,
    integrityMode: 'warn',
    requireFullscreen: true,
    maxViolations: 3,
    signals: [
      {
        key: 'time_away',
        level: 'review',
        category: 'behaviour',
        occurrences: 1,
        totalSeconds: 45,
        longestSeconds: 45,
        eventIds: ['e2', 'e3'],
      },
      {
        key: 'connection_gap',
        level: 'info',
        category: 'technical',
        occurrences: 1,
        totalSeconds: 200,
        longestSeconds: 200,
        eventIds: [],
      },
      {
        key: 'copy',
        level: 'info',
        category: 'behaviour',
        occurrences: 1,
        eventIds: ['e5'],
      },
    ],
    ...overrides,
  };
}

function renderPage(locale: 'en' | 'ar' = 'en') {
  return render(
    <AtlasLocalizationProvider initialLanguage={locale}>
      <MemoryRouter initialEntries={['/review/c1/q1/a1']}>
        <Routes>
          <Route
            path="/review/:courseId/:quizId/:attemptId"
            element={<InstructorQuizAttemptPage />}
          />
        </Routes>
      </MemoryRouter>
    </AtlasLocalizationProvider>
  );
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
beforeEach(() => {
  review = makeReview();
});
afterEach(cleanup);

describe('integrity signals on the attempt review', () => {
  it('lists what is worth a look and what is context, with numbers and innocent explanations', () => {
    renderPage();
    const worth = screen.getByTestId('integrity-signals-review');
    expect(within(worth).getByText('Quiz page hidden')).toBeTruthy();
    expect(
      within(worth).getByText(/The quiz tab was hidden once, for .*0:45/)
    ).toBeTruthy();
    expect(
      within(worth).getByText(/Locking the screen, a phone call/)
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('integrity-signals-context')).getByText(
        'Copied text'
      )
    ).toBeTruthy();
  });

  it('states the policy the attempt ran under, and keeps technical interruptions apart from conduct', () => {
    renderPage();
    expect(screen.getByTestId('integrity-policy').textContent).toBe(
      'This attempt ran in warn mode: the learner was warned from the first recorded event (limit 3 events). Full screen was required.'
    );
    const technical = screen.getByTestId('integrity-signals-technical');
    expect(
      within(technical).getByText('No contact from the browser')
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('integrity-signals-context')).queryByText(
        'No contact from the browser'
      )
    ).toBeNull();
  });

  it('never presents a score, likelihood or verdict', () => {
    renderPage();
    const text = screen.getByTestId('integrity-signals').textContent ?? '';
    expect(text).not.toMatch(/score|likelihood|probab|cheat(ed|ing)\b|%/i);
    expect(text).toMatch(/not proof/);
  });

  it('“Show in timeline” highlights exactly the evidence rows; connection checks stay hidden until asked', async () => {
    renderPage();
    expect(document.getElementById('attempt-event-e1')).toBeNull();
    await userEvent.click(
      within(screen.getByTestId('integrity-signal-time_away')).getByRole(
        'button',
        { name: 'Show in timeline' }
      )
    );
    const highlighted = [
      ...document.querySelectorAll('[data-highlighted]'),
    ].map((el) => el.id);
    expect(highlighted).toEqual(['attempt-event-e2', 'attempt-event-e3']);
    expect(
      screen.getByText('Highlighted: evidence for “Quiz page hidden”')
    ).toBeTruthy();

    await userEvent.click(
      screen.getByRole('button', { name: 'Show 2 connection checks' })
    );
    expect(document.getElementById('attempt-event-e1')).toBeTruthy();
  });

  it('every row says how far into the attempt it happened', () => {
    renderPage();
    const row = document.getElementById('attempt-event-e2')!;
    expect(row.textContent).toMatch(/\+.*2:05.* from start/);
  });

  it('nothing stood out → says so plainly', () => {
    review = makeReview({ signals: [] });
    renderPage();
    expect(
      screen.getByText('Nothing in this attempt’s timeline stood out.')
    ).toBeTruthy();
  });

  it('integrity off → no signals panel at all', () => {
    review = makeReview({ integrityMode: 'off', signals: [], events: [] });
    renderPage();
    expect(screen.queryByTestId('integrity-signals')).toBeNull();
  });

  it('Arabic', () => {
    renderPage('ar');
    expect(screen.getByText('صفحة الاختبار مخفية')).toBeTruthy();
    expect(screen.getByText(/ليست دليلًا/)).toBeTruthy();
  });
});
