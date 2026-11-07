/**
 * B6 (UX audit) — the course forum, with the real EN/AR catalogues:
 *   V04 a reply of only spaces is refused here, with a message;
 *   V05 moderators delete a reply or the whole thread after a confirmation
 *       that says it can't be undone; cancel does nothing; deleting the
 *       thread goes back to the list;
 *   V07/V08 a failed reply is ONE inline message with the real reason
 *       ("this discussion is locked"), no toast;
 *   V11 a typed reply is protected by the unsaved-changes guard;
 *   V12 Lock asks first and says replies will close; Pin doesn't ask; both
 *       confirm their success;
 *   V19 the reply box is labelled and counts characters.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type * as Providers from '@app/providers';
import type { ForumReply, ForumThread } from '@types';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??=
  ResizeObserverStub;

const state = vi.hoisted(() => ({
  unsaved: [] as boolean[],
  canModerate: true,
  confirm: vi.fn(async (_request: unknown) => true),
  toast: vi.fn(),
  thread: undefined as unknown,
  replies: [] as unknown[],
  createReply: vi.fn(async (_v: unknown): Promise<unknown> => ({})),
  pin: vi.fn(async (_v: unknown): Promise<unknown> => ({})),
  lock: vi.fn(async (_v: unknown): Promise<unknown> => ({})),
  deleteThread: vi.fn(async (_v: unknown): Promise<unknown> => undefined),
  deleteReply: vi.fn(async (_v: unknown): Promise<unknown> => undefined),
}));

function useFakeMutation(fn: (variables: unknown) => Promise<unknown>) {
  const [error, setError] = useState<unknown>(null);
  return {
    isPending: false,
    error,
    mutateAsync: async (variables: unknown) => {
      setError(null);
      try {
        return await fn(variables);
      } catch (caught) {
        setError(caught);
        throw caught;
      }
    },
  };
}

vi.mock('./hooks', () => ({
  useForumThread: () => ({
    data: state.thread,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useForumReplies: () => ({
    data: { items: state.replies },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateReply: () => useFakeMutation(state.createReply),
  usePinThread: () => useFakeMutation(state.pin),
  useUnpinThread: () => useFakeMutation(async () => ({})),
  useLockThread: () => useFakeMutation(state.lock),
  useUnlockThread: () => useFakeMutation(async () => ({})),
  useDeleteThread: () => useFakeMutation(state.deleteThread),
  useDeleteReply: () => useFakeMutation(state.deleteReply),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof Providers>()),
  useConfirmDialog: () => ({ confirm: state.confirm }),
}));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: state.toast,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    hasPermission: (permission: string) =>
      permission === 'forum.moderate' ? state.canModerate : true,
  }),
  useUnsavedChanges: ({ isDirty }: { isDirty: boolean }) => {
    state.unsaved.push(isDirty);
    return { markSaved: () => undefined };
  },
}));

const { default: ForumThreadPage } = await import('./pages/ForumThreadPage');

const THREAD = {
  id: 't-1',
  forumId: 'f-1',
  courseId: 'c-1',
  authorId: 'u-1',
  authorName: 'Sarah',
  title: 'Week 1 questions',
  body: 'Ask here.',
  pinned: false,
  locked: false,
  replyCount: 2,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
} as ForumThread;

const reply = (id: string, authorName: string, body: string): ForumReply => ({
  id,
  threadId: 't-1',
  authorId: `u-${id}`,
  authorName,
  body,
  createdAt: '2026-11-01T11:00:00.000Z',
  updatedAt: '2026-11-01T11:00:00.000Z',
});

afterEach(() => {
  cleanup();
  state.unsaved = [];
  state.canModerate = true;
  state.confirm.mockReset();
  state.confirm.mockResolvedValue(true);
  state.toast.mockReset();
  state.createReply.mockReset();
  state.createReply.mockResolvedValue({});
  state.pin.mockReset();
  state.lock.mockReset();
  state.deleteThread.mockReset();
  state.deleteReply.mockReset();
});

function renderThread(language: 'en' | 'ar' = 'en') {
  state.thread ??= THREAD;
  return render(
    <AtlasLocalizationProvider initialLanguage={language}>
      <MemoryRouter
        initialEntries={['/dashboard/instructor/courses/c-1/discussions/t-1']}
      >
        <Routes>
          <Route
            path="/dashboard/instructor/courses/:courseId/discussions/:threadId"
            element={<ForumThreadPage />}
          />
          <Route
            path="/dashboard/instructor/courses/:courseId/discussions"
            element={<p>forum list</p>}
          />
        </Routes>
      </MemoryRouter>
    </AtlasLocalizationProvider>
  );
}

const replyBox = () => screen.getByLabelText('Your reply');

describe('reply form (V04, V07, V08, V11, V19)', () => {
  it('refuses a reply of only spaces, with a message, and sends nothing', async () => {
    state.thread = THREAD;
    renderThread();
    expect(replyBox().closest('form')?.noValidate).toBe(true);
    await userEvent.type(replyBox(), '   ');
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(
      await screen.findByText(
        "Write your reply before sending. Spaces alone don't count."
      )
    ).toBeTruthy();
    expect(state.createReply).not.toHaveBeenCalled();
  });

  it('the reply box is described by both its counter and its error', async () => {
    state.thread = THREAD;
    renderThread();
    await userEvent.type(replyBox(), '   ');
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    const message = await screen.findByText(
      "Write your reply before sending. Spaces alone don't count."
    );
    const describedBy = replyBox().getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain(message.id);
    expect(describedBy).toContain(screen.getByTestId('forum-reply-count').id);
  });

  it('is labelled, counts against the server limit, and is guarded while typed', async () => {
    state.thread = THREAD;
    renderThread();
    expect(screen.getByTestId('forum-reply-count').textContent).toBe(
      '0 / 10000 characters'
    );
    expect(state.unsaved.at(-1)).toBe(false);
    await userEvent.type(replyBox(), 'Thanks');
    expect(screen.getByTestId('forum-reply-count').textContent).toBe(
      '6 / 10000 characters'
    );
    expect(state.unsaved.at(-1)).toBe(true);
  });

  it('confirms a posted reply and sends it trimmed', async () => {
    state.thread = THREAD;
    renderThread();
    await userEvent.type(replyBox(), '  Thanks!  ');
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    await waitFor(() =>
      expect(state.createReply).toHaveBeenCalledWith({ body: 'Thanks!' })
    );
    await waitFor(() =>
      expect(state.toast).toHaveBeenCalledWith({ title: 'Reply posted' })
    );
  });

  it('a locked thread’s refusal shows once, inline, in its own words', async () => {
    state.thread = THREAD;
    state.createReply.mockRejectedValue(
      createApiError('conflict', { messageKey: 'errors.forum.threadLocked' })
    );
    renderThread();
    await userEvent.type(replyBox(), 'Late answer');
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("Your reply wasn't posted");
    expect(alert.textContent).toContain(
      "This discussion is locked, so new replies can't be added."
    );
    expect(state.toast).not.toHaveBeenCalled();
    // The typed reply stays.
    expect((replyBox() as HTMLTextAreaElement).value).toBe('Late answer');
  });
});

describe('pin and lock (V12)', () => {
  it('Lock asks first; cancelling changes nothing', async () => {
    state.thread = THREAD;
    state.confirm.mockResolvedValueOnce(false);
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionKey: 'forum:thread.lockConfirm.description',
      })
    );
    expect(state.lock).not.toHaveBeenCalled();
    expect(
      createI18nInstance('en').t('forum:thread.lockConfirm.description', {
        title: 'Week 1',
      })
    ).toContain('No one will be able to reply');
  });

  it('Lock, once confirmed, runs and says so', async () => {
    state.thread = THREAD;
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    await waitFor(() => expect(state.lock).toHaveBeenCalledWith('t-1'));
    await waitFor(() =>
      expect(state.toast).toHaveBeenCalledWith({
        title: 'Discussion locked. New replies are closed.',
      })
    );
  });

  it('Pin acts without asking and confirms', async () => {
    state.thread = THREAD;
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await waitFor(() => expect(state.pin).toHaveBeenCalledWith('t-1'));
    expect(state.confirm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(state.toast).toHaveBeenCalledWith({
        title: 'Discussion pinned to the top',
      })
    );
  });

  it('a failed moderation action is ONE toast with the real reason', async () => {
    state.thread = THREAD;
    state.pin.mockRejectedValue(createApiError('network'));
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await waitFor(() => expect(state.toast).toHaveBeenCalledTimes(1));
    const [call] = state.toast.mock.calls[0] as [
      { title: string; description: string },
    ];
    expect(call.title).toBe("The discussion wasn't pinned");
    expect(call.description).not.toBe('');
  });
});

describe('delete (V05)', () => {
  it('shows no Delete to a reader who cannot moderate', () => {
    state.thread = THREAD;
    state.canModerate = false;
    state.replies = [reply('r-1', 'Omar', 'Hello')];
    renderThread();
    expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull();
    state.replies = [];
  });

  it('a reply: asks first (cannot be undone); cancel does nothing', async () => {
    state.thread = THREAD;
    state.replies = [reply('r-1', 'Omar', 'Hello')];
    state.confirm.mockResolvedValueOnce(false);
    renderThread();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete the reply by Omar' })
    );
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionKey: 'forum:thread.deleteReply.confirm.description',
        intent: 'destructive',
      })
    );
    expect(state.deleteReply).not.toHaveBeenCalled();
    expect(
      createI18nInstance('en').t(
        'forum:thread.deleteReply.confirm.description',
        { name: 'Omar' }
      )
    ).toContain("can't be undone");
    state.replies = [];
  });

  it('a reply: once confirmed, deleted with a success message', async () => {
    state.thread = THREAD;
    state.replies = [reply('r-1', 'Omar', 'Hello')];
    renderThread();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete the reply by Omar' })
    );
    await waitFor(() => expect(state.deleteReply).toHaveBeenCalledWith('r-1'));
    await waitFor(() =>
      expect(state.toast).toHaveBeenCalledWith({ title: 'Reply deleted' })
    );
    state.replies = [];
  });

  it('the thread: names its replies (plural), and goes back to the list', async () => {
    state.thread = THREAD;
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionKey: 'forum:thread.deleteThread.confirm.description',
        values: expect.objectContaining({ count: 2 }),
      })
    );
    await waitFor(() => expect(state.deleteThread).toHaveBeenCalledWith('t-1'));
    expect(await screen.findByText('forum list')).toBeTruthy();
    expect(state.toast).toHaveBeenCalledWith({ title: 'Discussion deleted' });

    const en = createI18nInstance('en');
    const ar = createI18nInstance('ar');
    const key = 'forum:thread.deleteThread.confirm.description';
    expect(en.t(key, { title: 'T', count: 1 })).toBe(
      "T and its 1 reply will be deleted for everyone. This can't be undone."
    );
    expect(en.t(key, { title: 'T', count: 2 })).toContain('its 2 replies');
    expect(ar.t(key, { title: 'T', count: 2 })).toContain('وردّاه');
  });

  it('the thread: cancelling keeps it and stays on the page', async () => {
    state.thread = THREAD;
    state.confirm.mockResolvedValueOnce(false);
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.confirm).toHaveBeenCalledTimes(1));
    expect(state.deleteThread).not.toHaveBeenCalled();
    expect(screen.queryByText('forum list')).toBeNull();
  });

  it('a failed delete is one toast with the real reason and stays', async () => {
    state.thread = THREAD;
    state.deleteThread.mockRejectedValue(
      createApiError('forbidden', { messageKey: 'errors.forbidden' })
    );
    renderThread();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.toast).toHaveBeenCalledTimes(1));
    expect((state.toast.mock.calls[0] as [{ title: string }])[0].title).toBe(
      "The discussion wasn't deleted"
    );
    expect(screen.queryByText('forum list')).toBeNull();
  });
});

describe('thread title in the page header', () => {
  // B6 "not changed" note, closed: the title is the author's own text, so
  // a Latin title on the Arabic page keeps its own direction (the shared
  // PageHeader gives a data title `dir="auto"`, B8 V32) and its trailing
  // punctuation stays at its end.
  it('keeps a Latin title in its own direction on the Arabic page', async () => {
    state.thread = { ...THREAD, title: 'Week 1: questions?' };
    renderThread('ar');
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Week 1: questions?',
    });
    expect(heading.getAttribute('dir')).toBe('auto');
  });
});
