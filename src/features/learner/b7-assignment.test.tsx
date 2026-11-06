/**
 * B7 (UX audit) — the assignment in the player.
 *
 * - V10: 6,000 characters are not cut to 5,000 silently: the counter shows
 *   the real limit, the text stays, and Submit refuses with the limit.
 * - V11: a 400 on `response` lands under the text and a 400 on the file
 *   under the file; anything else (a 409) is ONE alert with the real reason.
 * - V16: Resubmit starts from what was SUBMITTED (text and attachment), and
 *   a local draft older than the submission is dropped, not restored.
 * - V22: a score shows its maximum ("92 / 100").
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type {
  Assignment,
  AssignmentSubmission,
  CourseSequenceItem,
} from '@types';

const submitMutate = vi.fn();
const draftMutate = vi.fn();
const uploadMutate = vi.fn();
const state = vi.hoisted(() => ({
  submission: null as unknown,
  localDraft: null as unknown,
}));

vi.mock('@features/learning', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAssignment: () => ({
    data: ASSIGNMENT,
    error: null,
    refetch: vi.fn(),
  }),
  useAssignmentSubmission: () => ({
    data: state.submission,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSaveAssignmentDraft: () => ({ mutateAsync: draftMutate }),
  useSubmitAssignment: () => ({ mutateAsync: submitMutate, isPending: false }),
  useUploadSubmissionAttachment: () => ({
    mutateAsync: uploadMutate,
    isPending: false,
  }),
}));

const deleteAssignmentDraft = vi.fn(() => Promise.resolve());
vi.mock('@services/offline', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  deleteAssignmentDraft: (...args: unknown[]) =>
    deleteAssignmentDraft(...(args as [])),
  discardOutboxEntry: vi.fn(() => Promise.resolve()),
  listOutboxEntries: vi.fn(() => Promise.resolve([])),
  loadAssignmentDraft: vi.fn(() => Promise.resolve(state.localDraft)),
  saveAssignmentDraft: vi.fn(() => Promise.resolve()),
  subscribeOutbox: (listener: () => void) => {
    listener();
    return () => undefined;
  },
}));
vi.mock('./offline/learner-outbox', () => ({
  ASSIGNMENT_SUBMIT_KIND: 'learner.assignment-submit',
  newClientOpId: () => 'op-12345678',
  queueAssignmentSubmit: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm: () => Promise.resolve(true) }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u-1' } }),
}));

const ASSIGNMENT: Assignment = {
  id: 'as-1',
  courseId: 'c-1',
  title: 'Essay',
  instructions: 'Write about the Nile.',
  status: 'published',
  allowResubmission: true,
  latePolicy: 'accept_flagged',
  requiredForCompletion: true,
} as Assignment;

const ITEM = {
  id: 'as-1',
  type: 'assignment',
  title: 'Essay',
  state: 'available',
} as unknown as CourseSequenceItem;

const { AssignmentActivityView } =
  await import('./components/AssignmentActivityView');

function renderView() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AssignmentActivityView courseId="c-1" item={ITEM} />
    </I18nextProvider>
  );
}

beforeEach(() => {
  state.submission = null;
  state.localDraft = null;
  draftMutate.mockResolvedValue({ draftSavedAt: '2026-11-01T10:00:00.000Z' });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document
    .querySelectorAll('input[type="file"]')
    .forEach((input) => input.remove());
});

const textarea = () =>
  document.getElementById('assignment-response') as HTMLTextAreaElement;

describe('V10 — no silent cut', () => {
  it('keeps 6,000 characters, counts them against 5,000 and refuses to send', async () => {
    renderView();
    expect(textarea().getAttribute('maxlength')).toBeNull();
    fireEvent.change(textarea(), { target: { value: 'a'.repeat(6000) } });
    expect(textarea().value.length).toBe(6000);
    expect(screen.getByTestId('assignment-response-count').textContent).toBe(
      '6000 / 5000 characters'
    );
    fireEvent.click(screen.getByTestId('assignment-submit'));
    expect(
      (await screen.findByTestId('assignment-response-error')).textContent
    ).toBe('Your Response must be 5000 characters or fewer');
    expect(submitMutate).not.toHaveBeenCalled();
  });
});

describe('V11 — server refusals land on their fields, the rest is one alert', () => {
  it('a 400 on `response` is shown under the text, not as an alert', async () => {
    submitMutate.mockRejectedValue(
      createApiError('validation', {
        status: 400,
        violations: [
          {
            field: 'response',
            messageKey: 'validation:maxLength',
            values: { count: 5000 },
          },
        ],
      })
    );
    renderView();
    fireEvent.change(textarea(), { target: { value: 'My answer' } });
    fireEvent.click(screen.getByTestId('assignment-submit'));
    expect(
      (await screen.findByTestId('assignment-response-error')).textContent
    ).toContain('5000');
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('a 409 is ONE alert with the real reason and Try again', async () => {
    submitMutate.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.assignment.alreadySubmitted',
      })
    );
    renderView();
    fireEvent.change(textarea(), { target: { value: 'My answer' } });
    fireEvent.click(screen.getByTestId('assignment-submit'));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("Your assignment wasn't submitted");
    expect(alert.textContent).not.toContain('changed elsewhere');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

const SUBMITTED: AssignmentSubmission = {
  id: 'sub-1',
  assignmentId: 'as-1',
  studentId: 'u-1',
  status: 'submitted',
  response: 'The text I submitted',
  attachment: {
    assetId: 'asset-1',
    fileName: 'essay.pdf',
    sizeBytes: 2048,
    url: 'https://files.example/essay.pdf',
    expiresAt: '2026-11-01T11:00:00.000Z',
  },
  submittedAt: '2026-11-01T10:00:00.000Z',
  isLate: false,
  draftResponse: null,
  draftSavedAt: null,
  submittedRevision: 1,
  gradingStatus: 'graded',
  grade: {
    score: 92,
    feedback: 'Well argued.',
    gradedAt: '2026-11-02T10:00:00.000Z',
  },
} as unknown as AssignmentSubmission;

describe('V16 / V22 — resubmit and the score', () => {
  it('shows the score with its maximum', () => {
    state.submission = SUBMITTED;
    renderView();
    expect(screen.getByTestId('assignment-grade').textContent).toContain(
      'Score: 92 / 100'
    );
  });

  it('Resubmit starts from the submitted text and file; an older local draft is dropped', async () => {
    state.submission = SUBMITTED;
    state.localDraft = {
      response: 'An old draft never sent',
      synced: false,
      updatedAt: Date.parse('2026-10-30T10:00:00.000Z'),
      baseDraftSavedAt: null,
    };
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Resubmit' }));
    expect(textarea().value).toBe('The text I submitted');
    expect(screen.getByText('essay.pdf')).toBeTruthy();
    await waitFor(() =>
      expect(deleteAssignmentDraft).toHaveBeenCalledWith('u-1', 'c-1', 'as-1')
    );
    expect(textarea().value).toBe('The text I submitted');
  });

  it('a local draft written AFTER the submission is still restored', async () => {
    state.submission = SUBMITTED;
    state.localDraft = {
      response: 'Edited after submitting',
      synced: false,
      updatedAt: Date.parse('2026-11-03T10:00:00.000Z'),
      baseDraftSavedAt: null,
    };
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Resubmit' }));
    await waitFor(() =>
      expect(textarea().value).toBe('Edited after submitting')
    );
  });
});
