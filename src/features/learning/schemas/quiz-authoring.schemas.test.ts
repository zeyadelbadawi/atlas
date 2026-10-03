/**
 * Quiz authoring schema (P64 Phase 3 §E.1).
 *
 * The schema is the client-side mirror of `QuizzesService.assertValidQuestions`
 * and the settings DTO bounds. These tests pin the rules the builder UI
 * relies on for inline errors: text types need no options, a short-answer
 * question needs at least one accepted answer, True/False keeps its
 * exactly-two-one-correct rule, and the numeric bounds match the server.
 */
import { describe, expect, it } from 'vitest';
import {
  blankQuizQuestion,
  customisedAdvancedSettings,
  defaultQuizSettingsFormValues,
  isAdvancedSettingCustomised,
  quizAuthoringSchema,
  QUIZ_ADVANCED_SETTING_KEYS,
  QUIZ_SERVER_DEFAULT_SETTINGS,
  QUIZ_SETTINGS_PRESETS,
  type QuizAuthoringFormData,
  type QuizQuestionFormData,
} from './quiz-authoring.schemas';

function choiceQuestion(
  overrides: Partial<QuizQuestionFormData> = {}
): QuizQuestionFormData {
  return {
    ...blankQuizQuestion(),
    prompt: 'What is 2 + 2?',
    options: [
      { label: '3', isCorrect: false },
      { label: '4', isCorrect: true },
    ],
    ...overrides,
  };
}

function quiz(
  questions: readonly QuizQuestionFormData[],
  overrides: Partial<QuizAuthoringFormData> = {}
): QuizAuthoringFormData {
  return {
    title: 'Quiz',
    description: '',
    status: 'draft',
    passingScore: undefined,
    maxAttempts: undefined,
    ...defaultQuizSettingsFormValues(),
    questions: [...questions],
    ...overrides,
  };
}

/** The issue paths of a failed parse, joined for readable assertions. */
function issuePaths(data: unknown): readonly string[] {
  const result = quizAuthoringSchema.safeParse(data);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('quizAuthoringSchema — question types', () => {
  it('accepts a valid single-choice question with the defaults', () => {
    expect(
      quizAuthoringSchema.safeParse(quiz([choiceQuestion()])).success
    ).toBe(true);
  });

  it('short_answer requires at least one accepted answer', () => {
    const missing = quiz([
      choiceQuestion({
        type: 'short_answer',
        options: [],
        acceptedAnswers: [],
      }),
    ]);
    expect(issuePaths(missing)).toContain('questions.0.acceptedAnswers');

    const undefinedList = quiz([
      choiceQuestion({
        type: 'short_answer',
        options: [],
        acceptedAnswers: undefined,
      }),
    ]);
    expect(issuePaths(undefinedList)).toContain('questions.0.acceptedAnswers');

    const present = quiz([
      choiceQuestion({
        type: 'short_answer',
        options: [],
        acceptedAnswers: [{ value: 'four' }, { value: '4' }],
      }),
    ]);
    expect(quizAuthoringSchema.safeParse(present).success).toBe(true);
  });

  it('short_answer rejects a blank accepted answer and more than 20 of them', () => {
    const blank = quiz([
      choiceQuestion({
        type: 'short_answer',
        options: [],
        acceptedAnswers: [{ value: '   ' }],
      }),
    ]);
    expect(issuePaths(blank)).toContain('questions.0.acceptedAnswers.0.value');

    const tooMany = quiz([
      choiceQuestion({
        type: 'short_answer',
        options: [],
        acceptedAnswers: Array.from({ length: 21 }, (_, i) => ({
          value: `answer ${i}`,
        })),
      }),
    ]);
    expect(issuePaths(tooMany)).toContain('questions.0.acceptedAnswers');
  });

  it('essay allows no options and no accepted answers', () => {
    const essay = quiz([
      choiceQuestion({
        type: 'essay',
        options: [],
        acceptedAnswers: [],
      }),
    ]);
    expect(quizAuthoringSchema.safeParse(essay).success).toBe(true);
  });

  it('true_false still needs exactly two options with exactly one correct', () => {
    const valid = quiz([
      choiceQuestion({
        type: 'true_false',
        options: [
          { label: 'True', isCorrect: true },
          { label: 'False', isCorrect: false },
        ],
      }),
    ]);
    expect(quizAuthoringSchema.safeParse(valid).success).toBe(true);

    const threeOptions = quiz([
      choiceQuestion({
        type: 'true_false',
        options: [
          { label: 'True', isCorrect: true },
          { label: 'False', isCorrect: false },
          { label: 'Maybe', isCorrect: false },
        ],
      }),
    ]);
    expect(issuePaths(threeOptions)).toContain('questions.0.options');

    const noneCorrect = quiz([
      choiceQuestion({
        type: 'true_false',
        options: [
          { label: 'True', isCorrect: false },
          { label: 'False', isCorrect: false },
        ],
      }),
    ]);
    expect(issuePaths(noneCorrect)).toContain('questions.0.options');
  });

  it('single_choice needs exactly one correct; multiple_choice at least one', () => {
    const twoCorrect = quiz([
      choiceQuestion({
        options: [
          { label: 'a', isCorrect: true },
          { label: 'b', isCorrect: true },
        ],
      }),
    ]);
    expect(issuePaths(twoCorrect)).toContain('questions.0.options');

    const multiNone = quiz([
      choiceQuestion({
        type: 'multiple_choice',
        options: [
          { label: 'a', isCorrect: false },
          { label: 'b', isCorrect: false },
        ],
      }),
    ]);
    expect(issuePaths(multiNone)).toContain('questions.0.options');

    const multiTwo = quiz([
      choiceQuestion({
        type: 'multiple_choice',
        options: [
          { label: 'a', isCorrect: true },
          { label: 'b', isCorrect: true },
        ],
      }),
    ]);
    expect(quizAuthoringSchema.safeParse(multiTwo).success).toBe(true);
  });
});

describe('quizAuthoringSchema — points', () => {
  it('defaults a new question to one point', () => {
    expect(blankQuizQuestion().points).toBe(1);
  });

  it('accepts 0 and 100, rejects -1, 101, a blank and a fraction', () => {
    for (const points of [0, 100, '50']) {
      expect(
        quizAuthoringSchema.safeParse(
          quiz([choiceQuestion({ points: points as never })])
        ).success
      ).toBe(true);
    }
    for (const points of [-1, 101, '', 1.5]) {
      expect(
        issuePaths(quiz([choiceQuestion({ points: points as never })]))
      ).toContain('questions.0.points');
    }
  });
});

describe('quizAuthoringSchema — settings bounds', () => {
  it('time limit in minutes is 1..1440 or empty', () => {
    for (const minutes of [1, 1440, undefined, '']) {
      expect(
        quizAuthoringSchema.safeParse(
          quiz([choiceQuestion()], { timeLimitMinutes: minutes as never })
        ).success
      ).toBe(true);
    }
    for (const minutes of [0, 1441, 0.5]) {
      expect(
        issuePaths(
          quiz([choiceQuestion()], { timeLimitMinutes: minutes as never })
        )
      ).toContain('timeLimitMinutes');
    }
  });

  it('maxViolations is 1..50 and required', () => {
    for (const value of [1, 50]) {
      expect(
        quizAuthoringSchema.safeParse(
          quiz([choiceQuestion()], { maxViolations: value })
        ).success
      ).toBe(true);
    }
    for (const value of [0, 51, '']) {
      expect(
        issuePaths(quiz([choiceQuestion()], { maxViolations: value as never }))
      ).toContain('maxViolations');
    }
  });

  it('questionsPerAttempt is a positive whole number or empty', () => {
    expect(
      quizAuthoringSchema.safeParse(
        quiz([choiceQuestion(), choiceQuestion(), choiceQuestion()], {
          questionsPerAttempt: 3,
        })
      ).success
    ).toBe(true);
    expect(
      issuePaths(quiz([choiceQuestion()], { questionsPerAttempt: 0 }))
    ).toContain('questionsPerAttempt');
  });

  it('closing time must be after opening time', () => {
    expect(
      issuePaths(
        quiz([choiceQuestion()], {
          availableFrom: '2026-10-01T10:00',
          availableUntil: '2026-10-01T09:00',
        })
      )
    ).toContain('availableUntil');
  });

  it('both presets are valid settings blocks', () => {
    for (const preset of Object.values(QUIZ_SETTINGS_PRESETS)) {
      expect(
        quizAuthoringSchema.safeParse(quiz([choiceQuestion()], preset)).success
      ).toBe(true);
    }
  });
});

describe('W7 — client validation the server used to be the only one to enforce', () => {
  it('passing score and max attempts are whole numbers (blank = no limit)', () => {
    expect(
      issuePaths(quiz([choiceQuestion()], { passingScore: 70.5 }))
    ).toContain('passingScore');
    expect(
      issuePaths(quiz([choiceQuestion()], { maxAttempts: 1.5 }))
    ).toContain('maxAttempts');
    expect(
      quizAuthoringSchema.safeParse(
        quiz([choiceQuestion()], {
          passingScore: '' as never,
          maxAttempts: '' as never,
        })
      ).success
    ).toBe(true);
    expect(
      quizAuthoringSchema.safeParse(
        quiz([choiceQuestion()], { passingScore: 70, maxAttempts: 3 })
      ).success
    ).toBe(true);
  });

  it('the due date cannot be after the closing time', () => {
    expect(
      issuePaths(
        quiz([choiceQuestion()], {
          availableUntil: '2026-10-01T10:00',
          dueAt: '2026-10-01T11:00',
        })
      )
    ).toContain('dueAt');
    expect(
      quizAuthoringSchema.safeParse(
        quiz([choiceQuestion()], {
          availableUntil: '2026-10-01T10:00',
          dueAt: '2026-10-01T10:00',
        })
      ).success
    ).toBe(true);
  });

  it('questions per attempt cannot exceed the number of questions', () => {
    expect(
      issuePaths(quiz([choiceQuestion()], { questionsPerAttempt: 2 }))
    ).toContain('questionsPerAttempt');
    expect(
      quizAuthoringSchema.safeParse(
        quiz([choiceQuestion(), choiceQuestion()], { questionsPerAttempt: 2 })
      ).success
    ).toBe(true);
  });
});

describe('W7 — one baseline for "customised" advanced settings', () => {
  it('a new quiz (Practice) and an untouched server-default quiz have nothing customised', () => {
    expect(customisedAdvancedSettings(defaultQuizSettingsFormValues())).toEqual(
      []
    );
    expect(customisedAdvancedSettings(QUIZ_SERVER_DEFAULT_SETTINGS)).toEqual(
      []
    );
  });

  it('Practice deliberately differs from the server defaults only on review', () => {
    const differing = QUIZ_ADVANCED_SETTING_KEYS.filter(
      (key) =>
        String(QUIZ_SETTINGS_PRESETS.practice[key] ?? '') !==
        String(QUIZ_SERVER_DEFAULT_SETTINGS[key] ?? '')
    );
    expect(differing.sort()).toEqual(['showAnswers', 'showExplanations']);
  });

  it('the Exam preset and an integrity change count as customised', () => {
    expect(customisedAdvancedSettings(QUIZ_SETTINGS_PRESETS.exam)).toEqual(
      expect.arrayContaining(['mode', 'integrityMode', 'requireFullscreen'])
    );
    expect(isAdvancedSettingCustomised('integrityMode', 'warn')).toBe(true);
    expect(isAdvancedSettingCustomised('integrityMode', 'off')).toBe(false);
    // Number inputs hand back strings; blanks are blanks.
    expect(isAdvancedSettingCustomised('maxViolations', '3')).toBe(false);
    expect(isAdvancedSettingCustomised('questionsPerAttempt', '')).toBe(false);
  });

  it('nothing required is hidden: essentials are not advanced keys', () => {
    for (const key of [
      'passingScore',
      'maxAttempts',
      'timeLimitMinutes',
      'requiredForCompletion',
    ]) {
      expect(QUIZ_ADVANCED_SETTING_KEYS as readonly string[]).not.toContain(
        key
      );
    }
  });
});
