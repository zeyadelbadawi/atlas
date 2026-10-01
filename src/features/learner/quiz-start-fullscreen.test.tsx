/**
 * P4 — the Start click is the user gesture: it asks for full screen
 * BEFORE the start request (and only when the quiz requires it with
 * integrity on). The old code asked later, from an effect, and the
 * browser refused.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CourseSequenceItem, Quiz } from '@types';
import { QuizActivityView } from './components/QuizActivityView';
import type * as Hooks from '@hooks';

const order: string[] = [];
let quizSettings: Partial<Quiz['settings']>;

vi.mock('@features/learning', () => ({
  useQuiz: () => ({
    data: {
      id: 'q1',
      courseId: 'c1',
      title: 'Midterm',
      status: 'published',
      questionCount: 3,
      settings: {
        mode: 'graded',
        timeLimitSeconds: null,
        availableFrom: null,
        availableUntil: null,
        dueAt: null,
        layout: 'all_questions',
        questionsPerAttempt: null,
        showScore: 'immediately',
        showAnswers: 'never',
        maxViolations: 3,
        hideTimer: false,
        requiredToProgress: false,
        requiredForCompletion: false,
        ...quizSettings,
      },
    },
    error: null,
  }),
  useQuizAttempts: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useQuizAttemptSession: () => ({ data: undefined, error: null }),
  useQuizAttemptResults: () => ({ data: undefined, error: null }),
  useStartQuizAttempt: () => ({
    mutateAsync: () => {
      order.push('startAttempt');
      return new Promise(() => undefined);
    },
    isPending: false,
    error: null,
  }),
  useSubmitQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof Hooks>()),
  useAuth: () => ({ user: { id: 'u1', name: 'Lina', email: 'l@example.com' } }),
  useInvalidate: () => ({ invalidate: vi.fn() }),
}));

beforeEach(() => {
  order.length = 0;
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => null,
  });
  document.documentElement.requestFullscreen = vi.fn(() => {
    order.push('requestFullscreen');
    return Promise.resolve();
  });
});
afterEach(cleanup);

const item = {
  id: 'q1',
  type: 'quiz',
  state: 'available',
} as unknown as CourseSequenceItem;

async function start() {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <QuizActivityView courseId="c1" item={item} />
    </I18nextProvider>
  );
  const ack = screen.queryByRole('checkbox');
  if (ack) await userEvent.click(ack);
  await userEvent.click(screen.getByTestId('quiz-start'));
}

describe('Start → full screen', () => {
  it('requires full screen: requested first, inside the click, then the attempt starts', async () => {
    quizSettings = { integrityMode: 'warn', requireFullscreen: true };
    await start();
    expect(order).toEqual(['requestFullscreen', 'startAttempt']);
  });

  it('does not ask when the quiz does not require it', async () => {
    quizSettings = { integrityMode: 'warn', requireFullscreen: false };
    await start();
    expect(order).toEqual(['startAttempt']);
  });

  it('does not ask when integrity is off, whatever the stored switch says', async () => {
    quizSettings = { integrityMode: 'off', requireFullscreen: true };
    await start();
    expect(order).toEqual(['startAttempt']);
  });
});
