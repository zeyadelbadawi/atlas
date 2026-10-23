/**
 * CMS phase 3e — adding a section from a preset.
 *
 * The visual editor's library: a section with presets opens its looks in
 * the same dialog (each previewed, plus the default content), "Back"
 * returns to the list, and "Add" hands over the chosen look exactly as it
 * was built; a section without presets is added straight away, as before.
 * The page editor offers the same looks in a dialog of its own.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionType, WebsiteConfiguration, WebsitePage } from '@types';
import { SectionLibrary } from '../visual-editor/SectionLibrary';
import { insertSection } from '../utils/section-list.utils';
import { SectionPresetDialog } from './SectionPresetDialog';
import { presetsFor } from './section-presets.registry';
import type { PresetPreviewSource } from './preset-preview-source';

const pages = [
  { id: 'page-courses', coreType: 'courses', visible: true },
  { id: 'page-contact', coreType: 'contact', visible: true },
] as unknown as WebsitePage[];

const source: PresetPreviewSource = {
  academyId: 'a1',
  academyName: 'Acme Academy',
  configuration: {
    themeKey: 'riwaq',
    brand: {},
    navigation: [],
    header: {},
    footer: {},
  } as unknown as WebsiteConfiguration,
  pages,
  locale: 'en',
};

function wrap(node: ReactNode, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      {node}
    </I18nextProvider>
  );
}

afterEach(cleanup);

describe('section library — presets', () => {
  function renderLibrary(onPick = vi.fn()) {
    wrap(
      <SectionLibrary
        open
        onOpenChange={() => undefined}
        onPick={onPick}
        previewSource={source}
      />
    );
    return onPick;
  }

  it('says how many looks a section has', () => {
    renderLibrary();
    const hero = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('data-section-type') === 'hero')!;
    expect(hero.textContent).toContain(`${presetsFor('hero').length} looks`);
  });

  it('opens the looks of a section with presets, each with a preview, and the default', () => {
    const onPick = renderLibrary();
    fireEvent.click(
      document.querySelector('[data-section-type="hero"]') as HTMLElement
    );
    expect(onPick).not.toHaveBeenCalled();
    const picker = screen.getByTestId('section-preset-picker');
    expect(document.activeElement).toBe(
      within(picker).getByRole('heading', { name: 'Hero: choose a look' })
    );
    const radios = within(picker).getAllByRole('radio');
    expect(radios).toHaveLength(presetsFor('hero').length + 1);
    // The first look is chosen; every look has a miniature.
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect(
      (
        within(picker).getByRole('radio', {
          name: 'Image beside text',
        }) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(within(picker).getByRole('radio', { name: 'Default' })).toBeTruthy();
    expect(within(picker).getAllByTestId('preset-mini-preview')).toHaveLength(
      presetsFor('hero').length
    );
  });

  it('adds the chosen look, as built, where the author asked', () => {
    const onPick = renderLibrary();
    fireEvent.click(
      document.querySelector('[data-section-type="hero"]') as HTMLElement
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Centred, no image' }));
    fireEvent.click(screen.getByTestId('preset-add'));
    expect(onPick).toHaveBeenCalledTimes(1);
    const [type, start] = onPick.mock.calls[0] as [
      SectionType,
      { config: Record<string, unknown> },
    ];
    expect(type).toBe('hero');
    expect(start.config).toMatchObject({
      title: {
        en: 'Every lesson brings you closer',
        ar: 'كل درس يقرّبك من هدفك',
      },
      cta: { authAction: 'signUp' },
      secondaryCta: { pageId: 'page-courses' },
    });
    expect(start.config).not.toHaveProperty('image');
  });

  it('keeps the default content as a choice', () => {
    const onPick = renderLibrary();
    fireEvent.click(
      document.querySelector('[data-section-type="faq"]') as HTMLElement
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Default' }));
    fireEvent.click(screen.getByTestId('preset-add'));
    expect(onPick).toHaveBeenCalledWith('faq', undefined);
  });

  it('goes back to the list as it was left', () => {
    renderLibrary();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'about' },
    });
    fireEvent.click(
      document.querySelector('[data-section-type="about"]') as HTMLElement
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Back to all sections' })
    );
    expect(screen.queryByTestId('section-preset-picker')).toBeNull();
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
      'about'
    );
  });

  it('adds a section without presets straight away, as before', () => {
    const onPick = renderLibrary();
    fireEvent.click(
      document.querySelector('[data-section-type="gallery"]') as HTMLElement
    );
    expect(onPick).toHaveBeenCalledWith('gallery');
    expect(screen.queryByTestId('section-preset-picker')).toBeNull();
  });

  it('is translated in Arabic', () => {
    wrap(
      <SectionLibrary
        open
        onOpenChange={() => undefined}
        onPick={vi.fn()}
        previewSource={{ ...source, locale: 'ar' }}
      />,
      'ar'
    );
    fireEvent.click(
      document.querySelector('[data-section-type="cta"]') as HTMLElement
    );
    expect(
      screen.getByRole('button', { name: 'العودة إلى كل الأقسام' })
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'الافتراضي' })).toBeTruthy();
    expect(screen.getByTestId('preset-add').textContent).toContain(
      'إضافة القسم'
    );
  });
});

describe('page editor — preset dialog', () => {
  it('offers the looks of the section being added and adds the chosen one', () => {
    const onAdd = vi.fn();
    wrap(
      <SectionPresetDialog
        type="pricing"
        source={source}
        onClose={() => undefined}
        onAdd={onAdd}
      />
    );
    const dialog = screen.getByTestId('section-preset-dialog');
    // No "Back": the dialog closes instead.
    expect(
      within(dialog).queryByRole('button', { name: 'Back to all sections' })
    ).toBeNull();
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'One course fee' })
    );
    fireEvent.click(within(dialog).getByTestId('preset-add'));
    const [type, start] = onAdd.mock.calls[0];
    expect(type).toBe('pricing');
    expect(start.config.plans).toHaveLength(1);
    expect(start.design).toEqual({ align: 'center' });
  });

  it('is closed without a section', () => {
    wrap(
      <SectionPresetDialog
        type={null}
        source={source}
        onClose={() => undefined}
        onAdd={vi.fn()}
      />
    );
    expect(screen.queryByTestId('section-preset-dialog')).toBeNull();
  });
});

describe('insertSection — from a preset', () => {
  it('places the preset’s content and design', () => {
    const start = presetsFor('testimonials')[0].build({
      themeKey: 'manara',
      pages: [],
    });
    const { sections, id } = insertSection([], 'testimonials', 0, 'new', start);
    expect(id).toBe('new');
    expect(sections[0]).toMatchObject({
      id: 'new',
      type: 'testimonials',
      enabled: true,
      config: start.config,
      design: start.design,
    });
  });

  it('keeps the default content without one', () => {
    const { sections } = insertSection([], 'faq', 0, 'new');
    expect(sections[0].config).toEqual({ items: [] });
    expect(sections[0]).not.toHaveProperty('design');
  });
});
