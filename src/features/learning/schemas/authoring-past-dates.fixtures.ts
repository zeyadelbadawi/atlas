/** A valid quiz form value for schema tests (B3, V21). */
import {
  blankQuizQuestion,
  defaultQuizSettingsFormValues,
  type QuizAuthoringFormData,
} from './quiz-authoring.schemas';

export function emptyQuizForTest(
  overrides: Partial<QuizAuthoringFormData> = {}
): QuizAuthoringFormData {
  const question = blankQuizQuestion();
  return {
    title: 'Quiz',
    description: '',
    status: 'draft',
    passingScore: undefined,
    maxAttempts: undefined,
    ...defaultQuizSettingsFormValues(),
    questions: [
      {
        ...question,
        prompt: '2 + 2?',
        options: [
          { label: '4', isCorrect: true },
          { label: '5', isCorrect: false },
        ],
      },
    ],
    ...overrides,
  };
}
