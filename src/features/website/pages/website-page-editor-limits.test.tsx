/**
 * Page editor and content limits: the API validates the whole page on
 * every save, so a section holding text over a current limit (saved before
 * the limit tightened) blocks saving the page. Such sections are marked in
 * the tree, a notice names them with a way into each, saving is held back,
 * and a refused save's path-level violations reach the same messages.
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
import { MAX_HERO_DESCRIPTION_LENGTH } from '../constants/website.constants';

const visibility = { mobile: true, tablet: true, desktop: true };
const hero = (description = 'Short and sweet'): SectionInstance => ({
  id: 'hero-1',
  type: 'hero',
  enabled: true,
  visibility,
  config: {
    title: { en: 'Learn', ar: '' },
    description: { en: description, ar: '' },
  },
});
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

/** Makes the draft dirty without touching any section's content. */
const toggleAbout = () =>
  act(async () => {
    fireEvent.click(screen.getAllByRole('switch', { name: 'Enabled' })[1]);
  });

beforeEach(() => {
  updateMutateAsync.mockReset();
});
afterEach(cleanup);

describe('page editor — content limits', () => {
  it('a page within every limit has no notice, no marker and saves normally', async () => {
    page = makePage([hero(), about]);
    updateMutateAsync.mockResolvedValue(page);
    renderEditor();

    expect(screen.queryByTestId('website-page-over-limit')).toBeNull();
    expect(screen.queryByText('Needs shortening')).toBeNull();
    await toggleAbout();
    const save = screen.getByTestId('website-save-page');
    expect(save).toHaveProperty('disabled', false);
    await act(async () => fireEvent.click(save));
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('legacy over-limit text: marks the section, explains why the page cannot be saved, and holds the save back', async () => {
    page = makePage([
      hero('x'.repeat(MAX_HERO_DESCRIPTION_LENGTH + 500)),
      about,
    ]);
    renderEditor();

    expect(screen.getByTestId('needs-shortening-hero-1').textContent).toContain(
      'Needs shortening'
    );
    expect(screen.queryByTestId('needs-shortening-about-1')).toBeNull();
    const notice = screen.getByTestId('website-page-over-limit');
    expect(notice.textContent).toContain(
      'One section has text longer than the current limits'
    );

    await toggleAbout();
    expect(screen.getByTestId('website-save-page')).toHaveProperty(
      'disabled',
      true
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();

    // The notice opens the section, which shows the problem in place.
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Edit 1. Hero' }))
    );
    expect(
      screen.getByTestId('section-field-description-en-message').textContent
    ).toBe(`Shorten to ${MAX_HERO_DESCRIPTION_LENGTH} characters or fewer`);
  });

  it('maps the API’s path-level violations on a refused save to the same marker and field', async () => {
    page = makePage([hero(), about]);
    updateMutateAsync.mockRejectedValue({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      violations: [
        { field: '1.config.title.en', messageKey: 'validation:maxLength' },
      ],
    });
    renderEditor();
    await toggleAbout();
    await act(async () =>
      fireEvent.click(screen.getByTestId('website-save-page'))
    );

    await waitFor(() =>
      expect(screen.getByTestId('needs-shortening-about-1')).not.toBeNull()
    );
    expect(screen.getByTestId('website-page-over-limit')).not.toBeNull();

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Edit 2. About' }))
    );
    expect(screen.getByTestId('section-form-issues').textContent).toContain(
      'Title · English: Shorten this text'
    );
  });
});
