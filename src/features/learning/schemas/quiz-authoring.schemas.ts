/**
 * Quiz authoring validation schema (Phase 4, extended in P64 Phase 3).
 *
 * Mirrors the shape the scoring engine actually depends on
 * (`quiz-scoring.util.ts`, backend) and the server's own
 * `QuizzesService.assertValidQuestions` re-check: `true_false` needs
 * exactly 2 options with exactly 1 correct; `single_choice` needs exactly
 * 1 correct; `multiple_choice` needs at least 1 correct; `short_answer`
 * needs at least one accepted answer and no options; `essay` has neither
 * options nor accepted answers (a reviewer grades it by hand). This
 * client-side check exists purely for a fast, inline error — the server
 * re-enforces it regardless, per the "never trust client-side alone" rule
 * already established for `CreateAssignmentSubmissionDto`.
 *
 * P64 Phase 3 (§E.1) adds the quiz settings block. Every setting is a form
 * field with the server's bounds mirrored here: the time limit is edited
 * in MINUTES (1..1440, i.e. 60..86400 seconds), `maxViolations` is 1..50,
 * `questionsPerAttempt` is a positive integer or empty, and points are
 * 0..100 per question. Dates are `datetime-local` strings, converted to
 * ISO at the page boundary (same convention as `AssignmentFormDialog`).
 */
import { z } from 'zod';
import {
  MAX_QUIZ_DESCRIPTION_LENGTH,
  MAX_QUIZ_OPTION_LABEL_LENGTH,
  MAX_QUIZ_OPTIONS_PER_QUESTION,
  MAX_QUIZ_QUESTION_PROMPT_LENGTH,
  MAX_QUIZ_QUESTIONS,
  MAX_QUIZ_TITLE_LENGTH,
  MIN_QUIZ_QUESTIONS,
} from '../constants/learning.constants';

/* ---------- server bounds mirrored client-side ---------- */

/** `timeLimitSeconds` is 60..86400 on the server; the UI edits minutes. */
export const MIN_QUIZ_TIME_LIMIT_MINUTES = 1;
export const MAX_QUIZ_TIME_LIMIT_MINUTES = 1440;
export const MIN_QUIZ_MAX_VIOLATIONS = 1;
export const MAX_QUIZ_MAX_VIOLATIONS = 50;
export const MIN_QUIZ_QUESTION_POINTS = 0;
export const MAX_QUIZ_QUESTION_POINTS = 100;
export const MAX_QUIZ_EXPLANATION_LENGTH = 2000;
export const MAX_QUIZ_ACCEPTED_ANSWERS = 20;
export const MAX_QUIZ_ACCEPTED_ANSWER_LENGTH = 200;

/** The five question types the authoring form can produce. */
export const QUIZ_QUESTION_TYPES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
] as const;

export const QUIZ_MODES = ['practice', 'exam'] as const;
export const QUIZ_LAYOUTS = ['all_questions', 'one_per_page'] as const;
export const QUIZ_GRADING_POLICIES = [
  'highest',
  'latest',
  'first',
  'average',
] as const;
export const QUIZ_DISCLOSURES = [
  'immediately',
  'after_due',
  'after_attempts_exhausted',
  'never',
] as const;
export const QUIZ_INTEGRITY_MODES = [
  'off',
  'monitor',
  'warn',
  'strict',
] as const;
export const ASSESSMENT_LATE_POLICIES = ['block', 'accept_flagged'] as const;

/** Turns a blank/undefined numeric field into `undefined` instead of letting `z.coerce.number()` read `''` as `0`. */
function optionalNumber(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null ? undefined : value,
    z.coerce
      .number()
      .min(min, 'validation:min')
      .max(max, 'validation:max')
      .optional()
  );
}

/** Same blank handling, but the field must be a whole number when given. */
function optionalInteger(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null ? undefined : value,
    z.coerce
      .number()
      .int('validation:integer')
      .min(min, 'validation:min')
      .max(max, 'validation:max')
      .optional()
  );
}

/** A whole number that must be present — a blank reads as "required", never as `0`. */
function requiredInteger(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null ? undefined : value,
    z.coerce
      .number({
        required_error: 'validation:required',
        invalid_type_error: 'validation:required',
      })
      .int('validation:integer')
      .min(min, 'validation:min')
      .max(max, 'validation:max')
  );
}

const quizQuestionOptionSchema = z.object({
  label: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_QUIZ_OPTION_LABEL_LENGTH, 'validation:maxLength'),
  isCorrect: z.boolean(),
});

/**
 * One accepted answer for a `short_answer` question. Wrapped in an object
 * because React Hook Form's `useFieldArray` does not support flat arrays
 * of primitives; the page unwraps it to `string[]` for the payload.
 */
const quizAcceptedAnswerSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, 'validation:required')
    .max(MAX_QUIZ_ACCEPTED_ANSWER_LENGTH, 'validation:maxLength'),
});

const quizQuestionSchema = z
  .object({
    prompt: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_QUIZ_QUESTION_PROMPT_LENGTH, 'validation:maxLength'),
    type: z.enum(QUIZ_QUESTION_TYPES),
    options: z
      .array(quizQuestionOptionSchema)
      .max(MAX_QUIZ_OPTIONS_PER_QUESTION, 'validation:max'),
    points: requiredInteger(MIN_QUIZ_QUESTION_POINTS, MAX_QUIZ_QUESTION_POINTS),
    explanation: z
      .string()
      .max(MAX_QUIZ_EXPLANATION_LENGTH, 'validation:maxLength')
      .optional(),
    /** Empty string means "none"; the page drops it from the payload. */
    relatedLessonId: z.string().optional(),
    acceptedAnswers: z
      .array(quizAcceptedAnswerSchema)
      .max(MAX_QUIZ_ACCEPTED_ANSWERS, 'validation:max')
      .optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type === 'essay') {
      // Graded by a reviewer: nothing to validate beyond the prompt. Options,
      // if any slipped through a type switch, are dropped at payload time.
      return;
    }

    if (question.type === 'short_answer') {
      if (!question.acceptedAnswers || question.acceptedAnswers.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'course:quizAuthoring.validation.acceptedAnswerRequired',
          path: ['acceptedAnswers'],
        });
      }
      return;
    }

    const correctCount = question.options.filter(
      (option) => option.isCorrect
    ).length;

    if (question.type === 'true_false') {
      if (question.options.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'course:quizAuthoring.validation.trueFalseOptionCount',
          path: ['options'],
        });
      }
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'course:quizAuthoring.validation.exactlyOneCorrect',
          path: ['options'],
        });
      }
      return;
    }

    if (question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:quizAuthoring.validation.minTwoOptions',
        path: ['options'],
      });
    }

    if (question.type === 'single_choice' && correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:quizAuthoring.validation.exactlyOneCorrect',
        path: ['options'],
      });
    }

    if (question.type === 'multiple_choice' && correctCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:quizAuthoring.validation.atLeastOneCorrect',
        path: ['options'],
      });
    }
  });

/**
 * The settings block of the authoring form (P64 Phase 3 §E.1). Field names
 * match `QuizSettingsInput` except `timeLimitMinutes`, which the page turns
 * into `timeLimitSeconds`, and the three dates, which are `datetime-local`
 * strings until the page converts them to ISO.
 */
export const quizSettingsFormSchema = z.object({
  mode: z.enum(QUIZ_MODES),
  timeLimitMinutes: optionalInteger(
    MIN_QUIZ_TIME_LIMIT_MINUTES,
    MAX_QUIZ_TIME_LIMIT_MINUTES
  ),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  dueAt: z.string().optional(),
  latePolicy: z.enum(ASSESSMENT_LATE_POLICIES),
  gradingPolicy: z.enum(QUIZ_GRADING_POLICIES),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  questionsPerAttempt: optionalInteger(1, MAX_QUIZ_QUESTIONS),
  layout: z.enum(QUIZ_LAYOUTS),
  showScore: z.enum(QUIZ_DISCLOSURES),
  showAnswers: z.enum(QUIZ_DISCLOSURES),
  showExplanations: z.boolean(),
  integrityMode: z.enum(QUIZ_INTEGRITY_MODES),
  maxViolations: requiredInteger(
    MIN_QUIZ_MAX_VIOLATIONS,
    MAX_QUIZ_MAX_VIOLATIONS
  ),
  requireFullscreen: z.boolean(),
  requiredToProgress: z.boolean(),
  requiredForCompletion: z.boolean(),
  hideTimer: z.boolean(),
});

export type QuizSettingsFormData = z.infer<typeof quizSettingsFormSchema>;

export const quizAuthoringSchema = quizSettingsFormSchema
  .extend({
    title: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_QUIZ_TITLE_LENGTH, 'validation:maxLength'),
    description: z
      .string()
      .max(MAX_QUIZ_DESCRIPTION_LENGTH, 'validation:maxLength')
      .optional(),
    status: z.enum(['draft', 'published']),
    // W7 — whole numbers, like the server (`@IsInt`): a decimal used to pass
    // here and come back as an unexplained 400.
    passingScore: optionalInteger(0, 100),
    maxAttempts: optionalInteger(1, 1000),
    questions: z
      .array(quizQuestionSchema)
      .min(MIN_QUIZ_QUESTIONS, 'validation:min')
      .max(MAX_QUIZ_QUESTIONS, 'validation:max'),
  })
  .superRefine((quiz, ctx) => {
    // Both are local wall-clock strings in the same format, so string
    // comparison is chronological comparison.
    if (
      quiz.availableFrom &&
      quiz.availableUntil &&
      quiz.availableUntil <= quiz.availableFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:quizAuthoring.validation.availabilityOrder',
        path: ['availableUntil'],
      });
    }
    // W7 — the two cross-field rules the server enforces
    // (`assertValidQuizSettings`) that the form used to leave to a 400.
    if (quiz.dueAt && quiz.availableUntil && quiz.dueAt > quiz.availableUntil) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course:quizAuthoring.validation.dueAfterWindow',
        path: ['dueAt'],
      });
    }
    if (
      quiz.questionsPerAttempt !== undefined &&
      quiz.questionsPerAttempt > quiz.questions.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'course:quizAuthoring.validation.questionsPerAttemptExceedsCount',
        path: ['questionsPerAttempt'],
        params: { count: quiz.questions.length },
      });
    }
  });

export type QuizAuthoringFormData = z.infer<typeof quizAuthoringSchema>;

export type QuizQuestionFormData = QuizAuthoringFormData['questions'][number];

/* ---------- presets (P64 Phase 3 §E.1) ---------- */

export type QuizSettingsPresetName = 'practice' | 'exam';

/**
 * The two starting points an author picks from. A preset only FILLS the
 * fields; the author can change anything afterwards. A new quiz starts as
 * Practice, and the form always sends every setting, so Practice — not the
 * server's column defaults — is what a quiz created here gets.
 *
 * W7: Practice is NOT the server's defaults, and this comment used to say
 * it was. It deliberately differs on review: Practice shows answers and
 * explanations immediately (the point of practice), while a quiz created
 * WITHOUT settings (API, seed, pre-Phase-3 rows) gets
 * `QUIZ_SERVER_DEFAULT_SETTINGS` — answers never, no explanations. Both
 * are "untouched" baselines: see `isAdvancedSettingCustomised`.
 */
export const QUIZ_SETTINGS_PRESETS: Readonly<
  Record<QuizSettingsPresetName, QuizSettingsFormData>
> = {
  practice: {
    mode: 'practice',
    timeLimitMinutes: undefined,
    availableFrom: '',
    availableUntil: '',
    dueAt: '',
    latePolicy: 'accept_flagged',
    gradingPolicy: 'highest',
    shuffleQuestions: false,
    shuffleOptions: false,
    questionsPerAttempt: undefined,
    layout: 'all_questions',
    showScore: 'immediately',
    showAnswers: 'immediately',
    showExplanations: true,
    integrityMode: 'off',
    maxViolations: 3,
    requireFullscreen: false,
    requiredToProgress: false,
    requiredForCompletion: false,
    hideTimer: false,
  },
  exam: {
    mode: 'exam',
    timeLimitMinutes: 30,
    availableFrom: '',
    availableUntil: '',
    dueAt: '',
    latePolicy: 'accept_flagged',
    gradingPolicy: 'latest',
    shuffleQuestions: true,
    shuffleOptions: false,
    questionsPerAttempt: undefined,
    layout: 'one_per_page',
    showScore: 'after_due',
    showAnswers: 'never',
    showExplanations: false,
    integrityMode: 'warn',
    maxViolations: 3,
    requireFullscreen: true,
    requiredToProgress: false,
    requiredForCompletion: false,
    hideTimer: false,
  },
};

/** The settings keys a preset writes — the ones the preset chips compare against. */
export const QUIZ_SETTINGS_PRESET_KEYS = Object.keys(
  QUIZ_SETTINGS_PRESETS.practice
) as readonly (keyof QuizSettingsFormData)[];

/**
 * The server's column defaults (`schema.prisma`, model `Quiz`) — what a quiz
 * created without settings holds. Mirrored here only so the form can tell
 * an untouched legacy/API quiz from a customised one; the form itself never
 * sends these as a preset.
 */
export const QUIZ_SERVER_DEFAULT_SETTINGS: Readonly<QuizSettingsFormData> = {
  ...QUIZ_SETTINGS_PRESETS.practice,
  showAnswers: 'never',
  showExplanations: false,
};

/**
 * W7 — the settings the authoring form keeps behind "Advanced options"
 * (collapsed by default). Everything else — title, description, status,
 * the preset chooser, passing score, max attempts, time limit, "required
 * for completion" and the questions — is always visible. Nothing required
 * is hidden: every key here has a valid default (`maxViolations` included).
 */
export const QUIZ_ADVANCED_SETTING_KEYS = [
  'mode',
  'availableFrom',
  'availableUntil',
  'dueAt',
  'latePolicy',
  'hideTimer',
  'gradingPolicy',
  'questionsPerAttempt',
  'shuffleQuestions',
  'shuffleOptions',
  'layout',
  'showScore',
  'showAnswers',
  'showExplanations',
  'integrityMode',
  'maxViolations',
  'requireFullscreen',
  'requiredToProgress',
] as const satisfies readonly (keyof QuizSettingsFormData)[];

export type QuizAdvancedSettingKey =
  (typeof QUIZ_ADVANCED_SETTING_KEYS)[number];

/** Loose equality: number inputs hand back strings, blanks are `''`/`undefined`. */
export function sameQuizSetting(a: unknown, b: unknown): boolean {
  return String(a ?? '') === String(b ?? '');
}

/**
 * Whether one advanced setting differs from BOTH untouched baselines — the
 * Practice preset (what this form creates) and the server defaults (what
 * an API/legacy quiz holds). One rule for the "N customised" count and for
 * opening the panel when an existing quiz is edited.
 */
export function isAdvancedSettingCustomised(
  key: QuizAdvancedSettingKey,
  value: unknown
): boolean {
  return (
    !sameQuizSetting(value, QUIZ_SETTINGS_PRESETS.practice[key]) &&
    !sameQuizSetting(value, QUIZ_SERVER_DEFAULT_SETTINGS[key])
  );
}

/** The advanced settings that differ from the untouched baselines. */
export function customisedAdvancedSettings(
  values: Partial<Record<QuizAdvancedSettingKey, unknown>>
): QuizAdvancedSettingKey[] {
  return QUIZ_ADVANCED_SETTING_KEYS.filter((key) =>
    isAdvancedSettingCustomised(key, values[key])
  );
}

/** A fresh copy of the practice defaults, for "create". */
export function defaultQuizSettingsFormValues(): QuizSettingsFormData {
  return { ...QUIZ_SETTINGS_PRESETS.practice };
}

/** A single blank option, for "add option". */
export function blankQuizOption(): QuizQuestionFormData['options'][number] {
  return { label: '', isCorrect: false };
}

/** A single blank accepted answer, for "add accepted answer" on a short-answer question. */
export function blankQuizAcceptedAnswer(): NonNullable<
  QuizQuestionFormData['acceptedAnswers']
>[number] {
  return { value: '' };
}

/** A single blank question, for "add question" — starts as single-choice with two blank options and one point. */
export function blankQuizQuestion(): QuizQuestionFormData {
  return {
    prompt: '',
    type: 'single_choice',
    options: [blankQuizOption(), blankQuizOption()],
    points: 1,
    explanation: '',
    relatedLessonId: '',
    acceptedAnswers: [],
  };
}
