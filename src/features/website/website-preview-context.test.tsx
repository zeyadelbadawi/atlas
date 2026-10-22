/**
 * What the dashboard's device preview switches on, and that the public
 * site never gets it.
 *
 * - Each section sits in a box-less anchor naming it, so the section
 *   editor can scroll its page preview to the section being edited.
 * - The website's own words follow the PREVIEWED language: an English
 *   dashboard previewing the Arabic site used to show Arabic content with
 *   English buttons and footer labels.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionInstance } from '@types';
import { SectionRenderer } from './sections/SectionRenderer';
import { ThemePackContext } from './theme-packs/ThemePackContext';
import { createBasePack } from './theme-packs/base-pack';
import type { ThemePack } from './theme-packs/theme-pack.types';
import { WebsitePreviewProvider } from './renderer/WebsitePreviewContext';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';

afterEach(() => cleanup());

const pack: ThemePack = {
  ...createBasePack('bold-creative'),
  renderers: { about: ({ config }) => <p>{config.title.en}</p> },
};

const about = {
  id: 'about-1',
  type: 'about',
  enabled: true,
  config: {
    title: { en: 'About us', ar: 'من نحن' },
    body: { en: 'We teach.', ar: 'نحن نعلّم.' },
  },
} as SectionInstance;

function renderSection(isPreview: boolean) {
  return render(
    <WebsitePreviewProvider value={isPreview}>
      <ThemePackContext.Provider value={pack}>
        <SectionRenderer instance={about} academyId="a1" pages={[]} />
      </ThemePackContext.Provider>
    </WebsitePreviewProvider>
  );
}

describe('section anchors', () => {
  it('names each section in a box-less anchor in the preview', () => {
    const { container } = renderSection(true);
    const anchor = container.querySelector('[data-preview-section="about-1"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.className).toBe('contents');
    expect(anchor?.firstElementChild?.tagName).toBe('P');
  });

  it('renders the section as-is on the public site', () => {
    const { container } = renderSection(false);
    expect(container.querySelector('[data-preview-section]')).toBeNull();
    expect(container.firstElementChild?.tagName).toBe('P');
  });
});

function Language(): JSX.Element {
  const { i18n, t } = useTranslation();
  return (
    <p>
      {i18n.language}:{t('common:actions.cancel')}
    </p>
  );
}

function renderInLocale(isPreview: boolean) {
  const dashboard = createI18nInstance('en');
  render(
    <I18nextProvider i18n={dashboard}>
      <WebsitePreviewProvider value={isPreview}>
        <PublicWebsiteLocaleProvider locale="ar">
          <Language />
        </PublicWebsiteLocaleProvider>
      </WebsitePreviewProvider>
    </I18nextProvider>
  );
  return dashboard;
}

describe('the website’s own words in the preview', () => {
  it('follow the previewed language, leaving the dashboard’s alone', () => {
    const dashboard = renderInLocale(true);
    expect(screen.getByText(/^ar:/).textContent).toBe(
      `ar:${dashboard.t('common:actions.cancel', { lng: 'ar' })}`
    );
    expect(dashboard.t('common:actions.cancel')).toBe('Cancel');
    expect(dashboard.language).toBe('en');
  });

  it('are left to the page’s own language outside the preview', () => {
    renderInLocale(false);
    expect(screen.getByText(/^en:/).textContent).toBe('en:Cancel');
  });
});
