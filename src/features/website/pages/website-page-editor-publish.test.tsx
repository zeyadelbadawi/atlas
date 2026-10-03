/**
 * Page editor: one action to go live, and a draft nothing overwrites
 * (Task H).
 *
 * Each case reproduces a reported failure of the old editor:
 *  - "Publish page" was disabled while there were unsaved edits — saving
 *    and publishing took two separate actions;
 *  - every refetch of the page (an SEO save, a site publish, a refocus)
 *    replaced the draft, silently discarding unsaved edits;
 *  - a publish was not pinned to a version, so a colleague's later save
 *    could go live unseen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionInstance, WebsitePage } from '@types';
import WebsitePageEditorPage from './WebsitePageEditorPage';
import { stableJsonKey } from '../utils/stable-json.utils';

const section = (id: string, enabled = true) =>
  ({
    id,
    type: 'richText',
    enabled,
    visibility: { mobile: true, tablet: true, desktop: true },
    config: { title: 'Hello', body: 'World' },
  }) as unknown as SectionInstance;

const makePage = (overrides: Partial<WebsitePage> = {}): WebsitePage =>
  ({
    id: 'p1',
    title: 'About',
    slug: 'about',
    version: 4,
    hasUnpublishedChanges: false,
    sections: [section('s1'), section('s2')],
    ...overrides,
  }) as unknown as WebsitePage;

let page: WebsitePage;
let siteStatus: 'draft' | 'published';
const updateMutateAsync = vi.fn();
const publishPageMutateAsync = vi.fn();
const publishSiteMutate = vi.fn();
const refetchPage = vi.fn();
const confirm = vi.fn();
let updatePending = false;

vi.mock('../hooks', () => ({
  useWebsiteConfiguration: () => ({
    data: {
      status: siteStatus,
      unpublishedChanges: { configuration: false, pages: 0 },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWebsitePages: () => ({
    data: { items: [page] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWebsitePage: () => ({
    data: page,
    isLoading: false,
    error: null,
    refetch: refetchPage,
  }),
  useUpdateWebsitePage: () => ({
    mutateAsync: updateMutateAsync,
    isPending: updatePending,
    error: null,
  }),
  usePublishWebsitePage: () => ({
    mutateAsync: publishPageMutateAsync,
    isPending: false,
    error: null,
  }),
  usePublishWebsite: () => ({
    mutate: publishSiteMutate,
    isPending: false,
    error: null,
  }),
  useUnpublishWebsite: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}));
vi.mock('../hooks/useEditingPresence', () => ({
  useEditingPresence: () => [],
}));
vi.mock('@features/academy', () => ({
  useAcademy: () => ({
    data: { id: 'a1', name: 'Academy' },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));
// The preview, tree and SEO dialog are not under test: a stub tree exposes
// one edit, so the draft can be made dirty.
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));
vi.mock('../components/PreviewViewport', () => ({
  PreviewViewport: () => null,
}));
vi.mock('../components/WebsitePageSeoDialog', () => ({
  WebsitePageSeoDialog: () => null,
}));
vi.mock('../components/SectionTree', () => ({
  SectionTree: ({
    onToggleEnabled,
  }: {
    onToggleEnabled: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onToggleEnabled('s1')}>
      toggle-s1
    </button>
  ),
}));

const conflictError = (currentVersion: number) => ({
  kind: 'conflict',
  details: { currentVersion, lastEditedByName: 'Mona' },
});

function renderEditor() {
  const ui = () => (
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/a1/p1']}>
        <Routes>
          <Route
            path="/:academyId/:pageId"
            element={<WebsitePageEditorPage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
  const view = render(ui());
  return { rerender: () => view.rerender(ui()) };
}

const state = () =>
  screen.getByTestId('website-page-publish-state').textContent;
const edit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'toggle-s1' }));
  });

beforeEach(() => {
  page = makePage();
  siteStatus = 'published';
  updatePending = false;
  updateMutateAsync.mockReset();
  publishPageMutateAsync.mockReset();
  publishSiteMutate.mockReset();
  refetchPage.mockReset();
  confirm.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

describe('page editor — Publish page saves and publishes in one step', () => {
  it('with unsaved edits, saves them and publishes the exact version saved', async () => {
    const saved = makePage({ version: 5, hasUnpublishedChanges: true });
    updateMutateAsync.mockResolvedValue(saved);
    publishPageMutateAsync.mockResolvedValue(saved);
    renderEditor();
    await edit();

    const publish = screen.getByTestId('website-publish-page');
    // Failed before the fix: disabled until the edits were saved separately.
    expect(publish).toHaveProperty('disabled', false);
    await act(async () => fireEvent.click(publish));

    await waitFor(() => expect(publishPageMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    expect(updateMutateAsync.mock.calls[0][0]).toMatchObject({
      academyId: 'a1',
      pageId: 'p1',
      payload: { expectedVersion: 4 },
    });
    expect(publishPageMutateAsync).toHaveBeenCalledWith({
      academyId: 'a1',
      pageId: 'p1',
      expectedVersion: 5,
    });
  });

  it('with nothing unsaved, publishes the saved copy pinned to the version on screen', async () => {
    page = makePage({ hasUnpublishedChanges: true });
    publishPageMutateAsync.mockResolvedValue(page);
    renderEditor();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-publish-page'))
    );
    await waitFor(() =>
      expect(publishPageMutateAsync).toHaveBeenCalledWith({
        academyId: 'a1',
        pageId: 'p1',
        expectedVersion: 4,
      })
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it('is disabled when there is nothing to publish', () => {
    renderEditor();
    expect(screen.getByTestId('website-publish-page')).toHaveProperty(
      'disabled',
      true
    );
  });

  it('cancelling the confirmation saves nothing and publishes nothing', async () => {
    confirm.mockResolvedValue(false);
    renderEditor();
    await edit();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-publish-page'))
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(publishPageMutateAsync).not.toHaveBeenCalled();
  });

  it('a stale save publishes nothing; keep my changes re-bases, then publishes', async () => {
    updateMutateAsync
      .mockRejectedValueOnce(conflictError(6))
      .mockResolvedValueOnce(makePage({ version: 7 }));
    publishPageMutateAsync.mockResolvedValue(makePage({ version: 7 }));
    renderEditor();
    await edit();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-publish-page'))
    );
    expect(publishPageMutateAsync).not.toHaveBeenCalled();
    const dialog = await screen.findByTestId('save-conflict-dialog');
    expect(dialog.textContent).toContain('Mona');

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: /keep my changes/i }))
    );
    await waitFor(() =>
      expect(publishPageMutateAsync).toHaveBeenCalledWith({
        academyId: 'a1',
        pageId: 'p1',
        expectedVersion: 7,
      })
    );
    expect(updateMutateAsync.mock.calls[1][0].payload.expectedVersion).toBe(6);
  });

  it('a publish refused because a colleague saved since offers only to look at their version', async () => {
    page = makePage({ hasUnpublishedChanges: true });
    publishPageMutateAsync.mockRejectedValue(conflictError(5));
    renderEditor();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-publish-page'))
    );
    await screen.findByTestId('save-conflict-dialog');
    expect(
      screen.queryByRole('button', { name: /keep my changes/i })
    ).toBeNull();
  });

  it('repeated clicks save and publish once', async () => {
    let finish: (value: WebsitePage) => void = () => undefined;
    updateMutateAsync.mockImplementation(
      () => new Promise<WebsitePage>((resolve) => (finish = resolve))
    );
    publishPageMutateAsync.mockResolvedValue(makePage({ version: 5 }));
    renderEditor();
    await edit();
    const publish = screen.getByTestId('website-publish-page');
    await act(async () => {
      fireEvent.click(publish);
      fireEvent.click(publish);
      fireEvent.click(publish);
    });
    await act(async () => finish(makePage({ version: 5 })));
    await waitFor(() => expect(publishPageMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    expect(publishPageMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('Save draft saves without publishing', async () => {
    updateMutateAsync.mockResolvedValue(
      makePage({ version: 5, hasUnpublishedChanges: true })
    );
    renderEditor();
    await edit();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    );
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    expect(publishPageMutateAsync).not.toHaveBeenCalled();
  });

  it('before the site is first published, the only page action is Save changes', () => {
    siteStatus = 'draft';
    renderEditor();
    expect(screen.queryByTestId('website-publish-page')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it("the site's Publish changes saves the page's unsaved edits first", async () => {
    updateMutateAsync.mockResolvedValue(
      makePage({ version: 5, hasUnpublishedChanges: true })
    );
    renderEditor();
    await edit();
    const sitePublish = screen.getByTestId('website-publish-changes');
    expect(sitePublish).toHaveProperty('disabled', false);
    await act(async () => fireEvent.click(sitePublish));
    await waitFor(() => expect(publishSiteMutate).toHaveBeenCalledWith('a1'));
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    expect(updateMutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      publishSiteMutate.mock.invocationCallOrder[0]
    );
  });

  it("the site's publish is abandoned when saving the page fails", async () => {
    updateMutateAsync.mockRejectedValue({ kind: 'network' });
    renderEditor();
    await edit();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-publish-changes'))
    );
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(publishSiteMutate).not.toHaveBeenCalled();
  });
});

describe('page editor — a refetch never overwrites unsaved edits', () => {
  it('keeps the edit when the page refetches (your own SEO save) and saves on the new version', async () => {
    updateMutateAsync.mockResolvedValue(makePage({ version: 6 }));
    const view = renderEditor();
    await edit();
    expect(state()).toContain('unsaved changes');

    // The SEO dialog saved: same sections, next version.
    page = makePage({ version: 5, title: 'About us' });
    view.rerender();

    // Failed before the fix: the refetch replaced the draft.
    expect(state()).toContain('unsaved changes');
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    );
    expect(updateMutateAsync.mock.calls[0][0].payload).toMatchObject({
      expectedVersion: 5,
      sections: [
        expect.objectContaining({ id: 's1', enabled: false }),
        expect.anything(),
      ],
    });
  });

  it('keeps the edit AND its base version when a colleague changed the sections, so the save conflicts instead of overwriting', async () => {
    updateMutateAsync.mockRejectedValue(conflictError(5));
    const view = renderEditor();
    await edit();

    page = makePage({ version: 5, sections: [section('s1'), section('s3')] });
    view.rerender();

    expect(state()).toContain('unsaved changes');
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    );
    expect(updateMutateAsync.mock.calls[0][0].payload.expectedVersion).toBe(4);
    await screen.findByTestId('save-conflict-dialog');
  });

  it('with nothing unsaved, a refetch shows the newer copy', async () => {
    const view = renderEditor();
    page = makePage({ version: 5, hasUnpublishedChanges: true });
    view.rerender();
    expect(state()).toContain("visitors don't see yet");
  });
});

describe('stableJsonKey', () => {
  it('ignores object key order and undefined fields, but not array order', () => {
    expect(stableJsonKey({ a: 1, b: { c: 2, d: 3 } })).toBe(
      stableJsonKey({ b: { d: 3, c: 2 }, a: 1, e: undefined })
    );
    expect(stableJsonKey([1, 2])).not.toBe(stableJsonKey([2, 1]));
  });
});
