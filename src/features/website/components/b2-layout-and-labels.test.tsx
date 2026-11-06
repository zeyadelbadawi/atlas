/**
 * B2 (UX audit) — smaller fixes, each with its own reason:
 * - V01: the "Add section" menu is bounded by the room on screen and
 *   scrolls inside (21 types are taller than any screen);
 * - V02: the shared page header wraps its actions onto their own row
 *   instead of squeezing the title (and never widens the page);
 * - V34: content languages and default core page titles in the
 *   dashboard's language; a typed title as typed;
 * - V10: a server length violation without its number gets the form's
 *   limit, or a message that needs no number;
 * - V20: which buttons are "Web address" buttons without one.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@services';
import { PageHeader } from '@components/layout';
import { SectionTree } from './SectionTree';
import {
  contentLocaleLabelKey,
  corePageTitleKey,
  useDisplayPageTitle,
} from './website-display-labels';
import { TOO_LONG_MESSAGE_KEY, useViolationLimits } from './server-violations';
import {
  BUTTON_URL_REQUIRED_KEY,
  collectButtonTargetIssues,
} from './section-button-issues';

vi.mock('@features/customer-requests', () => ({
  CreateCustomerRequestDialog: () => null,
  useCanRequestCustomerServices: () => false,
}));

afterEach(cleanup);

const withI18n =
  (language: 'en' | 'ar') =>
  ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18nInstance(language)}>
      {children}
    </I18nextProvider>
  );

describe('B2 V01 — the Add section menu fits the screen', () => {
  it('is bounded by the available height and scrolls inside', async () => {
    render(
      <SectionTree
        sections={[]}
        canManage
        onSelect={vi.fn()}
        onToggleEnabled={vi.fn()}
        onToggleVisibility={vi.fn()}
        onMove={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onAdd={vi.fn()}
      />,
      { wrapper: withI18n('en') }
    );
    const trigger = screen.getByRole('button', { name: 'Add section' });
    await act(async () => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
      fireEvent.keyDown(trigger, { key: 'Enter' });
    });
    const menu = await screen.findByTestId('add-section-menu');
    expect(menu.className).toContain(
      'max-h-[var(--radix-dropdown-menu-content-available-height)]'
    );
    expect(menu.className).toContain('overflow-y-auto');
  });
});

describe('B2 V02 — the page header wraps its actions', () => {
  it('the title keeps a basis; the actions wrap and never exceed the width', () => {
    render(
      <MemoryRouter>
        <PageHeader
          titleKey="website:editor.title"
          title="Home"
          descriptionKey="website:editor.subtitle"
          actions={<button type="button">Act</button>}
        />
      </MemoryRouter>,
      { wrapper: withI18n('en') }
    );
    const heading = screen.getByRole('heading', { level: 1 });
    const row = heading.parentElement!.parentElement!;
    expect(row.className).toContain('sm:flex-wrap');
    expect(heading.parentElement!.className).toContain('sm:flex-[1_1_20rem]');
    const actions = screen.getByRole('button', { name: 'Act' }).parentElement!;
    expect(actions.className).toContain('max-w-full');
    expect(actions.className).toContain('flex-wrap');
  });
});

describe('B2 V34 — names in the dashboard language', () => {
  it('content languages', () => {
    const ar = createI18nInstance('ar');
    expect(ar.t(contentLocaleLabelKey('en'))).toBe('الإنجليزية');
    expect(ar.t(contentLocaleLabelKey('ar'))).toBe('العربية');
    expect(createI18nInstance('en').t(contentLocaleLabelKey('en'))).toBe(
      'English'
    );
  });

  it('a core page with its default title is named in Arabic; a typed title is kept', () => {
    const { result } = renderHook(() => useDisplayPageTitle(), {
      wrapper: withI18n('ar'),
    });
    expect(result.current({ coreType: 'home', title: 'Home' })).toBe(
      'الرئيسية'
    );
    expect(result.current({ coreType: 'faqs', title: 'FAQs' })).toBe(
      'الأسئلة الشائعة'
    );
    expect(result.current({ coreType: 'home', title: 'Start here' })).toBe(
      'Start here'
    );
    expect(result.current({ title: 'Home' })).toBe('Home');
    expect(corePageTitleKey({ coreType: 'about', title: 'About' })).toBe(
      'website:corePageTitles.about'
    );
  });
});

describe('B2 V10 — server length violations get their number', () => {
  it('fills the limit the API left out, keeps one it sent, and falls back without a number', () => {
    const error = createApiError('validation', {
      violations: [
        { field: 'question.en', messageKey: 'validation:maxLength' },
        {
          field: 'answer.en',
          messageKey: 'validation:maxLength',
          values: { count: 5 },
        },
        { field: 'other', messageKey: 'validation:maxLength' },
      ],
    });
    const { result } = renderHook(() =>
      useViolationLimits(error, { 'question.en': 200, 'answer.en': 2000 })
    );
    const [question, answer, other] = result.current!.violations!;
    expect(question.values).toEqual({ count: 200 });
    expect(answer.values).toEqual({ count: 5 });
    expect(other.messageKey).toBe(TOO_LONG_MESSAGE_KEY);
    expect(result.current!.kind).toBe('validation');
    const en = createI18nInstance('en');
    expect(en.t(TOO_LONG_MESSAGE_KEY, { field: 'Title' })).toBe(
      'Title is too long. Shorten it and try again.'
    );
    expect(
      createI18nInstance('ar').t(TOO_LONG_MESSAGE_KEY, { field: 'العنوان' })
    ).toContain('أطول من المسموح');
  });
});

describe('B2 V20 — "Web address" buttons without an address', () => {
  it('finds them in the button slots and a single button field', () => {
    expect(
      collectButtonTargetIssues('hero', {
        cta: { label: { en: 'Go', ar: '' }, url: '' },
        secondaryCta: { label: { en: 'B', ar: '' }, url: 'https://x.dev' },
        tertiaryCta: { label: { en: 'C', ar: '' }, pageId: 'p1' },
      })
    ).toEqual([{ path: 'cta.url', messageKey: BUTTON_URL_REQUIRED_KEY }]);
    expect(
      collectButtonTargetIssues('faq', {
        cta: { label: { en: 'All', ar: '' }, url: '  ' },
      })
    ).toEqual([{ path: 'cta.url', messageKey: BUTTON_URL_REQUIRED_KEY }]);
  });

  it('leaves other link types alone', () => {
    expect(
      collectButtonTargetIssues('hero', {
        cta: { label: { en: 'Go', ar: '' }, whatsapp: '' },
        secondaryCta: { label: { en: 'B', ar: '' }, authAction: 'signUp' },
      })
    ).toEqual([]);
  });
});
