/**
 * W7 — the quiz authoring form's "Advanced options" disclosure.
 *
 * Essentials are visible by default; everything else sits behind a real
 * disclosure button (`aria-expanded` + `aria-controls`, keyboard
 * operable) whose panel stays mounted. It opens by itself when an edited
 * quiz customises an advanced setting, and when a client OR server
 * validation error lands on a hidden field. Clearing a value on edit
 * sends `null` (the server's "clear"), not `undefined` ("keep").
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { ApiError } from '@/services/api/api-error';
import { quizService } from '@features/learning';
import type { QuizAuthoring, QuizSettingsAuthoring } from '@types';
import { QuizAuthoringForm } from './QuizAuthoringForm';

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organization: { id: 'org-1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const SERVER_DEFAULTS: QuizSettingsAuthoring = {
  mode: 'practice',
  timeLimitSeconds: null,
  availableFrom: null,
  availableUntil: null,
  dueAt: null,
  latePolicy: 'accept_flagged',
  gradingPolicy: 'highest',
  shuffleQuestions: false,
  shuffleOptions: false,
  questionsPerAttempt: null,
  layout: 'all_questions',
  showScore: 'immediately',
  showAnswers: 'never',
  showExplanations: false,
  integrityMode: 'off',
  maxViolations: 3,
  requireFullscreen: false,
  requiredToProgress: false,
  requiredForCompletion: false,
  hideTimer: false,
};

function question(id: string, prompt: string) {
  return {
    id,
    quizId: 'quiz-1',
    prompt,
    type: 'single_choice' as const,
    order: 0,
    options: [
      { id: `${id}-a`, label: 'A', isCorrect: true },
      { id: `${id}-b`, label: 'B', isCorrect: false },
    ],
    points: 1,
  };
}

function storedQuiz(overrides: Partial<QuizAuthoring> = {}): QuizAuthoring {
  return {
    id: 'quiz-1',
    courseId: 'course-1',
    title: 'Stored quiz',
    description: 'About this quiz',
    status: 'published',
    questionCount: 1,
    passingScore: 70,
    maxAttempts: 3,
    settings: SERVER_DEFAULTS,
    questions: [question('q1', 'First?')],
    ...overrides,
  } as QuizAuthoring;
}

let createQuiz: MockInstance<typeof quizService.createQuiz>;
let updateQuiz: MockInstance<typeof quizService.updateQuiz>;

beforeEach(() => {
  createQuiz = vi
    .spyOn(quizService, 'createQuiz')
    .mockResolvedValue(storedQuiz({ id: 'quiz-new' }));
  updateQuiz = vi
    .spyOn(quizService, 'updateQuiz')
    .mockResolvedValue(storedQuiz());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderForm(quiz?: QuizAuthoring, onSaved = vi.fn()) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <MemoryRouter>
            <QuizAuthoringForm
              courseId="course-1"
              quiz={quiz}
              lessons={[]}
              onSaved={onSaved}
              onCancel={vi.fn()}
            />
          </MemoryRouter>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { onSaved };
}

const toggle = () => screen.getByRole('button', { name: /Advanced options/ });
const panelOf = (button: HTMLElement) =>
  document.getElementById(button.getAttribute('aria-controls') ?? '')!;

async function fillMinimalQuestion(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'New quiz');
  await user.type(screen.getByRole('textbox', { name: 'Prompt' }), '2 + 2?');
  await user.type(screen.getByPlaceholderText('Option 1'), '4');
  await user.type(screen.getByPlaceholderText('Option 2'), '5');
  await user.click(screen.getAllByRole('radio', { name: 'Correct' })[0]);
}

// These tests type a whole quiz; give them room on a loaded CI runner.
describe(
  'Quiz authoring — essentials and the Advanced options disclosure',
  { timeout: 20_000 },
  () => {
    it('shows the essentials and keeps the advanced settings collapsed (but mounted) for a new quiz', () => {
      renderForm();
      const button = toggle();
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      const panel = panelOf(button);
      expect(panel).toBeTruthy();
      expect(panel.hidden).toBe(true);
      expect(panel.getAttribute('role')).toBe('region');

      // Essentials, always visible.
      expect(
        screen.getByRole('spinbutton', { name: /Passing score/ })
      ).toBeTruthy();
      expect(
        screen.getByRole('spinbutton', { name: /Max attempts/ })
      ).toBeTruthy();
      expect(
        screen.getByRole('spinbutton', { name: /Time limit/ })
      ).toBeTruthy();
      expect(
        screen.getByRole('switch', { name: /Required for course completion/i })
      ).toBeTruthy();
      // Advanced: in the DOM, not in the accessibility tree.
      expect(
        screen.queryByRole('combobox', { name: 'Integrity mode' })
      ).toBeNull();
      expect(panel.textContent).toContain('Integrity mode');
    });

    it('opens and closes from the keyboard (Enter and Space) and by click', async () => {
      const user = userEvent.setup();
      renderForm();
      const button = toggle();
      button.focus();
      await user.keyboard('{Enter}');
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(panelOf(button).hidden).toBe(false);
      expect(
        screen.getByRole('combobox', { name: 'Integrity mode' })
      ).toBeTruthy();
      await user.keyboard(' ');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      await user.click(button);
      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('opens by itself when an edited quiz customises an advanced setting', () => {
      renderForm(
        storedQuiz({
          settings: {
            ...SERVER_DEFAULTS,
            integrityMode: 'warn',
            requireFullscreen: true,
          },
        })
      );
      const button = toggle();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(button.textContent).toMatch(/2 customised/);
      expect(
        screen.getByRole('switch', { name: 'Require full screen' })
      ).toBeTruthy();
    });

    it('stays collapsed for an untouched quiz on the SERVER defaults (no false "customised")', () => {
      renderForm(storedQuiz());
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().textContent).not.toMatch(/customised/);
    });

    it('opens by itself when a CLIENT validation error lands on a hidden field', async () => {
      const user = userEvent.setup();
      renderForm(
        storedQuiz({
          questionCount: 2,
          settings: { ...SERVER_DEFAULTS, questionsPerAttempt: 2 },
          questions: [question('q1', 'First?'), question('q2', 'Second?')],
        })
      );
      const button = toggle();
      expect(button.getAttribute('aria-expanded')).toBe('true'); // customised
      await user.click(button); // the author collapses it…
      expect(button.getAttribute('aria-expanded')).toBe('false');
      // …then removes a question, so 2 per attempt is now more than the quiz has.
      await user.click(
        screen.getAllByRole('button', { name: 'Remove Question' })[1]
      );
      await user.click(screen.getByRole('button', { name: 'Save Quiz' }));

      await waitFor(() =>
        expect(button.getAttribute('aria-expanded')).toBe('true')
      );
      expect(
        screen.getByText(
          'This is more than the number of questions in the quiz.'
        )
      ).toBeTruthy();
      expect(updateQuiz).not.toHaveBeenCalled();
    });

    it('opens by itself when a SERVER validation error names a hidden field', async () => {
      const user = userEvent.setup();
      createQuiz.mockRejectedValueOnce(
        new ApiError({
          kind: 'validation',
          messageKey: 'errors.quiz.dueAfterWindow',
          status: 400,
          violations: [
            { field: 'dueAt', messageKey: 'errors.quiz.dueAfterWindow' },
          ],
          retryable: false,
        })
      );
      renderForm();
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      await fillMinimalQuestion(user);
      await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
      await waitFor(() => expect(createQuiz).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
      );
    });

    it('a new quiz is created with every setting, blanks omitted', async () => {
      const user = userEvent.setup();
      const { onSaved } = renderForm();
      await fillMinimalQuestion(user);
      await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const payload = createQuiz.mock.calls[0][1] as unknown as Record<
        string,
        unknown
      >;
      expect(payload).toMatchObject({
        title: 'New quiz',
        showAnswers: 'immediately', // the Practice preset — what the form creates
        integrityMode: 'off',
      });
      expect(payload.passingScore).toBeUndefined();
      expect(payload.maxAttempts).toBeUndefined();
      expect(payload.description).toBeUndefined();
    });

    it('clearing passing score, max attempts and description on EDIT sends null (clear), not undefined (keep)', async () => {
      const user = userEvent.setup();
      const { onSaved } = renderForm(storedQuiz());
      await user.clear(
        screen.getByRole('spinbutton', { name: /Passing score/ })
      );
      await user.clear(
        screen.getByRole('spinbutton', { name: /Max attempts/ })
      );
      await user.clear(screen.getByRole('textbox', { name: 'Description' }));
      await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const payload = updateQuiz.mock.calls[0][2] as unknown as Record<
        string,
        unknown
      >;
      expect(payload.passingScore).toBeNull();
      expect(payload.maxAttempts).toBeNull();
      expect(payload.description).toBeNull();
    });
  }
);
