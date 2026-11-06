/**
 * B2 (UX audit) — the classic page editor's feedback, EN and AR:
 * - V15: a refused save whose violations name no section gives the real
 *   reason, never "These sections need attention: ." with an empty list;
 * - V16: a failed save or publish is ONE inline message with the reason
 *   (the mutations are `inlineErrors`, so no toast repeats it);
 * - V25: a greyed-out Save / Publish says why, next to it;
 * - V11: closing the section dialog with unapplied edits asks first;
 * - V30: deleting a section says it leaves the draft, not "cannot be undone";
 * - V34: the preview language and a core page's default title read in the
 *   dashboard's language;
 * - V02: SEO and History share one "More" menu.
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
import { createApiError } from '@services';
import type { SectionInstance, WebsitePage } from '@types';
import WebsitePageEditorPage from './WebsitePageEditorPage';

const section = (id: string) =>
  ({
    id,
    type: 'cta',
    enabled: true,
    visibility: { mobile: true, tablet: true, desktop: true },
    config: { title: 'Hello', body: 'World' },
  }) as unknown as SectionInstance;

const makePage = (overrides: Partial<WebsitePage> = {}): WebsitePage =>
  ({
    id: 'p1',
    title: 'Home',
    coreType: 'home',
    pageType: 'core',
    slug: 'home',
    version: 4,
    hasUnpublishedChanges: false,
    sections: [section('s1'), section('s2')],
    ...overrides,
  }) as unknown as WebsitePage;

let page: WebsitePage;
let updateError: unknown;
let publishError: unknown;
const updateMutateAsync = vi.fn();
const confirm = vi.fn();

vi.mock('../hooks', () => ({
  useWebsiteConfiguration: () => ({
    data: {
      status: 'published',
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
    error: updateError,
  }),
  usePublishWebsitePage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: publishError,
  }),
  usePublishWebsite: () => ({ mutate: vi.fn(), isPending: false, error: null }),
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
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));
vi.mock('../components/PreviewViewport', () => ({
  PreviewViewport: () => null,
  initialPreviewBreakpoint: () => 'desktop',
}));
vi.mock('../components/WebsitePageSeoDialog', () => ({
  WebsitePageSeoDialog: () => null,
}));
// The section form stands in with one edit that makes it dirty.
vi.mock('../components/SectionConfigForm', () => ({
  SectionConfigForm: ({
    onDirtyChange,
    onCancel,
  }: {
    onDirtyChange?: (dirty: boolean) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="section-form">
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        type-in-section
      </button>
      <button type="button" onClick={onCancel}>
        cancel-section
      </button>
    </div>
  ),
}));
vi.mock('../components/SectionTree', () => ({
  SectionTree: ({
    onToggleEnabled,
    onSelect,
    onDelete,
  }: {
    onToggleEnabled: (id: string) => void;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <>
      <button type="button" onClick={() => onToggleEnabled('s1')}>
        toggle-s1
      </button>
      <button type="button" onClick={() => onSelect('s1')}>
        open-s1
      </button>
      <button type="button" onClick={() => onDelete('s1')}>
        delete-s1
      </button>
    </>
  ),
}));

function renderEditor(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
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
const click = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

beforeEach(() => {
  page = makePage();
  updateError = null;
  publishError = null;
  updateMutateAsync.mockReset();
  confirm.mockReset().mockResolvedValue(true);
});
afterEach(cleanup);

describe('B2 V15/V16 — one message for a failed save, with the reason', () => {
  it('a refusal that names no section gives the real reason, no empty list', () => {
    updateError = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [{ field: 'sections', messageKey: 'validation:required' }],
    });
    renderEditor();
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain('Your changes weren’t saved');
    expect(alert.textContent).toContain('This field is required');
    expect(document.body.textContent).not.toContain(
      'need attention before this page can be saved: .'
    );
    // Sending the same content again fails the same way: no retry.
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a refusal naming a section still lists it', () => {
    updateError = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [
        { field: '1.config.title', messageKey: 'validation:required' },
      ],
    });
    renderEditor();
    expect(document.body.textContent).toContain(
      'These sections need attention before this page can be saved: 2.'
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('a server error is one inline alert with the reason and Try again (EN, AR)', () => {
    updateError = createApiError('server', { messageKey: 'errors.internal' });
    renderEditor();
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).not.toContain('Unexpected error');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    cleanup();
    renderEditor('ar');
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'لم تُحفظ تغييراتك'
    );
  });

  it('a failed publish says the page was not published, with the reason', () => {
    publishError = createApiError('network', { messageKey: 'errors.network' });
    renderEditor();
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'This page wasn’t published'
    );
  });
});

describe('B2 V25 — a greyed-out Save or Publish says why', () => {
  it('nothing new: both disabled, and the reason is next to them (EN, AR)', () => {
    renderEditor();
    const publish = screen.getByTestId('website-publish-page');
    expect(publish).toHaveProperty('disabled', true);
    const hint = screen.getByTestId('website-page-action-hint');
    expect(hint.textContent).toBe(
      'Nothing new to save or publish. Visitors already see this page as saved.'
    );
    expect(publish.getAttribute('aria-describedby')).toBe(hint.id);
    cleanup();
    renderEditor('ar');
    expect(
      screen.getByTestId('website-page-action-hint').textContent
    ).toContain('لا يوجد جديد للحفظ أو النشر');
  });

  it('with an edit, nothing is greyed out and no hint shows', async () => {
    renderEditor();
    await click('toggle-s1');
    expect(screen.getByTestId('website-publish-page')).toHaveProperty(
      'disabled',
      false
    );
    expect(screen.queryByTestId('website-page-action-hint')).toBeNull();
  });
});

describe('B2 V11 — the section dialog asks before discarding typed edits', () => {
  it('Cancel with edits asks; staying keeps the dialog open', async () => {
    confirm.mockResolvedValue(false);
    renderEditor();
    await click('open-s1');
    await click('type-in-section');
    await click('cancel-section');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ titleKey: 'common:unsavedChanges.title' })
    );
    expect(screen.getByTestId('section-form')).toBeTruthy();
  });

  it('Escape with edits asks; leaving closes it', async () => {
    renderEditor();
    await click('open-s1');
    await click('type-in-section');
    await act(async () => {
      fireEvent.keyDown(screen.getByTestId('section-form'), { key: 'Escape' });
    });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByTestId('section-form')).toBeNull()
    );
  });

  it('a clean dialog closes without a question', async () => {
    renderEditor();
    await click('open-s1');
    await click('cancel-section');
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('section-form')).toBeNull();
  });
});

describe('B2 V30 — deleting a section says what really happens', () => {
  it('it leaves the draft; nothing reaches the site until published (EN, AR)', async () => {
    renderEditor();
    await click('delete-s1');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionKey: 'website:editor.deleteConfirmDescription',
      })
    );
    const en = createI18nInstance('en');
    const ar = createI18nInstance('ar');
    expect(en.t('website:editor.deleteConfirmDescription')).toBe(
      'This section and its content will be removed from the draft of this page. The change reaches your website only when you publish.'
    );
    expect(en.t('website:editor.deleteConfirmDescription')).not.toContain(
      'cannot be undone'
    );
    expect(ar.t('website:editor.deleteConfirmDescription')).toContain(
      'مسودة هذه الصفحة'
    );
  });
});

describe('B2 V34/V02 — names in the dashboard language; a tidy header', () => {
  it('the Arabic dashboard names the preview language and the Home page in Arabic', () => {
    renderEditor('ar');
    expect(
      screen.getByTestId('website-editor-preview-locale').textContent
    ).toContain('الإنجليزية');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'الرئيسية'
    );
  });

  it('a title the owner typed is shown as typed', () => {
    page = makePage({ title: 'Start here' });
    renderEditor('ar');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Start here'
    );
  });

  it('SEO and History sit in one "More" menu', () => {
    renderEditor();
    expect(screen.getByTestId('website-page-more').textContent).toContain(
      'More'
    );
    expect(screen.queryByRole('button', { name: 'Edit SEO' })).toBeNull();
  });
});
