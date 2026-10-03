/**
 * The completion page "Finish course" opens (Task C): the server's
 * verdict, a certificate only when one genuinely exists or is being
 * issued, polling for it that is bounded, and exactly what is missing when
 * the course is not complete.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { CourseCompletion } from '@types';
import { LearnerSurfaceProvider } from './context/LearnerSurface.context';
import LearnerCourseCompletePage, {
  CERTIFICATE_POLL_LIMIT,
  CERTIFICATE_POLL_MS,
  certificateView,
} from './pages/LearnerCourseCompletePage';

let completion: CourseCompletion | undefined;
let lastOptions: {
  refetchInterval?: (data: CourseCompletion | undefined) => number | false;
  fresh?: boolean;
} = {};

vi.mock('@features/learning', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCourseCompletion: (_courseId: string, options: typeof lastOptions) => {
    lastOptions = options;
    return {
      data: completion,
      error: null,
      dataUpdatedAt: 1,
      refetch: vi.fn(),
    };
  },
}));
vi.mock('./components/CourseCompletionCard', () => ({
  CourseCompletionCard: () => <div data-testid="completion-card" />,
}));

const certificate = (
  overrides: Partial<CourseCompletion['certificate']> = {}
): CourseCompletion['certificate'] => ({
  enabled: true,
  status: 'unavailable',
  minScore: null,
  certificateId: null,
  serial: null,
  verificationCode: null,
  renderStatus: null,
  issuedAt: null,
  ...overrides,
});

const make = (overrides: Partial<CourseCompletion> = {}): CourseCompletion =>
  ({
    courseId: 'c1',
    courseTitle: 'Arabic for Beginners',
    completed: true,
    completedAt: '2026-10-03T10:00:00.000Z',
    completionState: 'completed',
    overallScore: null,
    rule: { lessons: 'all' },
    lessons: { total: 2, completed: 2 },
    quizzes: [],
    assignments: [],
    missing: [],
    certificate: certificate(),
    ...overrides,
  }) as unknown as CourseCompletion;

function show() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/my/courses/c1/complete']}>
        <LearnerSurfaceProvider
          academyId="a1"
          locale="en"
          buildHref={(path) => path}
        >
          <Routes>
            <Route
              path="/my/courses/:courseId/complete"
              element={<LearnerCourseCompletePage />}
            />
          </Routes>
        </LearnerSurfaceProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

beforeEach(() => {
  completion = undefined;
  lastOptions = {};
});
afterEach(cleanup);

describe('the verdict', () => {
  it('always re-reads it on arrival (never the player’s stale copy)', () => {
    completion = make();
    show();
    expect(lastOptions.fresh).toBe(true);
  });

  it('completed: says so, with the date', () => {
    completion = make();
    show();
    expect(screen.getByTestId('course-complete-page').dataset.state).toBe(
      'completed'
    );
    expect(
      screen.getByText('You’ve completed Arabic for Beginners')
    ).toBeTruthy();
  });

  it('not completed (a quiz still failed, say): what is missing, with a way back — never a dead end', () => {
    completion = make({ completed: false, completionState: 'in_progress' });
    show();
    expect(screen.getByTestId('course-complete-page').dataset.state).toBe(
      'incomplete'
    );
    expect(screen.getByTestId('completion-card')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to course' })).toBeTruthy();
    expect(screen.queryByTestId('course-complete-certificate')).toBeNull();
  });
});

describe('the certificate — only when genuinely available', () => {
  it('issued and ready: a link to it', () => {
    completion = make({
      certificate: certificate({ status: 'issued', renderStatus: 'ready' }),
    });
    show();
    expect(
      screen
        .getByRole('link', { name: 'View certificate' })
        .getAttribute('href')
    ).toBe('/my/certificates');
  });

  it('being issued: says so', () => {
    completion = make({ certificate: certificate({ status: 'eligible' }) });
    show();
    expect(
      screen.getByTestId('course-complete-certificate').dataset.state
    ).toBe('preparing');
    expect(screen.queryByRole('link', { name: 'View certificate' })).toBeNull();
  });

  it('a course without certificates, a revoked one, or one not completed: nothing promised', () => {
    for (const overrides of [
      { certificate: certificate({ enabled: false, status: 'unavailable' }) },
      { certificate: certificate({ status: 'unavailable' }) },
      { certificate: certificate({ status: 'revoked' }) },
      {
        completed: false,
        certificate: certificate({ status: 'issued', renderStatus: 'ready' }),
      },
    ]) {
      expect(
        certificateView(make(overrides as Partial<CourseCompletion>))
      ).toBe('none');
    }
  });

  it('polls while it is being issued — bounded, then stops', () => {
    const preparing = make({
      certificate: certificate({ status: 'eligible' }),
    });
    completion = preparing;
    show();
    const interval = lastOptions.refetchInterval!;
    // Ready or unavailable: no polling at all.
    expect(
      interval(
        make({
          certificate: certificate({ status: 'issued', renderStatus: 'ready' }),
        })
      )
    ).toBe(false);
    let polls = 0;
    while (interval(preparing) === CERTIFICATE_POLL_MS) polls += 1;
    expect(polls).toBe(CERTIFICATE_POLL_LIMIT);
    expect(interval(preparing)).toBe(false);
  });
});
