/**
 * A voided attempt is given back to the learner (the server leaves it out
 * of the attempt allowance), so the quiz intro's "used" and "attempts
 * left" do not count it either.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { Quiz, QuizAttempt } from '@types';
import { QuizIntroCard } from './components/QuizIntroCard';

const quiz = {
  id: 'q-1',
  courseId: 'c-1',
  title: 'Unit test',
  status: 'published',
  questionCount: 4,
  maxAttempts: 2,
  attemptsAllowed: 2,
  settings: {
    mode: 'practice',
    timeLimitSeconds: null,
    availableFrom: null,
    availableUntil: null,
    dueAt: null,
    latePolicy: 'accept_flagged',
    gradingPolicy: 'highest',
    layout: 'all_questions',
    questionsPerAttempt: null,
    showScore: 'immediately',
    showAnswers: 'never',
    integrityMode: 'off',
    maxViolations: 3,
    requireFullscreen: false,
    requiredToProgress: false,
    requiredForCompletion: false,
    hideTimer: false,
  },
} as unknown as Quiz;

const attempt = (id: string, status: QuizAttempt['status']) =>
  ({ id, status, attemptNumber: Number(id) }) as unknown as QuizAttempt;

afterEach(() => cleanup());

describe('quiz intro — voided attempts', () => {
  it('does not count a voided attempt as used', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <QuizIntroCard
          quiz={quiz}
          attempts={[attempt('1', 'invalidated'), attempt('2', 'failed')]}
          resuming={false}
          canStart
          onStart={vi.fn()}
          isStarting={false}
        />
      </I18nextProvider>
    );
    expect(screen.getByText('1 of 2 used')).toBeTruthy();
    expect(screen.getByText('1 attempt left')).toBeTruthy();
  });
});
