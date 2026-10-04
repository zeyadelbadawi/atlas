/**
 * Content limits in the Section Editor: a live per-language counter, an
 * actionable over-limit message that never truncates the text, field-level
 * errors (per item, per language) on a refused Apply with focus on the first
 * one, legacy over-limit content flagged on open, the API's issues mapped to
 * the same fields, and theme-only fields offered only to their theme.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import {
  MAX_HERO_DESCRIPTION_LENGTH,
  MAX_HERO_TITLE_LENGTH,
  MAX_STEP_TITLE_LENGTH,
} from '../constants/website.constants';
import type { SectionContentIssue } from '../schemas/section-content-issues';
import type {
  HeroSectionConfig,
  SectionConfigMap,
  SectionType,
  StepsSectionConfig,
  WebsiteThemeKey,
} from '@types';

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
// The live preview renders through the real theme packs; it is not under
// test here and would only slow the suite down.
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
    themeKey = 'modern-education',
    serverIssues,
    onSave = vi.fn(),
  }: {
    language?: 'en' | 'ar';
    themeKey?: WebsiteThemeKey;
    serverIssues?: readonly SectionContentIssue[];
    onSave?: (config: SectionConfigMap[T]) => void;
  } = {}
) {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <SectionConfigForm
        type={type}
        academyId="a1"
        initialConfig={initialConfig}
        pages={[]}
        configuration={{ themeKey, brand: BRAND }}
        onSave={onSave}
        onCancel={() => undefined}
        isSaving={false}
        serverIssues={serverIssues}
      />
    </I18nextProvider>
  );
  return { onSave };
}

const input = (id: string) =>
  document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
const describedBy = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '').split(' ');
const apply = (language: 'en' | 'ar' = 'en') =>
  fireEvent.click(
    screen.getByRole('button', {
      name: language === 'en' ? 'Apply changes' : 'تطبيق التغييرات',
    })
  );

afterEach(cleanup);

describe('SectionConfigForm — content limits', () => {
  it('counts each language live and links the counter to its input', () => {
    renderForm<'hero'>('hero', { title: lt('Learn', 'تعلّم') });

    const en = input('section-field-title-en');
    expect(
      screen.getByTestId('section-field-title-en-count').textContent
    ).toContain(`5 / ${MAX_HERO_TITLE_LENGTH}`);
    expect(
      screen.getByTestId('section-field-title-ar-count').textContent
    ).toContain(`5 / ${MAX_HERO_TITLE_LENGTH}`);
    expect(describedBy(en)).toContain('section-field-title-en-count');
    expect(en.getAttribute('maxlength')).toBeNull();

    fireEvent.change(en, { target: { value: 'Learn more' } });
    expect(
      screen.getByTestId('section-field-title-en-count').textContent
    ).toContain(`10 / ${MAX_HERO_TITLE_LENGTH}`);
  });

  it('accepts text at exactly the limit', () => {
    const { onSave } = renderForm<'hero'>('hero', { title: lt('Learn') });
    fireEvent.change(input('section-field-title-en'), {
      target: { value: 'a'.repeat(MAX_HERO_TITLE_LENGTH) },
    });
    expect(screen.queryByTestId('section-field-title-en-message')).toBeNull();
    apply();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('over the limit: keeps every character, says what to do, blocks Apply and focuses the field', () => {
    const { onSave } = renderForm<'hero'>('hero', { title: lt('Learn') });
    const en = input('section-field-title-en');
    const tooLong = 'a'.repeat(MAX_HERO_TITLE_LENGTH + 1);
    fireEvent.change(en, { target: { value: tooLong } });

    expect(en.value).toBe(tooLong);
    const counter = screen.getByTestId('section-field-title-en-count');
    expect(counter.className).toContain('text-destructive');
    expect(
      screen.getByTestId('section-field-title-en-message').textContent
    ).toBe(`Shorten to ${MAX_HERO_TITLE_LENGTH} characters or fewer`);
    expect(en.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy(en)).toEqual([
      'section-field-title-en-count',
      'section-field-title-en-message',
    ]);

    apply();
    expect(onSave).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(en);
    const summary = screen.getByTestId('section-form-issues');
    expect(summary.getAttribute('role')).toBe('alert');
    expect(summary.textContent).toContain(
      `Title · English: Shorten to ${MAX_HERO_TITLE_LENGTH} characters or fewer`
    );
  });

  it('legacy content over a tightened limit opens untruncated, already flagged', () => {
    const legacy = 'x'.repeat(2000);
    const config: HeroSectionConfig = {
      title: lt('Learn'),
      description: lt(legacy),
    };
    renderForm<'hero'>('hero', config);

    expect(input('section-field-description-en').value).toBe(legacy);
    expect(
      screen.getByTestId('section-field-description-en-message').textContent
    ).toBe(`Shorten to ${MAX_HERO_DESCRIPTION_LENGTH} characters or fewer`);
    const summary = screen.getByTestId('section-form-issues');
    expect(summary.getAttribute('role')).toBe('status');
    expect(summary.textContent).toContain('One text is longer');
  });

  it('a fresh section is not covered in errors until Apply is tried', () => {
    const { onSave } = renderForm<'hero'>('hero', { title: lt('') });
    expect(screen.queryByTestId('section-form-issues')).toBeNull();

    apply();
    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByTestId('section-field-title-en-message').textContent
    ).toBe('Title is required');
    expect(document.activeElement).toBe(input('section-field-title-en'));
  });

  it('Arabic: the message is Arabic, the counter reads left to right, and diacritics count', () => {
    // 36 letter + fatha pairs = 72 UTF-16 code units, which is what zod counts.
    const vowelled = 'عَ'.repeat(36);
    renderForm<'hero'>(
      'hero',
      { title: lt('Learn', vowelled) },
      { language: 'ar' }
    );

    const counter = screen.getByTestId('section-field-title-ar-count');
    expect(counter.textContent).toContain(`72 / ${MAX_HERO_TITLE_LENGTH}`);
    expect(counter.querySelector('[dir="ltr"]')).not.toBeNull();
    expect(
      screen.getByTestId('section-field-title-ar-message').textContent
    ).toBe(`اختصر النص إلى ${MAX_HERO_TITLE_LENGTH} حرفًا أو أقل`);
  });

  it('repeatable items: each item and language gets its own counter and message', () => {
    const config: StepsSectionConfig = {
      items: [
        { id: 's1', title: lt('Read') },
        { id: 's2', title: lt('Work', 'ع'.repeat(MAX_STEP_TITLE_LENGTH + 1)) },
      ],
    };
    const { onSave } = renderForm<'steps'>('steps', config);

    expect(
      screen.getByTestId('section-field-items-0-title-en-count').textContent
    ).toContain(`4 / ${MAX_STEP_TITLE_LENGTH}`);
    expect(
      screen.queryByTestId('section-field-items-0-title-ar-message')
    ).toBeNull();
    expect(
      screen.getByTestId('section-field-items-1-title-ar-message').textContent
    ).toBe(`Shorten to ${MAX_STEP_TITLE_LENGTH} characters or fewer`);

    apply();
    expect(onSave).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      input('section-field-items-1-title-ar')
    );
    expect(screen.getByTestId('section-form-issues').textContent).toContain(
      'Step 2 · Title · Arabic'
    );
  });

  it('shows the API’s issues from a refused page save on the matching field', () => {
    renderForm<'hero'>(
      'hero',
      { title: lt('Learn'), image: 'blob:https://x/1' },
      {
        serverIssues: [
          { path: 'image', messageKey: 'validation:invalidImage' },
        ],
      }
    );
    expect(screen.getByTestId('section-form-issues').textContent).toContain(
      'Image: Use an image from your media library'
    );
  });

  it('offers the steps plate only under a theme that draws it', () => {
    renderForm<'steps'>('steps', { items: [] });
    expect(screen.queryByText('Image description (alt text)')).toBeNull();
    cleanup();

    const { onSave } = renderForm<'steps'>(
      'steps',
      { items: [], image: 'theme-asset:atelier/home-method' },
      { themeKey: 'atelier' }
    );
    expect(screen.getByText('Image description (alt text)')).not.toBeNull();
    fireEvent.change(input('section-field-imageAlt-en'), {
      target: { value: 'An open notebook' },
    });
    apply();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        image: 'theme-asset:atelier/home-method',
        imageAlt: { en: 'An open notebook', ar: '' },
      })
    );
  });
});
