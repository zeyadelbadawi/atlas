/**
 * Quiz authoring validation schema (Phase 4).
 *
 * Mirrors the shape the scoring engine actually depends on
 * (`quiz-scoring.util.ts`, backend) and the server's own
 * `QuizzesService.assertValidQuestions` re-check: `true_false` needs
 * exactly 2 options with exactly 1 correct; `single_choice` needs exactly
 * 1 correct; `multiple_choice` needs at least 1 correct. This client-side
 * check exists purely for a fast, inline error — the server re-enforces it
 * regardless, per the "never trust client-side alone" rule already
 * established for `CreateAssignmentSubmissionDto`.
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

/** Turns a blank/undefined numeric field into `undefined` instead of letting `z.coerce.number()` read `''` as `0`. */
function optionalNumber(min: number, max: number) {
  return z.preprocess(
    (value) => (value === '' || value === undefined || value === null ? undefined : value),
    z.coerce.number().min(min, 'validation:min').max(max, 'validation:max').optional()
  );
}

const quizQuestionOptionSchema = z.object({
  label: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_QUIZ_OPTION_LABEL_LENGTH, 'validation:maxLength'),
  isCorrect: z.boolean(),
});

const quizQuestionSchema = z
  .object({
    prompt: z
      .string()
      .min(1, 'validation:required')
      .max(MAX_QUIZ_QUESTION_PROMPT_LENGTH, 'validation:maxLength'),
    type: z.enum(['single_choice', 'multiple_choice', 'true_false']),
    options: z
      .array(quizQuestionOptionSchema)
      .max(MAX_QUIZ_OPTIONS_PER_QUESTION, 'validation:max'),
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;

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

export const quizAuthoringSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_QUIZ_TITLE_LENGTH, 'validation:maxLength'),
  description: z
    .string()
    .max(MAX_QUIZ_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  status: z.enum(['draft', 'published']),
  passingScore: optionalNumber(0, 100),
  maxAttempts: optionalNumber(1, 1000),
  questions: z
    .array(quizQuestionSchema)
    .min(MIN_QUIZ_QUESTIONS, 'validation:min')
    .max(MAX_QUIZ_QUESTIONS, 'validation:max'),
});

export type QuizAuthoringFormData = z.infer<typeof quizAuthoringSchema>;

/** A single blank option, for "add option". */
export function blankQuizOption(): QuizAuthoringFormData['questions'][number]['options'][number] {
  return { label: '', isCorrect: false };
}

/** A single blank question, for "add question" — starts as single-choice with two blank options. */
export function blankQuizQuestion(): QuizAuthoringFormData['questions'][number] {
  return {
    prompt: '',
    type: 'single_choice',
    options: [blankQuizOption(), blankQuizOption()],
  };
}
