/**
 * B2 (UX audit) — the section editor's feedback, EN and AR:
 * - V18: text typed over a limit just now reads "too long — shorten it",
 *   text saved before a limit tightened keeps its own explanation, and the
 *   visual editor's panel (no Apply) says its changes save once fixed;
 * - V19: a bilingual field the site's main language must fill is marked
 *   required on that language (and only then);
 * - V20: a "Web address" button needs its address; a bad one says what a
 *   web address looks like; `javascript:` stays refused;
 * - V11: the dialog reports unapplied edits (the page editor asks before a
 *   close discards them).
 */
import { createContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import { MAX_HERO_TITLE_LENGTH } from '../constants/website.constants';
import type { HeroSectionConfig, SectionConfigMap, SectionType } from '@types';

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: undefined }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
// Images and the live preview are not under test here.
vi.mock('./WebsiteImageField', () => ({
  WebsiteImageField: () => null,
  WebsiteImageThemeContext: createContext(''),
}));
vi.mock('../sections/SectionRenderer', () => ({ SectionRenderer: () => null }));

const lt = (en: string, ar = '') => ({ en, ar });
const BRAND = {
  primaryColor: '221 83% 53%',
  secondaryColor: '221 83% 53%',
  accentColor: '221 83% 53%',
};

function renderForm<T extends SectionType>(
  type: T,
  initialConfig: SectionConfigMap[T],
  {
    language = 'en',
    variant = 'dialog',
    onSave = vi.fn(),
    onDirtyChange = vi.fn(),
  }: {
    language?: 'en' | 'ar';
    variant?: 'dialog' | 'panel';
    onSave?: (config: SectionConfigMap[T]) => void;
    onDirtyChange?: (dirty: boolean) => void;
  } = {}
) {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <SectionConfigForm
        type={type}
        academyId="a1"
        initialConfig={initialConfig}
        pages={[]}
        configuration={{ themeKey: 'modern-education', brand: BRAND }}
        onSave={onSave}
        onCancel={() => undefined}
        isSaving={false}
        variant={variant}
        onDirtyChange={onDirtyChange}
      />
    </I18nextProvider>
  );
  return { onSave, onDirtyChange };
}

const input = (id: string) =>
  document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
const summary = () => screen.getByTestId('section-form-issues');
const apply = (language: 'en' | 'ar' = 'en') =>
  fireEvent.click(
    screen.getByRole('button', {
      name: language === 'en' ? 'Apply changes' : 'تطبيق التغييرات',
    })
  );

afterEach(cleanup);

describe('B2 V18 — the summary says what the author can do', () => {
  it('text typed over the limit just now: "too long, shorten it" (EN)', () => {
    renderForm<'hero'>('hero', { title: lt('Learn') });
    fireEvent.change(input('section-field-title-en'), {
      target: { value: 'a'.repeat(200) },
    });
    const text = summary().textContent ?? '';
    expect(text).toContain(
      'This text is too long. Shorten it to apply these changes:'
    );
    expect(text).not.toContain('Your website still shows it');
  });

  it('text typed over the limit just now (AR)', () => {
    renderForm<'hero'>(
      'hero',
      { title: lt('Learn', 'تعلّم') },
      {
        language: 'ar',
      }
    );
    fireEvent.change(input('section-field-title-ar'), {
      target: { value: 'ب'.repeat(200) },
    });
    const text = summary().textContent ?? '';
    expect(text).toContain(
      'هذا النص أطول من المسموح. اختصره لتطبيق هذه التغييرات:'
    );
    expect(text).not.toContain('لا يزال يظهر على موقعك');
  });

  it('text saved before the limit tightened keeps its explanation', () => {
    renderForm<'hero'>('hero', {
      title: lt('a'.repeat(MAX_HERO_TITLE_LENGTH + 5)),
    });
    expect(summary().textContent).toContain('Your website still shows it');
  });

  it("the visual editor's panel has no Apply: its changes save once fixed", () => {
    renderForm<'hero'>('hero', { title: lt('Learn') }, { variant: 'panel' });
    fireEvent.change(input('section-field-title-en'), {
      target: { value: '' },
    });
    const text = summary().textContent ?? '';
    expect(text).toContain('Fix 1 problem so your changes can be saved:');
    expect(text).not.toContain('applying');
  });

  it("the panel's wording in Arabic", () => {
    renderForm<'hero'>(
      'hero',
      { title: lt('Learn') },
      {
        variant: 'panel',
        language: 'ar',
      }
    );
    fireEvent.change(input('section-field-title-en'), {
      target: { value: '' },
    });
    expect(summary().textContent).toContain(
      'أصلِح مشكلة واحدة حتى تُحفظ تغييراتك:'
    );
  });
});

describe('B2 V19 — the required language is marked', () => {
  const primaryLabel = (id: string) =>
    document.querySelector(`label[for="${id}"]`)?.textContent ?? '';

  it("marks the hero title's English (the main language) required, not the optional eyebrow", () => {
    renderForm<'hero'>('hero', { title: lt('Learn') });
    expect(primaryLabel('section-field-title-en')).toContain('*');
    expect(primaryLabel('section-field-title-en')).toContain('required');
    expect(input('section-field-title-en').getAttribute('aria-required')).toBe(
      'true'
    );
    expect(primaryLabel('section-field-title-ar')).toContain('optional');
    expect(primaryLabel('section-field-eyebrow-en')).not.toContain('*');
  });

  it('marks it in Arabic too', () => {
    renderForm<'hero'>('hero', { title: lt('Learn') }, { language: 'ar' });
    expect(primaryLabel('section-field-title-en')).toContain('مطلوب');
  });
});

describe('B2 V20 — a "Web address" button needs its address', () => {
  const external = (url: string): HeroSectionConfig =>
    ({
      title: lt('Learn'),
      cta: { label: lt('Go'), url },
    }) as HeroSectionConfig;
  // A section with one button opens it already.

  it('an empty address is refused on Apply, by the field, saying how to fix it', () => {
    const { onSave } = renderForm<'hero'>('hero', external(''));
    apply();
    expect(onSave).not.toHaveBeenCalled();
    expect(summary().textContent).toContain(
      'Enter the web address this button opens, starting with https://'
    );
    expect(screen.getByTestId('cta-url-error').textContent).toBe(
      'Enter the web address this button opens, starting with https://'
    );
  });

  it('a malformed address says what a web address looks like (EN and AR)', () => {
    renderForm<'hero'>('hero', external('example'));
    expect(screen.getByTestId('cta-url-error').textContent).toBe(
      'Enter a full web address starting with https://, for example https://example.com'
    );
    cleanup();
    renderForm<'hero'>('hero', external('example'), { language: 'ar' });
    expect(screen.getByTestId('cta-url-error').textContent).toContain(
      'أدخل عنوان ويب كاملًا يبدأ بـ https://'
    );
  });

  it('still refuses a javascript: address', () => {
    const { onSave } = renderForm<'hero'>(
      'hero',
      external('javascript:alert(1)')
    );
    apply();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('a full address applies', () => {
    const { onSave } = renderForm<'hero'>(
      'hero',
      external('https://example.com')
    );
    apply();
    expect(onSave).toHaveBeenCalled();
  });
});

describe('B2 V11 — the dialog reports unapplied edits', () => {
  it('dirty once something is typed, clean again when it is put back', () => {
    const { onDirtyChange } = renderForm<'hero'>('hero', {
      title: lt('Learn'),
    });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(input('section-field-title-en'), {
      target: { value: 'Learn more' },
    });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(input('section-field-title-en'), {
      target: { value: 'Learn' },
    });
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
