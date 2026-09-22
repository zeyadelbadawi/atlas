import { describe, expect, it } from 'vitest';
import type { QuizSessionQuestion } from '@types';
import {
  answeredCount,
  answersEqual,
  attemptFacts,
  crossedAnnouncement,
  effectiveLayout,
  formatCountdown,
  isAnswered,
  isUrgent,
  remainingSeconds,
  serverClockOffsetMs,
  toAnswerList,
  toAnswerMap,
  unansweredQuestionNumbers,
} from './utils/quiz-attempt.utils';

const questions: readonly QuizSessionQuestion[] = [
  { id: 'q1', type: 'single_choice', prompt: 'A', points: 1, options: [] },
  { id: 'q2', type: 'short_answer', prompt: 'B', points: 2, options: [] },
  { id: 'q3', type: 'essay', prompt: 'C', points: 5, options: [] },
];

describe('server clock', () => {
  it('derives the offset from the server clock, positive when the server is ahead', () => {
    const client = Date.parse('2026-09-22T10:00:00.000Z');
    expect(serverClockOffsetMs('2026-09-22T10:00:05.000Z', client)).toBe(5_000);
    expect(serverClockOffsetMs('2026-09-22T09:59:55.000Z', client)).toBe(
      -5_000
    );
    expect(serverClockOffsetMs('not a date', client)).toBe(0);
  });

  it('counts down from the deadline using the corrected clock and never goes negative', () => {
    const client = Date.parse('2026-09-22T10:00:00.000Z');
    // Client is 5 s SLOW: server thinks it is 10:00:05.
    const offset = 5_000;
    expect(remainingSeconds('2026-09-22T10:10:00.000Z', client, offset)).toBe(
      595
    );
    expect(remainingSeconds('2026-09-22T10:00:04.000Z', client, offset)).toBe(
      0
    );
    expect(remainingSeconds(null, client, offset)).toBeNull();
  });

  it('formats the countdown as mm:ss or h:mm:ss', () => {
    expect(formatCountdown(750, 'en')).toContain('12:30');
    expect(formatCountdown(3920, 'en')).toContain('1:05:20');
    expect(formatCountdown(-4, 'en')).toContain('0:00');
  });

  it('fires each announcement once, when crossed, even across a skipped tick', () => {
    expect(crossedAnnouncement(601, 600)).toBe(600);
    expect(crossedAnnouncement(600, 599)).toBeNull();
    expect(crossedAnnouncement(305, 298)).toBe(300);
    expect(crossedAnnouncement(61, 60)).toBe(60);
    expect(crossedAnnouncement(31, 30)).toBe(30);
    expect(crossedAnnouncement(null, 30)).toBeNull();
    expect(crossedAnnouncement(30, null)).toBeNull();
  });

  it('marks the last two minutes as urgent', () => {
    expect(isUrgent(121)).toBe(false);
    expect(isUrgent(120)).toBe(true);
    expect(isUrgent(null)).toBe(false);
  });
});

describe('answers', () => {
  it('counts a selection or non-blank text as answered', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ questionId: 'q1', selectedOptionIds: [] })).toBe(false);
    expect(isAnswered({ questionId: 'q1', selectedOptionIds: ['o'] })).toBe(
      true
    );
    expect(isAnswered({ questionId: 'q2', text: '   ' })).toBe(false);
    expect(isAnswered({ questionId: 'q2', text: 'Paris' })).toBe(true);
  });

  it('lists unanswered question numbers and counts answered ones', () => {
    const answers = toAnswerMap([
      { questionId: 'q1', selectedOptionIds: ['o1'] },
      { questionId: 'q3', text: '' },
    ]);
    expect(answeredCount(questions, answers)).toBe(1);
    expect(unansweredQuestionNumbers(questions, answers)).toEqual([2, 3]);
    expect(toAnswerList(questions, answers)).toEqual([
      { questionId: 'q1', selectedOptionIds: ['o1'] },
    ]);
  });

  it('compares answers order-insensitively', () => {
    expect(
      answersEqual(
        { questionId: 'q', selectedOptionIds: ['a', 'b'] },
        { questionId: 'q', selectedOptionIds: ['b', 'a'] }
      )
    ).toBe(true);
    expect(
      answersEqual(
        { questionId: 'q', text: 'x' },
        { questionId: 'q', text: 'y' }
      )
    ).toBe(false);
    expect(answersEqual(undefined, { questionId: 'q', text: 'y' })).toBe(false);
  });
});

describe('layout and facts', () => {
  it('pages questions on a narrow viewport unless the author forced paging anyway', () => {
    expect(effectiveLayout('all_questions', 1024)).toBe('all_questions');
    expect(effectiveLayout('all_questions', 390)).toBe('one_per_page');
    expect(effectiveLayout('one_per_page', 1024)).toBe('one_per_page');
  });

  it('computes attempts left from the session, or null when unlimited', () => {
    expect(attemptFacts({ attemptsUsed: 1, attemptsAllowed: 3 }, 600)).toEqual({
      timeLimitSeconds: 600,
      attemptsUsed: 1,
      attemptsAllowed: 3,
      attemptsLeft: 2,
    });
    expect(
      attemptFacts({ attemptsUsed: 4, attemptsAllowed: 3 }, null).attemptsLeft
    ).toBe(0);
    expect(
      attemptFacts({ attemptsUsed: 4, attemptsAllowed: null }, null)
        .attemptsLeft
    ).toBeNull();
  });
});
