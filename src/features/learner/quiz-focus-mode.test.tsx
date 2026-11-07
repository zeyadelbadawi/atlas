/**
 * B0-LRN-11 — quiz focus mode.
 *
 * When the quiz requires full screen and the browser has none (every
 * browser on iPhone), the running attempt marks `<body>` so the layout
 * around it steps aside. It must not happen anywhere else: not when full
 * screen works (desktop, Android, iPad), not when the quiz does not require
 * it. The reviewer's `fullscreen_unavailable` signal is recorded exactly as
 * before, and the mark goes when the attempt stops running.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { QUIZ_FOCUS_ATTRIBUTE } from '@utils';
import type { QuizAttemptSession, QuizAttemptSettings } from '@types';
import type * as Hooks from '@hooks';
import { QuizAttemptRunner } from './components/QuizAttemptRunner';
import type { QuizFullscreenControl } from './hooks/useQuizFullscreen';
import { quizFocusMode, useQuizFocusMode } from './hooks/useQuizFocusMode';

const recordFullscreenUnavailable = vi.fn();

vi.mock('./hooks/useQuizIntegrity', () => ({
  useQuizIntegrity: () => ({
    violationCount: 0,
    maxViolations: 3,
    acknowledgeWarning: vi.fn(),
    recordFullscreenUnavailable,
  }),
}));
vi.mock('./hooks/useQuizAutosave', () => ({
  useQuizAutosave: () => ({
    state: 'idle',
    lastSavedAt: null,
    schedule: vi.fn(),
    flush: vi.fn(async () => undefined),
    currentRevision: () => 0,
  }),
}));
vi.mock('./hooks/useAttemptClock', () => ({
  useAttemptClock: () => ({ remaining: null }),
}));
vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn(async () => false) }),
}));
vi.mock('@services/offline', () => ({
  loadQuizJournal: vi.fn(async () => null),
  deleteQuizJournal: vi.fn(async () => undefined),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof Hooks>()),
  useAuth: () => ({ user: { id: 'u1', name: 'Lina', email: 'l@example.com' } }),
}));

function session(settings: Partial<QuizAttemptSettings>): QuizAttemptSession {
  return {
    attemptId: 'a1',
    quizId: 'q1',
    status: 'in_progress',
    attemptNumber: 1,
    startedAt: '2026-11-07T10:00:00.000Z',
    deadlineAt: null,
    serverNow: '2026-11-07T10:00:00.000Z',
    remainingSeconds: null,
    revision: 0,
    lastSavedAt: null,
    violationCount: 0,
    settings: {
      mode: 'exam',
      layout: 'all_questions',
      hideTimer: false,
      integrityMode: 'strict',
      maxViolations: 3,
      requireFullscreen: true,
      timeLimitSeconds: null,
      timeMultiplier: 1,
      engineV2: true,
      ...settings,
    },
    questions: [
      {
        id: 'qq1',
        type: 'single_choice',
        prompt: 'Two plus two?',
        points: 1,
        options: [
          { id: 'o1', text: '4' },
          { id: 'o2', text: '5' },
        ],
      },
    ] as unknown as QuizAttemptSession['questions'],
    answers: [],
    attemptsUsed: 1,
    attemptsAllowed: null,
  };
}

function fullscreen(
  supported: boolean,
  active = supported
): QuizFullscreenControl {
  return {
    supported,
    active,
    lastResult: supported ? 'entered' : 'unsupported',
    request: vi.fn(async () => (supported ? 'entered' : 'unsupported')),
    exit: vi.fn(),
  };
}

function renderRunner(
  settings: Partial<QuizAttemptSettings>,
  control: QuizFullscreenControl
) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <QuizAttemptRunner
        courseId="c1"
        quizId="q1"
        session={session(settings)}
        onSubmit={vi.fn(async () => undefined)}
        isSubmitting={false}
        onFinished={vi.fn()}
        fullscreen={control}
      />
    </I18nextProvider>
  );
}

const focused = () => document.body.hasAttribute(QUIZ_FOCUS_ATTRIBUTE);

beforeEach(() => {
  recordFullscreenUnavailable.mockClear();
  document.body.removeAttribute(QUIZ_FOCUS_ATTRIBUTE);
});
afterEach(cleanup);

describe('quizFocusMode — only when full screen is required and impossible', () => {
  it.each([
    ['unsupported', true],
    ['none', false],
    ['gate', false],
    ['gate-refused', false],
  ] as const)('%s → %s', (view, expected) => {
    expect(quizFocusMode(view)).toBe(expected);
  });
});

describe('useQuizFocusMode', () => {
  it('marks <body> while active and removes the mark when it stops or unmounts', () => {
    const { rerender, unmount } = renderHook(
      ({ active }) => useQuizFocusMode(active),
      { initialProps: { active: true } }
    );
    expect(focused()).toBe(true);
    rerender({ active: false });
    expect(focused()).toBe(false);
    rerender({ active: true });
    expect(focused()).toBe(true);
    unmount();
    expect(focused()).toBe(false);
  });
});

describe('the running attempt', () => {
  it('required + unsupported (iPhone): focus mode, the notice, the questions, and the reviewer signal as before', () => {
    const { unmount } = renderRunner(
      { requireFullscreen: true },
      fullscreen(false)
    );
    expect(focused()).toBe(true);
    expect(
      screen.getByTestId('quiz-fullscreen-unsupported').textContent
    ).toContain('The quiz is shown in focus mode instead.');
    expect(screen.getByText('Two plus two?')).toBeTruthy();
    expect(screen.getByTestId('quiz-submit')).toBeTruthy();
    expect(recordFullscreenUnavailable).toHaveBeenCalledTimes(1);
    expect(recordFullscreenUnavailable).toHaveBeenCalledWith('unsupported');
    // Submitted, ended or left: the runner unmounts and the layout returns.
    unmount();
    expect(focused()).toBe(false);
  });

  it('full screen supported (desktop, Android, iPad): no focus mode, nothing recorded', () => {
    renderRunner({ requireFullscreen: true }, fullscreen(true));
    expect(focused()).toBe(false);
    expect(screen.queryByTestId('quiz-fullscreen-unsupported')).toBeNull();
    expect(recordFullscreenUnavailable).not.toHaveBeenCalled();
  });

  it('supported but out of full screen: the gate, never focus mode', () => {
    renderRunner({ requireFullscreen: true }, fullscreen(true, false));
    expect(focused()).toBe(false);
    expect(screen.getByTestId('quiz-fullscreen-gate')).toBeTruthy();
  });

  it.each([
    ['full screen not required', { requireFullscreen: false }],
    [
      'integrity off (full screen never applies)',
      { requireFullscreen: true, integrityMode: 'off' as const },
    ],
  ])(
    '%s, on a browser without full screen: no focus mode',
    (_name, settings) => {
      renderRunner(settings, fullscreen(false));
      expect(focused()).toBe(false);
      expect(screen.queryByTestId('quiz-fullscreen-unsupported')).toBeNull();
      expect(recordFullscreenUnavailable).not.toHaveBeenCalled();
    }
  );
});
