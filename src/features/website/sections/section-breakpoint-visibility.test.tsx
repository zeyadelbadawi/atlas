/**
 * B0-WEB-11 (d) — per-breakpoint section visibility reaches the rendered
 * page. Before this, the Page Composer stored the toggles and the renderer
 * ignored them: a section hidden on mobile showed on every device.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { SectionInstance } from '@types';
import { SectionRenderer } from './SectionRenderer';
import { sectionVisibilityClass } from './section-visibility.utils';
import { ThemePackContext } from '../theme-packs/ThemePackContext';
import { createBasePack } from '../theme-packs/base-pack';
import type { ThemePack } from '../theme-packs/theme-pack.types';

afterEach(() => cleanup());

const pack: ThemePack = {
  ...createBasePack('bold-creative'),
  renderers: { about: ({ config }) => <p>{config.title.en}</p> },
};

function section(visibility: SectionInstance['visibility']): SectionInstance {
  return {
    id: 'about-1',
    type: 'about',
    enabled: true,
    visibility,
    config: {
      title: { en: 'About us', ar: 'من نحن' },
      body: { en: 'We teach.', ar: 'نحن نعلّم.' },
    },
  } as SectionInstance;
}

function renderSection(visibility: SectionInstance['visibility']) {
  return render(
    <ThemePackContext.Provider value={pack}>
      <SectionRenderer
        instance={section(visibility)}
        academyId="a1"
        pages={[]}
      />
    </ThemePackContext.Provider>
  );
}

describe('section breakpoint visibility (B0-WEB-11)', () => {
  it('visible everywhere: rendered as-is, no wrapper', () => {
    const { container } = renderSection({
      desktop: true,
      tablet: true,
      mobile: true,
    });
    expect(container.querySelector('[data-section-visibility]')).toBeNull();
    expect(container.firstElementChild?.tagName).toBe('P');
  });

  it.each([
    [{ desktop: true, tablet: true, mobile: false }, ['max-md:hidden']],
    [{ desktop: true, tablet: false, mobile: true }, ['md:max-lg:hidden']],
    [{ desktop: false, tablet: true, mobile: true }, ['lg:hidden']],
    [
      { desktop: false, tablet: true, mobile: false },
      ['max-md:hidden', 'lg:hidden'],
    ],
  ])('%o → hidden with %o, layout-neutral wrapper', (visibility, classes) => {
    const { container, getByText } = renderSection(visibility);
    const wrapper = container.querySelector('[data-section-visibility]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.classList.contains('contents')).toBe(true);
    for (const name of classes)
      expect(wrapper?.classList.contains(name)).toBe(true);
    // Only the tiers switched off are hidden.
    const all = ['max-md:hidden', 'md:max-lg:hidden', 'lg:hidden'];
    for (const name of all.filter((n) => !classes.includes(n)))
      expect(wrapper?.classList.contains(name)).toBe(false);
    expect(wrapper?.contains(getByText('About us'))).toBe(true);
  });

  it('hidden at every size: nothing is rendered', () => {
    const { container } = renderSection({
      desktop: false,
      tablet: false,
      mobile: false,
    });
    expect(container.textContent).toBe('');
  });

  it('older data without a visibility object renders everywhere', () => {
    expect(sectionVisibilityClass(undefined)).toBeNull();
    const { container } = renderSection(
      undefined as unknown as SectionInstance['visibility']
    );
    expect(container.textContent).toContain('About us');
  });
});
