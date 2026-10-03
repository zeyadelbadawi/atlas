/**
 * Quiz authoring form — value conversions (W7), shared by
 * `QuizAuthoringForm` and its tests: the blank "create" values, a stored
 * quiz → form values, and form values → the create/update payload.
 */
import {
  blankQuizQuestion,
  defaultQuizSettingsFormValues,
  type QuizAuthoringFormData,
  type QuizQuestionFormData,
} from '@features/learning';
import type {
  CreateQuizPayload,
  QuizAuthoring,
  QuizQuestionInput,
  QuizStatus,
  UpdateQuizPayload,
} from '@types';
import {
  quizSettingsFormToPayload,
  quizSettingsToFormValues,
} from './QuizSettingsEditor';

/**
 * The blank quiz a "create" starts from. A FUNCTION, not a module-scope
 * constant: `blankQuizQuestion` comes from `@features/learning`, which can
 * reach this module through its own barrel — evaluating it at import time
 * inside that cycle read it as `undefined` (see the history on
 * `CourseQuizEditorPage`). A fresh object per form is right anyway.
 */
export function emptyQuizValues(
  status: QuizStatus = 'draft'
): QuizAuthoringFormData {
  return {
    title: '',
    description: '',
    status,
    passingScore: undefined,
    maxAttempts: undefined,
    ...defaultQuizSettingsFormValues(),
    questions: [blankQuizQuestion()],
  };
}

/** A stored quiz → the form's values. */
export function quizToFormValues(quiz: QuizAuthoring): QuizAuthoringFormData {
  return {
    title: quiz.title,
    description: quiz.description ?? '',
    status: quiz.status,
    passingScore: quiz.passingScore ?? undefined,
    maxAttempts: quiz.maxAttempts ?? undefined,
    ...quizSettingsToFormValues(quiz.settings),
    questions: quiz.questions.map((question) => ({
      prompt: question.prompt,
      type: question.type,
      options: question.options.map((option) => ({
        label: option.label,
        isCorrect: option.isCorrect,
      })),
      points: question.points,
      explanation: question.explanation ?? '',
      relatedLessonId: question.relatedLessonId ?? '',
      acceptedAnswers: (question.acceptedAnswers ?? []).map((value) => ({
        value,
      })),
    })),
  };
}

/**
 * One form question → the `QuizQuestionInput` the server accepts. Text
 * types never carry options; only `short_answer` carries accepted
 * answers; blank explanation / related lesson are omitted.
 */
function toQuestionInput(question: QuizQuestionFormData): QuizQuestionInput {
  const isTextType =
    question.type === 'short_answer' || question.type === 'essay';
  return {
    prompt: question.prompt,
    type: question.type,
    options: isTextType
      ? []
      : question.options.map((option) => ({
          label: option.label,
          isCorrect: option.isCorrect,
        })),
    points: question.points,
    explanation: question.explanation?.trim() || undefined,
    relatedLessonId: question.relatedLessonId || undefined,
    acceptedAnswers:
      question.type === 'short_answer'
        ? (question.acceptedAnswers ?? []).map((answer) => answer.value.trim())
        : undefined,
  };
}

/**
 * Form values → the create/update payload. On edit, blanks become `null`
 * (clear); on create they are simply omitted (the column default is none).
 */
export function toQuizPayload(
  data: QuizAuthoringFormData,
  mode: 'create'
): CreateQuizPayload;
export function toQuizPayload(
  data: QuizAuthoringFormData,
  mode: 'edit'
): UpdateQuizPayload;
export function toQuizPayload(
  data: QuizAuthoringFormData,
  mode: 'create' | 'edit'
): CreateQuizPayload | UpdateQuizPayload {
  const blank = mode === 'edit' ? null : undefined;
  return {
    title: data.title,
    description: data.description?.trim() ? data.description : blank,
    status: data.status,
    passingScore: data.passingScore ?? blank,
    maxAttempts: data.maxAttempts ?? blank,
    ...quizSettingsFormToPayload(data),
    questions: data.questions.map(toQuestionInput),
  } as CreateQuizPayload | UpdateQuizPayload;
}
