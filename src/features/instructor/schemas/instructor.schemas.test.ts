/**
 * The quiz-exception time multiplier: the form accepts exactly what the
 * server accepts (1–4, `quiz-review.service.ts`'s `MAX_TIME_MULTIPLIER`),
 * and both error messages state that range.
 */
import { describe, expect, it } from 'vitest';
import enErrors from '@/localization/resources/en/errors.json';
import arErrors from '@/localization/resources/ar/errors.json';
import enInstructor from '@/localization/resources/en/instructor.json';
import arInstructor from '@/localization/resources/ar/instructor.json';
import { MAX_TIME_MULTIPLIER, quizOverrideSchema } from './instructor.schemas';

const base = { studentId: 'student-1', extraAttempts: 0 };

describe('quiz exception time multiplier', () => {
  it('matches the server maximum of 4', () => {
    expect(MAX_TIME_MULTIPLIER).toBe(4);
  });

  it('accepts 1 to 4 and refuses anything outside', () => {
    for (const ok of [1, 1.5, 4]) {
      expect(
        quizOverrideSchema.safeParse({ ...base, timeMultiplier: ok }).success
      ).toBe(true);
    }
    for (const bad of [0.75, 4.25, 5]) {
      const result = quizOverrideSchema.safeParse({
        ...base,
        timeMultiplier: bad,
      });
      expect(result.success).toBe(false);
      expect(result.success ? null : result.error.issues[0].message).toBe(
        'instructor:quizResults.overrides.timeMultiplierRange'
      );
    }
  });

  it('says "between 1 and 4" in the form and server messages, EN and AR', () => {
    expect(enInstructor.quizResults.overrides.timeMultiplierRange).toContain(
      'between 1 and 4'
    );
    expect(enErrors.quiz.invalidTimeMultiplier).toContain('between 1 and 4');
    expect(arInstructor.quizResults.overrides.timeMultiplierRange).toContain(
      'بين 1 و4'
    );
    expect(arErrors.quiz.invalidTimeMultiplier).toContain('بين 1 و4');
  });
});
