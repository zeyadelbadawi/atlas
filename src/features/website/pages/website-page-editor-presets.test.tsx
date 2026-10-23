/**
 * CMS phase 3e — the page editor's "Add section" offers a section's looks
 * (presets) before adding it: the chosen look arrives with its content and
 * design and is opened for editing; a section without presets is added
 * straight away, as before; closing the looks adds nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionInstance, WebsitePage } from '@types';
import WebsitePageEditorPage from './WebsitePageEditorPage';

const visibility = { mobile: true, tablet: true, desktop: true };
const about: SectionInstance = {
  id: 'about-1',
  type: 'about',
  enabled: true,
  visibility,
  config: { title: { en: 'About', ar: '' }, body: { en: 'Us', ar: '' } },
};

const makePage = (sections: SectionInstance[]): WebsitePage =>
  ({
    id: 'p1',
    title: 'Home',
    slug: 'home',
    version: 4,
    hasUnpublishedChanges: false,
    sections,
  }) as unknown as WebsitePage;

let page: WebsitePage;
const updateMutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useWebsiteConfiguration: () => ({
    data: {
      status: 'draft',
      themeKey: 'modern-education',
      brand: {
        primaryColor: '221 83% 53%',
        secondaryColor: '221 83% 53%',
        accentColor: '221 83% 53%',
      },
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
    refetch: vi.fn(),
  }),
  useUpdateWebsitePage: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
    error: null,
  }),
  usePublishWebsitePage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
  usePublishWebsite: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUnpublishWebsite: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
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
  // Read by the Customer Requests menu entry in the section tree; no
  // resolved membership means the entry stays hidden.
  useAcademyScope: () => ({ academyId: 'a1', membership: undefined }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: undefined }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));
vi.mock('../components/PreviewViewport', () => ({
  PreviewViewport: () => null,
  IframeViewport: () => null,
  initialPreviewBreakpoint: () => 'desktop',
}));
vi.mock('../components/WebsitePageSeoDialog', () => ({
  WebsitePageSeoDialog: () => null,
}));
vi.mock('../sections/SectionRenderer', () => ({ SectionRenderer: () => null }));

function renderEditor() {
  render(
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
}

async function openAddMenu() {
  const trigger = screen.getByRole('button', { name: 'Add section' });
  await act(async () => {
    fireEvent.keyDown(trigger, { key: 'Enter' });
  });
  return screen.getByRole('menu');
}

async function addFromMenu(label: string) {
  const menu = await openAddMenu();
  await act(async () => {
    fireEvent.click(within(menu).getByRole('menuitem', { name: label }));
  });
}

/** The section tree's rows, by name. */
const treeLabels = () =>
  screen
    .getAllByRole('switch', { name: 'Enabled', hidden: true })
    .map(
      (toggle) => toggle.closest('li')?.querySelector('button')?.textContent
    );

beforeEach(() => {
  updateMutateAsync.mockReset();
  page = makePage([about]);
});
afterEach(cleanup);

describe('page editor — adding a section from a preset', () => {
  it('offers the looks of a section with presets, then adds the chosen one', async () => {
    renderEditor();
    await addFromMenu('Call to Action');
    const dialog = screen.getByTestId('section-preset-dialog');
    expect(within(dialog).getAllByRole('radio').length).toBeGreaterThan(2);
    // Nothing is added until "Add".
    expect(treeLabels()).toEqual(['About']);
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('radio', { name: 'WhatsApp and a call' })
      );
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByTestId('preset-add'));
    });
    expect(screen.queryByTestId('section-preset-dialog')).toBeNull();
    expect(treeLabels()).toEqual(['About', 'Call to Action']);
    // The new section is opened for editing, with the look's own content.
    expect(screen.getByRole('dialog').textContent).toContain('Call to Action');
    expect(
      (
        screen.getByDisplayValue(
          'Not sure which course fits?'
        ) as HTMLInputElement
      ).value
    ).toBe('Not sure which course fits?');
  });

  it('adds a section without presets straight away', async () => {
    renderEditor();
    await addFromMenu('Gallery');
    expect(screen.queryByTestId('section-preset-dialog')).toBeNull();
    expect(treeLabels()).toEqual(['About', 'Gallery']);
  });

  it('adds nothing when the looks are closed', async () => {
    renderEditor();
    await addFromMenu('Hero');
    const dialog = screen.getByTestId('section-preset-dialog');
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(screen.queryByTestId('section-preset-dialog')).toBeNull();
    expect(treeLabels()).toEqual(['About']);
  });
});
