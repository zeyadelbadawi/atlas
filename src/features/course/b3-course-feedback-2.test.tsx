/**
 * B3 (UX audit) — more course forms, real EN/AR catalogues.
 *
 *   V01  the course image uploads to the media library; only the URL is
 *        kept; the 5 MB limit is named before anything is sent
 *   V06  Completion: a conflict reads in words, never "errors.conflict"
 *   V08  Completion: leaving with a changed rule asks first
 *   V11/V12  Completion: app messages, labelled in Arabic
 *   V04/V27  Quiz: an empty option says so under itself; options named
 *   V15  Quiz: removing a typed question asks first
 *   V21  Assignment: a new past due date is refused, an old one kept
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  Link,
  MemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { createQueryClient } from '@services/query/query-client';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import {
  NavigationBlockDialog,
  UnsavedChangesProvider,
} from '@features/unsaved-changes';
import { createApiError } from '@/services/api/api-error';
import { completionService } from '@features/learning';
import type { Assignment, CourseCompletionRule } from '@types';
import { CourseThumbnailField } from './components/CourseThumbnailField';
import { CourseCompletionSettingsCard } from './components/CourseCompletionSettingsCard';
import { QuizAuthoringForm } from './components/QuizAuthoringForm';
import { AssignmentFormDialog } from './components/AssignmentFormDialog';
import en from '@/localization/resources/en/course.json';

const media = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  /** The options the field passed to `useUploadMediaAsset`. */
  options: undefined as unknown,
}));

vi.mock('@features/media', () => ({
  useUploadMediaAsset: (options: { inlineErrors?: boolean }) => {
    media.options = options;
    return { mutateAsync: media.mutateAsync, isPending: false };
  },
  MediaLibraryDialog: () => null,
}));
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

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function Providers({
  children,
  language = 'en',
}: {
  readonly children: ReactNode;
  readonly language?: 'en' | 'ar';
}): JSX.Element {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={I18N[language]}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <UnsavedChangesProvider>
              <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
            </UnsavedChangesProvider>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function renderWith(ui: ReactNode, language: 'en' | 'ar' = 'en') {
  return render(
    <Providers language={language}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Providers>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  media.mutateAsync.mockReset();
});

/* ---------- V01 — the course image ---------- */

function pickFile(file: File) {
  // The picker appends its input to <body>; the newest is this test's.
  const inputs =
    document.body.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const input = inputs[inputs.length - 1];
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('Course image (V01)', () => {
  it('uploads to the media library and keeps only the returned URL', async () => {
    media.mutateAsync.mockResolvedValue({
      url: 'https://cdn.example/aca-1/cover.png',
    });
    const onChange = vi.fn();
    renderWith(
      <CourseThumbnailField id="thumb" academyId="aca-1" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Upload Thumbnail' }));
    pickFile(new File(['png-bytes'], 'cover.png', { type: 'image/png' }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        'https://cdn.example/aca-1/cover.png'
      )
    );
    expect(media.mutateAsync.mock.calls[0][0]).toMatchObject({
      academyId: 'aca-1',
      payload: { fileName: 'cover.png', mimeType: 'image/png' },
    });
    // The upload reports its own failure: no toast, reporter quiet.
    expect(media.options).toEqual({
      inlineErrors: true,
    });
    // Never a data URL on the course.
    expect(String(onChange.mock.calls[0][0])).not.toMatch(/^data:/);
  });

  it('names the 5 MB limit and uploads nothing for a bigger file', async () => {
    const onChange = vi.fn();
    renderWith(
      <CourseThumbnailField id="thumb" academyId="aca-1" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Upload Thumbnail' }));
    const big = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    pickFile(big);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/limit is .*5.*MB/);
    expect(media.mutateAsync).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a failed upload says so and keeps the previous image', async () => {
    media.mutateAsync.mockRejectedValue(
      createApiError('server', { status: 500 })
    );
    const onChange = vi.fn();
    renderWith(
      <CourseThumbnailField
        id="thumb"
        academyId="aca-1"
        value="https://cdn.example/old.png"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change Thumbnail' }));
    pickFile(new File(['png'], 'new.png', { type: 'image/png' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(en.create.thumbnailUploadFailed);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('thumb-preview').getAttribute('src')).toBe(
      'https://cdn.example/old.png'
    );
  });
});

/* ---------- V06 / V08 / V11 / V12 — completion settings ---------- */

const RULE: CourseCompletionRule = {
  courseId: 'c1',
  rule: {
    lessons: 'all',
    requiredQuizzes: false,
    requiredAssignments: false,
    minOverallScore: null,
  },
  certificatesEnabled: true,
  certificateMinScore: 50,
  certificateTemplateId: null,
  certificatesFeatureEnabled: true,
  quizzes: [],
  assignments: [],
  publishedLessons: 3,
};

describe('Completion settings', () => {
  let update: MockInstance<typeof completionService.updateCompletionRule>;
  beforeEach(() => {
    vi.spyOn(completionService, 'getCompletionRule').mockResolvedValue(RULE);
    update = vi.spyOn(completionService, 'updateCompletionRule');
  });

  async function changeCertificateScore(value: string) {
    const user = userEvent.setup();
    // The certificate minimum score is the last number field on the card.
    const score = (await screen.findAllByRole('spinbutton')).at(-1)!;
    await user.clear(score);
    await user.type(score, value);
    return { user, score };
  }

  it('a conflict reads in words, never as a raw key (V06)', async () => {
    update.mockRejectedValue(createApiError('conflict', { status: 409 }));
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />
    );
    const { user } = await changeCertificateScore('60');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).not.toMatch(/errors\.|conflict\b/);
    expect(alert.textContent).toMatch(/Reload the page/);
  });

  it('a score above 100 is the app message, in Arabic (V11)', async () => {
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />,
      'ar'
    );
    const { user, score } = await changeCertificateScore('150');
    expect(score.closest('form')?.noValidate).toBe(true);
    await user.click(screen.getByRole('button', { name: /حفظ/ }));
    expect(
      await screen.findByText('يرجى إدخال نسبة مئوية بين ٠ و١٠٠.')
    ).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('a server violation names the field in Arabic (V12)', async () => {
    update.mockRejectedValue(
      createApiError('validation', {
        status: 400,
        violations: [
          {
            field: 'certificateMinScore',
            messageKey: 'validation:max',
            values: { max: 100 },
          },
        ],
      })
    );
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />,
      'ar'
    );
    const { user } = await changeCertificateScore('60');
    await user.click(screen.getByRole('button', { name: /حفظ/ }));
    const message = await screen.findByText(/100 أو أقل/);
    expect(message.textContent).not.toMatch(/Certificate min score/i);
  });

  it('a `lessons` violation shows on the Lessons choice when the number box is hidden (V12)', async () => {
    update.mockRejectedValue(
      createApiError('validation', {
        status: 400,
        violations: [
          {
            field: 'lessons',
            messageKey: 'validation:max',
            values: { max: 0 },
          },
        ],
      })
    );
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />
    );
    const { user } = await changeCertificateScore('60');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    expect(await screen.findByText('Lessons must be 0 or less')).toBeTruthy();
  });

  it('a violation on a hidden list is the inline alert, never silence (review)', async () => {
    update.mockRejectedValue(
      createApiError('validation', {
        status: 400,
        violations: [
          { field: 'requiredQuizIds', messageKey: 'validation:invalid' },
        ],
      })
    );
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />
    );
    const { user } = await changeCertificateScore('60');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    // The quiz list is hidden (its switch is off), so the alert says it.
    expect(await screen.findByTestId('save-failed')).toBeTruthy();
  });

  it('a violation on a switch shows under that switch (review)', async () => {
    update.mockRejectedValue(
      createApiError('validation', {
        status: 400,
        violations: [
          { field: 'certificatesEnabled', messageKey: 'validation:invalid' },
        ],
      })
    );
    renderWith(
      <CourseCompletionSettingsCard academyId="aca-1" courseId="c1" canEdit />
    );
    const { user } = await changeCertificateScore('60');
    await user.click(screen.getByRole('button', { name: /Save/ }));
    const toggle = await screen.findByRole('switch', {
      name: en.settings.completion.certificates.label,
    });
    await vi.waitFor(() =>
      expect(toggle.closest('[class*="justify-between"]')?.textContent).toMatch(
        /not valid|invalid/i
      )
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('leaving with a changed rule asks first (V08)', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/settings',
          element: (
            <>
              <Link to="/elsewhere">Elsewhere</Link>
              <CourseCompletionSettingsCard
                academyId="aca-1"
                courseId="c1"
                canEdit
              />
              <NavigationBlockDialog />
            </>
          ),
        },
        { path: '/elsewhere', element: <p>Elsewhere page</p> },
      ],
      { initialEntries: ['/settings'] }
    );
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    );
    const { user } = await changeCertificateScore('70');
    await user.click(screen.getByRole('link', { name: 'Elsewhere' }));
    expect(await screen.findByTestId('unsaved-stay')).toBeTruthy();
    expect(screen.queryByText('Elsewhere page')).toBeNull();
  });
});

/* ---------- V04 / V15 / V27 — quiz questions ---------- */

describe('Quiz questions', () => {
  function renderQuiz() {
    renderWith(
      <QuizAuthoringForm
        courseId="c1"
        lessons={[]}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
  }

  it('an empty option says so under that option, and options are named (V04/V27)', async () => {
    const user = userEvent.setup();
    renderQuiz();
    const option1 = screen.getByRole('textbox', { name: 'Option 1' });
    expect(screen.getByRole('textbox', { name: 'Option 2' })).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Option 1 is correct' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save Quiz' }));
    await waitFor(() =>
      expect(option1.getAttribute('aria-invalid')).toBe('true')
    );
    const row = option1.closest('div.flex-1')!;
    expect(within(row as HTMLElement).getByText(/is required/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('removing a question with typed work asks first (V15)', async () => {
    const user = userEvent.setup();
    renderQuiz();
    await user.click(screen.getByRole('button', { name: 'Add Question' }));
    const prompts = screen.getAllByRole('textbox', { name: /^Prompt/ });
    await user.type(prompts[1], 'What is 2 + 2?');
    await user.click(screen.getByRole('button', { name: 'Remove question 2' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Remove question 2?')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    await waitFor(() =>
      expect(screen.getAllByRole('textbox', { name: /^Prompt/ })).toHaveLength(
        2
      )
    );
  });

  it('counts the prompt against 1000', () => {
    renderQuiz();
    expect(screen.getByTestId('question-0-prompt-count').textContent).toContain(
      '0 / 1000'
    );
  });
});

/* ---------- V21 — assignment due date ---------- */

const PAST_ASSIGNMENT = {
  id: 'as-1',
  courseId: 'c1',
  title: 'Old essay',
  description: '',
  instructions: '',
  status: 'published',
  dueAt: '2020-01-01T09:00:00.000Z',
  allowResubmission: false,
  latePolicy: 'accept_flagged',
  requiredForCompletion: false,
} as unknown as Assignment;

describe('Assignment due date (V21)', () => {
  it('refuses a new due date in the past', async () => {
    const onSubmit = vi.fn();
    renderWith(
      <AssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        isPending={false}
        onSubmit={onSubmit}
      />
    );
    fireEvent.change(screen.getByLabelText(/^Title/), {
      target: { value: 'Essay' },
    });
    const due = document.querySelector<HTMLInputElement>(
      'input[type="datetime-local"]'
    )!;
    fireEvent.change(due, { target: { value: '2020-01-01T09:00' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Save/ }));
    });
    expect(
      await screen.findByText(en.assignmentAuthoring.validation.dueInPast)
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps an existing past due date editable', async () => {
    const onSubmit = vi.fn();
    renderWith(
      <AssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        mode="edit"
        assignment={PAST_ASSIGNMENT}
        isPending={false}
        onSubmit={onSubmit}
      />
    );
    fireEvent.change(screen.getByLabelText(/^Title/), {
      target: { value: 'Old essay, revised' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Save/ }));
    });
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('counts the instructions against 5000', () => {
    renderWith(
      <AssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        isPending={false}
        onSubmit={vi.fn()}
      />
    );
    expect(
      screen.getByTestId('assignment-instructions-count').textContent
    ).toContain('0 / 5000');
  });
});
