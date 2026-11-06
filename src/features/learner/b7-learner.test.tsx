/**
 * B7 (UX audit) — the learner area says what is true, once.
 *
 * - V01/V04/V05: a server fault is not "check your connection"; the lesson
 *   500 offers Try again; an activity that can't be opened doesn't.
 * - V06: quiz results name the chosen and the correct options; "1 of 1
 *   point", not "points".
 * - V07: a multiple-choice question says "Select all that apply" and its
 *   boxes are square.
 * - V09: the attempt strip sticks below the academy's header; a 500 on
 *   autosave is not "Offline".
 * - V10/V11/V19: the checkout proof form counts against the real limits,
 *   refuses instead of cutting, puts server refusals on their fields, and
 *   is never greyed without a reason.
 * - V14: removing a device from the device-limit dialog asks first.
 * - V19: Start Quiz pressed without the acknowledgement says why.
 * - V21: the white-label strings changed here never say "Atlas".
 * - V25: a refused `name` lands on the right field with the limit.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createApiError } from '@api';
import { createI18nInstance } from '@/localization/i18n';
import { TRANSLATION_RESOURCES } from '@/localization/resources';
import type {
  LearnerDeviceResponse,
  Quiz,
  QuizAttemptResults,
  QuizSessionQuestion,
} from '@types';

const confirm = vi.fn();
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));
vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({
    academyId: 'aca-1',
    locale: 'en',
    isRtl: false,
    buildHref: (path: string) => path,
  }),
}));

const { PlayerFailureState } = await import('./components/PlayerFailureState');
const { LessonNeedsConnection } =
  await import('./components/LessonNeedsConnection');
const { classifyPlayerFailure } = await import('./utils/player-failure.utils');
const { QuizResultsView } = await import('./components/QuizResultsView');
const { QuizQuestionCard } = await import('./components/QuizQuestionCard');
const { QuizAttemptHeader } = await import('./components/QuizAttemptHeader');
const { QuizIntroCard } = await import('./components/QuizIntroCard');
const { DeviceLimitDialog } = await import('./components/DeviceLimitDialog');
const { CheckoutProofForm } = await import('./components/CheckoutProofForm');
const { relabelNameViolations } =
  await import('@features/profile/components/ProfilePersonalSection');

function renderWith(node: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>{node}</MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document
    .querySelectorAll('input[type="file"]')
    .forEach((input) => input.remove());
});

describe('V01/V04/V05 — failures that blame the right thing', () => {
  it('a 500 on the lesson says the server failed — not the connection — and offers Try again', () => {
    const onRetry = vi.fn();
    const failure = classifyPlayerFailure(
      createApiError('server', { status: 500 })
    );
    renderWith(
      <PlayerFailureState failure={failure} onRetry={onRetry} courseId="c-1" />
    );
    expect(
      screen.getByText("Something went wrong on the academy's side")
    ).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/check your connection/i);
    expect(document.body.textContent).not.toMatch(/needs a connection/i);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('only a real network failure talks about the connection', () => {
    const failure = classifyPlayerFailure(createApiError('network'));
    expect(failure.kind).toBe('network');
    renderWith(<PlayerFailureState failure={failure} onRetry={vi.fn()} />);
    expect(screen.getByText('We could not reach the academy')).toBeTruthy();
  });

  it('an activity that cannot be opened offers the outline, not a useless Try again', () => {
    renderWith(
      <PlayerFailureState
        failure={{ kind: 'unavailable' }}
        onRetry={vi.fn()}
        courseId="c-1"
      />
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'See the course outline' })
    ).toBeTruthy();
  });

  it('"needs a connection" offers Try again when the browser is online', () => {
    const onRetry = vi.fn();
    renderWith(<LessonNeedsConnection onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('a 500 on autosave is "not saved", never "Offline"', () => {
    const header = (saveState: 'failed' | 'offline') =>
      renderWith(
        <QuizAttemptHeader
          remainingSeconds={null}
          hideTimer={false}
          answered={1}
          total={2}
          saveState={saveState}
          lastSavedAt={null}
          announcement={null}
        />
      );
    header('failed');
    expect(screen.getByTestId('quiz-save-state').textContent).toBe(
      'Not saved — retrying'
    );
    cleanup();
    header('offline');
    expect(screen.getByTestId('quiz-save-state').textContent).toBe(
      'Offline — will retry'
    );
  });

  it('V09 — the attempt strip sticks below the academy theme header', () => {
    renderWith(
      <QuizAttemptHeader
        remainingSeconds={60}
        hideTimer={false}
        answered={0}
        total={1}
        saveState="idle"
        lastSavedAt={null}
        announcement={null}
      />
    );
    const strip = screen.getByTestId('quiz-attempt-header');
    expect(strip.className).toContain('sticky');
    expect(strip.className).not.toContain('top-0');
    expect(strip.getAttribute('style')).toContain('--t1-header-height');
  });
});

const QUESTION: QuizSessionQuestion = {
  id: 'q1',
  type: 'multiple_choice',
  prompt: 'Which are planets?',
  points: 1,
  options: [
    { id: 'o1', label: 'Mars' },
    { id: 'o2', label: 'Moon' },
    { id: 'o3', label: 'Venus' },
  ],
};

const QUIZ = {
  id: 'quiz-1',
  courseId: 'c-1',
  title: 'Planets',
  status: 'published',
  questionCount: 1,
  questions: [
    {
      id: 'q1',
      quizId: 'quiz-1',
      prompt: 'Which are planets?',
      type: 'multiple_choice',
      order: 1,
      points: 1,
      options: QUESTION.options,
    },
  ],
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
    showAnswers: 'immediately',
    integrityMode: 'off',
    maxViolations: 3,
    requireFullscreen: false,
    hideTimer: false,
  },
} as unknown as Quiz;

const RESULTS: QuizAttemptResults = {
  attemptId: 'a1',
  quizId: 'quiz-1',
  status: 'failed',
  attemptNumber: 1,
  submittedAt: '2026-11-01T10:00:00.000Z',
  autoSubmitted: false,
  autoSubmittedReason: null,
  isLate: false,
  gradingStatus: 'graded',
  disclosure: { score: true, answers: true, explanations: false },
  score: 0,
  passed: false,
  pointsEarned: 0,
  pointsTotal: 1,
  passingScore: 50,
  questions: [
    {
      questionId: 'q1',
      prompt: 'Which are planets?',
      type: 'multiple_choice',
      points: 1,
      answered: true,
      correct: false,
      pointsAwarded: 0,
      yourAnswer: { questionId: 'q1', selectedOptionIds: ['o2'] },
      correctOptionIds: ['o1', 'o3'],
      needsManualGrading: false,
    },
  ],
  canRetry: false,
  attemptsUsed: 1,
  attemptsAllowed: 1,
};

describe('V06 — quiz results say what was chosen and what was right', () => {
  it('names the chosen and the correct options by label', () => {
    renderWith(<QuizResultsView quiz={QUIZ} results={RESULTS} attempts={[]} />);
    expect(screen.getByTestId('quiz-result-chosen').textContent).toBe('Moon');
    expect(screen.getByTestId('quiz-result-correct').textContent).toBe(
      'Mars · Venus'
    );
    expect(document.body.textContent).toContain('Correct answers:');
    expect(document.body.textContent).not.toContain('option selected');
  });

  it('"0 of 1 point", in the singular', () => {
    renderWith(<QuizResultsView quiz={QUIZ} results={RESULTS} attempts={[]} />);
    expect(document.body.textContent).toContain('0 of 1 point');
    expect(document.body.textContent).not.toContain('of 1 points');
  });

  it('falls back to a count only when the quiz has no labels', () => {
    renderWith(
      <QuizResultsView
        quiz={{ ...QUIZ, questions: undefined }}
        results={RESULTS}
        attempts={[]}
      />
    );
    expect(document.body.textContent).toContain('1 option selected');
  });
});

describe('V07 — multiple choice says "Select all that apply"', () => {
  it('states it before the options, with square boxes', () => {
    renderWith(
      <QuizQuestionCard
        question={QUESTION}
        index={0}
        total={1}
        answer={undefined}
        flagged={false}
        onChange={vi.fn()}
        onToggleFlag={vi.fn()}
      />
    );
    expect(screen.getByTestId('quiz-select-all-hint').textContent).toBe(
      'Select all that apply.'
    );
    const box = screen.getAllByRole('checkbox')[0];
    expect(box.className).toContain('rounded-[0.1875rem]');
  });

  it('a single-choice question has no such hint; Arabic "Flag" reads naturally', () => {
    renderWith(
      <QuizQuestionCard
        question={{ ...QUESTION, type: 'single_choice' }}
        index={0}
        total={1}
        answer={undefined}
        flagged={false}
        onChange={vi.fn()}
        onToggleFlag={vi.fn()}
      />,
      'ar'
    );
    expect(screen.queryByTestId('quiz-select-all-hint')).toBeNull();
    expect(screen.getByRole('button', { name: 'وضع علامة' })).toBeTruthy();
  });
});

describe('V19 — Start Quiz is never greyed without a reason', () => {
  it('pressed without the acknowledgement, it says what is missing', () => {
    const onStart = vi.fn();
    renderWith(
      <QuizIntroCard
        quiz={{
          ...QUIZ,
          settings: { ...QUIZ.settings, integrityMode: 'monitor' },
        }}
        attempts={[]}
        resuming={false}
        canStart
        onStart={onStart}
        isStarting={false}
      />
    );
    const start = screen.getByTestId('quiz-start') as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByTestId('quiz-ack-missing').textContent).toMatch(
      /Tick the box above/
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('V14 — the device-limit dialog asks before removing', () => {
  const devices: LearnerDeviceResponse[] = [
    {
      id: 'd-1',
      label: 'Chrome on Linux',
      lastSeenAt: '2026-11-01T10:00:00.000Z',
      createdAt: '2026-09-01T10:00:00.000Z',
      current: false,
    },
    {
      id: 'd-2',
      label: 'Chrome on Linux',
      lastSeenAt: '2026-11-05T10:00:00.000Z',
      createdAt: '2026-10-01T10:00:00.000Z',
      current: true,
    },
  ];

  function open(onRemove = vi.fn(), language: 'en' | 'ar' = 'en') {
    renderWith(
      <DeviceLimitDialog
        open
        onOpenChange={vi.fn()}
        devices={devices}
        maxDevices={2}
        onRemove={onRemove}
      />,
      language
    );
    return onRemove;
  }

  it('Remove asks with the Devices page copy; cancelling removes nothing', async () => {
    confirm.mockResolvedValue(false);
    const onRemove = open();
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    await Promise.resolve();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'learning:learnerDashboard.devices.confirmRemove.title',
        descriptionKey:
          'learning:learnerDashboard.devices.confirmRemove.description',
      })
    );
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('confirmed, it removes that device', async () => {
    confirm.mockResolvedValue(true);
    const onRemove = open();
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    await vi.waitFor(() => expect(onRemove).toHaveBeenCalledWith('d-1'));
  });

  it('tells two identical names apart and marks this device', () => {
    open();
    expect(screen.getByText('This device')).toBeTruthy();
    expect(screen.getAllByText(/^Added /).length).toBe(2);
  });

  it('the close button is named in Arabic on Arabic pages', () => {
    open(vi.fn(), 'ar');
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('V10/V11/V19 — the checkout proof form', () => {
  function chooseFile(file: File) {
    fireEvent.click(screen.getByTestId('checkout-proof-choose'));
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]');
    fireEvent.change(input!, { target: { files: [file] } });
  }

  it('counts against the real limits and refuses instead of cutting', () => {
    const onSubmit = vi.fn();
    renderWith(
      <CheckoutProofForm isPending={false} error={null} onSubmit={onSubmit} />
    );
    const note = screen.getByTestId('checkout-proof-note');
    expect(note.getAttribute('maxlength')).toBeNull();
    fireEvent.change(note, { target: { value: 'x'.repeat(600) } });
    expect(screen.getByTestId('checkout-proof-note-count').textContent).toBe(
      '600 / 500 characters'
    );
    const reference = screen.getByTestId('checkout-reference');
    expect(reference.getAttribute('maxlength')).toBeNull();
    fireEvent.change(reference, { target: { value: 'R'.repeat(130) } });
    expect(screen.getByTestId('checkout-reference-count').textContent).toBe(
      '130 / 120 characters'
    );
    chooseFile(new File(['x'], 'r.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('checkout-submit-proof'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('checkout-proof-note-error').textContent).toMatch(
      /500/
    );
    expect(screen.getByTestId('checkout-reference-error').textContent).toMatch(
      /120/
    );
  });

  it('marks the file required and says to choose one, instead of greying Submit', () => {
    const onSubmit = vi.fn();
    renderWith(
      <CheckoutProofForm isPending={false} error={null} onSubmit={onSubmit} />
    );
    expect(document.body.textContent).toContain('Proof of payment*');
    const submit = screen.getByTestId(
      'checkout-submit-proof'
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(screen.getByTestId('checkout-proof-file-error').textContent).toMatch(
      /Choose the receipt file first/
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['note', 'checkout-proof-note-error'],
    ['payerReference', 'checkout-reference-error'],
    ['fileData', 'checkout-proof-file-error'],
  ])('a server refusal of `%s` lands on that field, no alert', (field, id) => {
    renderWith(
      <CheckoutProofForm
        isPending={false}
        error={createApiError('validation', {
          status: 400,
          violations: [{ field, messageKey: 'validation:maxLength' }],
        })}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('anything else is one alert with the real reason (an expired order)', () => {
    renderWith(
      <CheckoutProofForm
        isPending={false}
        error={createApiError('conflict', {
          status: 409,
          messageKey: 'errors.courseOrder.expired',
        })}
        onSubmit={vi.fn()}
      />
    );
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("Your proof wasn't submitted");
    expect(alert.textContent).toContain('This order has expired');
    expect(alert.textContent).not.toContain('changed elsewhere');
  });

  it('uses the app’s own file button, in Arabic too', () => {
    renderWith(
      <CheckoutProofForm isPending={false} error={null} onSubmit={vi.fn()} />,
      'ar'
    );
    expect(screen.getByTestId('checkout-proof-choose').textContent).toContain(
      'اختيار ملف'
    );
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('V21 — white-label copy on the academy host', () => {
  const read = (language: 'en' | 'ar', path: string): string => {
    let node: unknown = TRANSLATION_RESOURCES[language];
    for (const part of path.split('.')) {
      node = (node as Record<string, unknown>)[part];
    }
    return String(node);
  };
  const CHANGED = [
    'errors.network.description',
    'errors.boundary.description',
    'errors.boundary.updatedTitle',
    'errors.boundary.updatedDescription',
    'errors.boundary.offlineDescription',
    'errors.boundary.persistentDescription',
    'common.states.offline.description',
    'learning.quiz.integrity.disclosureHonest',
    'learning.learnerDashboard.purchases.refund.dialog.moneyNote',
    'learning.player.protection.tier.normal',
    'learning.player.protection.tier.premium',
    'learning.player.failure.server.description',
  ];

  it.each(CHANGED)('%s never says "Atlas" (EN) or "أطلس" (AR)', (path) => {
    expect(read('en', path)).not.toMatch(/Atlas/);
    expect(read('ar', path)).not.toMatch(/أطلس/);
  });

  it('no jargon, and "My learning"', () => {
    expect(read('en', 'learning.player.protection.tier.normal')).not.toMatch(
      /Self-managed/
    );
    expect(read('en', 'publicWebsite.header.myLearn')).toBe('My learning');
    expect(read('en', 'website.chrome.myLearn')).toBe('My learning');
  });
});

describe('V25 — a refused name lands on the right field with the limit', () => {
  it('maps `name` onto the longer of the two fields, with 100', () => {
    const relabelled = relabelNameViolations(
      createApiError('validation', {
        status: 400,
        violations: [{ field: 'name', messageKey: 'errors.validation.field' }],
      }),
      { firstName: 'Al', lastName: 'Montgomery-Smith' }
    );
    expect(relabelled?.violations?.[0]).toEqual(
      expect.objectContaining({
        field: 'lastName',
        messageKey: 'profile:errors.nameTooLong',
        values: expect.objectContaining({ count: 100 }),
      })
    );
  });

  it('keeps a server length message that carries its number', () => {
    const error = createApiError('validation', {
      status: 400,
      violations: [
        {
          field: 'name',
          messageKey: 'validation:maxLength',
          values: { count: 100 },
        },
      ],
    });
    expect(
      relabelNameViolations(error, { firstName: 'a', lastName: 'b' })
    ).toBe(error);
  });

  it('leaves other failures untouched', () => {
    const error = createApiError('server', { status: 500 });
    expect(
      relabelNameViolations(error, { firstName: 'a', lastName: 'b' })
    ).toBe(error);
  });
});
