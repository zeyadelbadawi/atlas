/**
 * B3 — Blog post editor.
 *
 *  1. New post: errors sit next to their fields; the slug follows the
 *     English title; create sends an empty language as null and opens the
 *     saved post.
 *  2. Save sends the version it read; a 409 stale says someone else saved
 *     and offers a reload — nothing is overwritten.
 *  3. Publishing needs both languages (checked before any request), and
 *     a confirmed publish sends the version.
 *  4. The live preview uses the public renderer; EN and AR have no raw keys.
 *  5. Delete is confirmed and only offered for drafts/archived posts.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '@api';
import { AR, EN, blogPost, page } from './__tests__/fixtures';
import {
  RAW_KEY,
  apiError,
  installDomShims,
  renderPage,
} from './__tests__/render';
import type { BlogPost } from './types';

vi.mock('@/components/ui/select', () => import('./__tests__/select-mock'));

const {
  default: Editor,
  publishProblems,
  editorStateOf,
  toPayload,
} = await import('./pages/PlatformBlogEditorPage');

const notifySuccess = vi.fn();
const notifyError = vi.fn();
const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
const USER = { delay: null, pointerEventsCheck: 0 } as const;

let current: BlogPost;

beforeAll(installDomShims);
beforeEach(() => {
  current = blogPost();
  get.mockImplementation(async (path: string) => {
    if (path === 'platform-blog-posts')
      return page([current, blogPost({ id: 'post-2', slug: 'second-post' })]);
    if (path.startsWith('platform-blog-posts/')) return current;
    throw new Error(`unexpected GET ${path}`);
  });
  post.mockImplementation(
    async (path: string, body: Record<string, unknown>) => {
      if (path === 'platform-blog-posts')
        return blogPost({
          id: 'new-1',
          ...(body as Partial<BlogPost>),
          version: 1,
        });
      if (path.endsWith('/publish')) {
        current = {
          ...current,
          status: 'published',
          publishAt: '2026-10-26T12:00:00.000Z',
          version: current.version + 1,
        };
        return current;
      }
      throw new Error(`unexpected POST ${path}`);
    }
  );
  patch.mockImplementation(
    async (_path: string, body: Record<string, unknown>) => {
      current = {
        ...current,
        ...(body as Partial<BlogPost>),
        version: current.version + 1,
      };
      return current;
    }
  );
  del.mockResolvedValue(undefined);
  vi.spyOn(apiClient, 'get').mockImplementation(((path: string) =>
    get(path)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'post').mockImplementation(((
    path: string,
    body: unknown
  ) => post(path, body)) as typeof apiClient.post);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
  vi.spyOn(apiClient, 'delete').mockImplementation(((path: string) =>
    del(path)) as typeof apiClient.delete);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  [get, post, patch, del, notifySuccess, notifyError].forEach((fn) =>
    fn.mockReset()
  );
});

const EDIT = '/dashboard/platform/blog/:postId';
const open = (url: string, path: string, language: 'en' | 'ar' = 'en') =>
  renderPage(<Editor />, {
    language,
    url,
    path,
    toast: { notifySuccess, notifyError },
    extra: [{ path: EDIT, element: <p>edit page</p> }],
  });

describe('editor helpers', () => {
  it('reports what blocks publishing', () => {
    const state = editorStateOf(
      blogPost({ translations: { en: EN, ar: null } })
    );
    expect(publishProblems(state)).toEqual([{ locale: 'ar', kind: 'missing' }]);
    const bad = editorStateOf(
      blogPost({ translations: { en: { ...EN, title: 'x' }, ar: AR } })
    );
    expect(publishProblems(bad)).toEqual([{ locale: 'en', kind: 'invalid' }]);
    expect(publishProblems(editorStateOf(blogPost()))).toEqual([]);
  });

  it('sends an unwritten language as null', () => {
    const payload = toPayload(
      editorStateOf(blogPost({ translations: { en: EN, ar: null } }))
    );
    expect(payload.translations?.ar).toBeNull();
    expect(payload.translations?.en?.title).toBe(EN.title);
  });
});

describe('Blog editor page', () => {
  it('validates a new post, follows the English title for the slug and creates a partial draft', async () => {
    const user = userEvent.setup(USER);
    open('/dashboard/platform/blog/new', '/dashboard/platform/blog/new');
    await user.click(
      await screen.findByRole('button', { name: 'Create draft' })
    );
    expect(
      screen.getByText('Write at least one language before saving.')
    ).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Title/), 'Exam season checklist');
    expect((screen.getByLabelText(/^URL slug/) as HTMLInputElement).value).toBe(
      'exam-season-checklist'
    );
    // A draft may hold a half-written language: only maximum lengths apply.
    await user.type(screen.getByLabelText(/^Search title/), 'x'.repeat(71));
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    const seo = screen.getByLabelText(/^Search title/);
    expect(seo.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(`${seo.id}-error`)?.textContent).toBe(
      'Keep the search title under 70 characters.'
    );
    expect(post).not.toHaveBeenCalled();

    await user.clear(seo);
    await user.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [path, body] = post.mock.calls[0];
    expect(path).toBe('platform-blog-posts');
    expect(body).toMatchObject({
      slug: 'exam-season-checklist',
      authorName: 'Atlas team',
      translations: {
        ar: null,
        en: { title: 'Exam season checklist', excerpt: '' },
      },
    });
    expect(await screen.findByText('edit page')).toBeTruthy();
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformLaunch:editor.toasts.created'
    );
  });

  it('keeps a published post complete in both languages on every save', async () => {
    const user = userEvent.setup(USER);
    current = blogPost({
      status: 'published',
      publishAt: '2026-10-26T09:00:00.000Z',
    });
    open('/dashboard/platform/blog/post-1', EDIT);
    const excerpt = await screen.findByLabelText(/^Excerpt/);
    await user.clear(excerpt);
    await user.type(excerpt, 'Too short');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.getElementById(`${excerpt.id}-error`)?.textContent).toBe(
      'Write an excerpt of 20 to 300 characters.'
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('saves with the version it read and explains a conflict without overwriting', async () => {
    const user = userEvent.setup(USER);
    open('/dashboard/platform/blog/post-1', EDIT);
    const title = await screen.findByLabelText(/^Title/);
    await user.type(title, ' now');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0][0]).toBe('platform-blog-posts/post-1');
    expect(patch.mock.calls[0][1]).toMatchObject({
      version: 3,
      translations: { en: { title: `${EN.title} now` } },
    });
    expect(await screen.findByText('All changes saved')).toBeTruthy();

    patch.mockRejectedValueOnce(apiError(409, 'errors.blog.stale'));
    await user.type(screen.getByLabelText(/^Title/), '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const alert = await screen.findByText(
      'Someone else saved this while you were editing'
    );
    expect(alert).toBeTruthy();
    expect(patch.mock.calls[1][1]).toMatchObject({ version: 4 });
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Someone else saved this while you were editing')
      ).toBeNull()
    );
  });

  it('needs both languages before publishing, then publishes with the version', async () => {
    const user = userEvent.setup(USER);
    current = blogPost({ translations: { en: EN, ar: null } });
    const view = open('/dashboard/platform/blog/post-1', EDIT);
    await user.click(
      await screen.findByRole('button', { name: 'Publish now' })
    );
    expect(
      screen.getByText('Both languages are needed to publish')
    ).toBeTruthy();
    expect(screen.getByText('Arabic version is not written')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    view.unmount();

    current = blogPost();
    open('/dashboard/platform/blog/post-1', EDIT);
    await user.click(
      await screen.findByRole('button', { name: 'Publish now' })
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain(
      'It appears on the blog in English and Arabic straight away.'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('platform-blog-posts/post-1/publish', {
        version: 3,
      })
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'platformLaunch:editor.toasts.published'
    );
  });

  it('previews the body with the public renderer as you type', async () => {
    const user = userEvent.setup(USER);
    open('/dashboard/platform/blog/post-1', EDIT);
    const body = await screen.findByLabelText('Body');
    await user.clear(body);
    await user.type(
      body,
      '## Fresh section{enter}{enter}Hello <script>x</script>'
    );
    const preview = screen.getAllByRole('region', { name: 'Live preview' })[0];
    expect(
      within(preview).getByRole('heading', { level: 2, name: 'Fresh section' })
    ).toBeTruthy();
    expect(preview.querySelector('script')).toBeNull();
  });

  it('applies toolbar formatting to the selection', async () => {
    const user = userEvent.setup(USER);
    open('/dashboard/platform/blog/post-1', EDIT);
    const body = (await screen.findByLabelText('Body')) as HTMLTextAreaElement;
    await user.clear(body);
    await user.type(body, 'important');
    body.setSelectionRange(0, 9);
    await user.click(screen.getAllByRole('button', { name: 'Bold' })[0]);
    expect(body.value).toBe('**important**');
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = open('/dashboard/platform/blog/post-1', EDIT, 'ar');
    expect(await screen.findByRole('tab', { name: /العربية/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'نشر الآن' })).toBeTruthy();
    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('confirms before deleting a draft', async () => {
    const user = userEvent.setup(USER);
    open('/dashboard/platform/blog/post-1', EDIT);
    await user.click(
      await screen.findByRole('button', { name: 'More actions' })
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Delete post' })
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('platform-blog-posts/post-1')
    );
  });
});
