/**
 * B2 (UX audit) — the visual editor's header and autosave, EN and AR:
 * - V13: a failed autosave says why (offline says offline), with a visible
 *   word at phone width and a tap that opens the reason and Try again;
 * - V14: no autosave while "Leave without saving?" (any question) is open,
 *   so "Leave and discard" really discards; it resumes once it closes;
 * - V25: Publish always has an accessible name and is never silently
 *   grey: a tap says what stands in the way (and goes to the section);
 * - V31: the status names its count in a short form; the editing tip says
 *   "double-tap" on a touch screen;
 * - V34: the page picker and the preview language read in Arabic.
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
import { createApiError } from '@services';
import type { ReactNode } from 'react';
import type { SectionInstance, WebsitePage } from '@types';
import VisualEditorPage, { AUTOSAVE_DELAY_MS } from './VisualEditorPage';
import { SettingsPanel } from './SettingsPanel';

const cta = (id: string, title = 'Join us') =>
  ({
    id,
    type: 'cta',
    enabled: true,
    visibility: { mobile: true, tablet: true, desktop: true },
    config: {
      title: { en: title, ar: '' },
      cta: { label: { en: 'Join', ar: '' }, authAction: 'signUp' },
    },
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
    sections: [cta('s1'), cta('s2')],
    ...overrides,
  }) as unknown as WebsitePage;

let page: WebsitePage;
let updateError: unknown;
const updateMutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useWebsiteConfiguration: () => ({
    data: {
      status: 'published',
      themeKey: 'modern-education',
      defaultLocale: 'en',
      brand: {},
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
  useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));
vi.mock('../components/PreviewViewport', () => ({
  PreviewViewport: ({ toolbarEnd }: { toolbarEnd?: ReactNode }) => (
    <div>{toolbarEnd}</div>
  ),
  initialPreviewBreakpoint: () => 'desktop',
}));
vi.mock('./StructurePanel', () => ({
  StructurePanel: ({
    onToggleEnabled,
  }: {
    onToggleEnabled: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onToggleEnabled('s1')}>
      toggle-s1
    </button>
  ),
}));
vi.mock('./SectionLibrary', () => ({ SectionLibrary: () => null }));
vi.mock('./SiteSettingsPanel', () => ({ SiteSettingsPanel: () => null }));
vi.mock('./useInlineTextEditing', () => ({
  INLINE_TEXT_CSS: '',
  useInlineTextEditing: () => ({ isEditing: () => false, editing: false }),
}));
vi.mock('../components/SectionConfigForm', () => ({
  SectionConfigForm: () => null,
}));
vi.mock('./SectionDesignPanel', () => ({ SectionDesignPanel: () => null }));

/** Wide layout (the structure list is on screen) unless `wide` is false. */
function setMedia({ wide = true, coarse = false } = {}) {
  window.matchMedia = ((query: string) => ({
    matches:
      (query.includes('min-width: 1024px') && wide) ||
      (query.includes('pointer: coarse') && coarse),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderEditor(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={['/a1/p1']}>
        <Routes>
          <Route path="/:academyId/:pageId" element={<VisualEditorPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}
const edit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'toggle-s1' }));
  });
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setMedia();
  page = makePage();
  updateError = null;
  updateMutateAsync.mockReset();
});
afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-fake-question]').forEach((n) => n.remove());
  vi.useRealTimers();
});

describe('B2 V14 — no autosave behind "Leave without saving?"', () => {
  it('waits while a question is open, and saves once it closes', async () => {
    updateMutateAsync.mockResolvedValue(makePage({ version: 5 }));
    renderEditor();
    await edit();
    const question = document.createElement('div');
    question.setAttribute('role', 'alertdialog');
    question.setAttribute('data-fake-question', '');
    document.body.appendChild(question);

    await wait(AUTOSAVE_DELAY_MS * 3);
    expect(updateMutateAsync).not.toHaveBeenCalled();

    question.remove();
    await wait(AUTOSAVE_DELAY_MS * 2 + 100);
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
  });
});

describe('B2 V13 — a failed autosave says why', () => {
  it('offline: a visible word, and the reason on tap with Try again (EN)', async () => {
    updateError = createApiError('network', { messageKey: 'errors.network' });
    updateMutateAsync.mockRejectedValue(updateError);
    renderEditor();
    await edit();
    await wait(AUTOSAVE_DELAY_MS + 100);
    const trigger = screen.getByTestId('save-status-trigger');
    expect(trigger.textContent).toContain('Offline');
    await act(async () => {
      fireEvent.click(trigger);
    });
    const detail = screen.getByTestId('save-status-detail');
    expect(detail.textContent).toContain('saved as soon as you’re back online');
    expect(
      within(detail).getByRole('button', { name: 'Try again' })
    ).toBeTruthy();
  });

  it('a server error gives its reason, never a bare "Couldn’t save" (AR)', async () => {
    updateError = createApiError('server', {
      messageKey: 'errors.website.duplicateSectionId',
    });
    updateMutateAsync.mockRejectedValue(updateError);
    renderEditor('ar');
    await edit();
    await wait(AUTOSAVE_DELAY_MS + 100);
    const trigger = screen.getByTestId('save-status-trigger');
    expect(trigger.textContent).toContain('لم يُحفظ');
    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(screen.getByTestId('save-status-detail').textContent).toContain(
      'يوجد قسمان في هذه الصفحة بالمعرّف نفسه'
    );
  });
});

describe('B2 V25 — Publish is never silently grey', () => {
  it('has an accessible name at phone width, and says why on tap when nothing is new', async () => {
    setMedia({ wide: false });
    renderEditor();
    const publish = screen.getByTestId('visual-editor-publish');
    expect(publish.getAttribute('aria-label')).toBe('Publish');
    expect(publish.getAttribute('aria-disabled')).toBe('true');
    await act(async () => {
      fireEvent.click(publish);
    });
    expect(
      screen.getByTestId('visual-editor-publish-reason').textContent
    ).toContain('Nothing new to publish');
  });

  it('a section needing attention: says so and goes to it (EN, AR)', async () => {
    page = makePage({ sections: [cta('s1', ''), cta('s2')] });
    renderEditor();
    await act(async () => {
      fireEvent.click(screen.getByTestId('visual-editor-publish'));
    });
    const reason = screen.getByTestId('visual-editor-publish-reason');
    expect(reason.textContent).toContain(
      'Fix the section marked in the list before publishing.'
    );
    expect(
      within(reason).getByRole('button', { name: 'Go to the section' })
    ).toBeTruthy();
    // V31 — once edited, the status names the count in a short form.
    await edit();
    expect(screen.getByTestId('save-status-trigger').textContent).toContain(
      '1 section needs attention'
    );
    cleanup();
    renderEditor('ar');
    await act(async () => {
      fireEvent.click(screen.getByTestId('visual-editor-publish'));
    });
    expect(
      screen.getByTestId('visual-editor-publish-reason').textContent
    ).toContain('أصلِح القسم المميَّز في القائمة قبل النشر.');
  });

  it('with an edit, it publishes without a popover', async () => {
    renderEditor();
    await edit();
    const publish = screen.getByTestId('visual-editor-publish');
    expect(publish.getAttribute('aria-disabled')).toBeNull();
  });
});

describe('B2 V34 — names in the dashboard language', () => {
  it('the page picker and the preview language read in Arabic', () => {
    renderEditor('ar');
    expect(
      screen.getByTestId('visual-editor-page-picker').textContent
    ).toContain('الرئيسية');
    expect(
      screen.getByRole('combobox', { name: 'لغة المعاينة' }).textContent
    ).toContain('الإنجليزية');
  });
});

describe('B2 V31 — the editing tip fits the pointer', () => {
  const renderPanel = (language: 'en' | 'ar' = 'en') =>
    render(
      <I18nextProvider i18n={createI18nInstance(language)}>
        <SettingsPanel
          academyId="a1"
          section={cta('s1')}
          index={0}
          total={1}
          pages={[]}
          configuration={{
            themeKey: 'modern-education',
            brand: {} as never,
            defaultLocale: 'en',
          }}
          canManage
          revision={0}
          onConfigChange={() => undefined}
          onDesignChange={() => undefined}
          onToggleVisibility={() => undefined}
          onToggleEnabled={() => undefined}
          onMove={() => undefined}
          onDuplicate={() => undefined}
          onDelete={() => undefined}
          onClose={() => undefined}
        />
      </I18nextProvider>
    );

  it('says "double-tap" on a touch screen (EN, AR)', () => {
    setMedia({ coarse: true });
    renderPanel();
    expect(screen.getByTestId('inline-edit-hint').textContent).toContain(
      'double-tap'
    );
    cleanup();
    renderPanel('ar');
    expect(screen.getByTestId('inline-edit-hint').textContent).toContain(
      'انقر مرتين'
    );
  });

  it('keeps "double-click" with a mouse', () => {
    setMedia({ coarse: false });
    renderPanel();
    expect(screen.getByTestId('inline-edit-hint').textContent).toContain(
      'double-click'
    );
  });
});
