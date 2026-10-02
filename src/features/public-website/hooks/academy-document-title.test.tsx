/**
 * The Academy's own browser title and description on its public site
 * (2 Oct 2026): Coming Soon, sign-in, the learner area and pages without a
 * configured site title read "Atlas", and Atlas's own description stayed
 * in the head beside the Academy's.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import type { HostnameResolution } from '@types';
import {
  AcademyTitleBaselineContext,
  composeDocumentTitle,
  useAcademyHeadDefaults,
  useAcademyPageTitle,
} from './useAcademyDocumentTitle';
import { renderSeoHeadHtml, SeoHeadCollectorContext } from './useDocumentSeo';
import { AcademyComingSoon } from '../components/AcademyComingSoon';
import { buildSsrDocument } from '@/ssr/ssr-document';

const ATLAS_HEAD = `
  <title>Atlas</title>
  <meta name="description" content="The operating system for education businesses." />
  <meta property="og:title" content="Atlas" />
  <meta property="og:description" content="The operating system for education businesses." />
  <meta name="twitter:description" content="The operating system for education businesses." />`;

const description = () =>
  Array.from(document.head.querySelectorAll('meta[name="description"]')).map(
    (m) => m.getAttribute('content')
  );

beforeEach(() => {
  document.head.innerHTML = ATLAS_HEAD;
  document.title = 'Atlas';
});
afterEach(cleanup);

describe('composeDocumentTitle', () => {
  it('joins page and site, and never repeats one of them', () => {
    expect(composeDocumentTitle('About', 'Elzozo Academy')).toBe(
      'About · Elzozo Academy'
    );
    expect(composeDocumentTitle('Elzozo Academy', 'Elzozo Academy')).toBe(
      'Elzozo Academy'
    );
    expect(composeDocumentTitle('About', undefined)).toBe('About');
    expect(composeDocumentTitle('', 'Elzozo Academy')).toBe('Elzozo Academy');
  });
});

describe('useAcademyHeadDefaults', () => {
  it("titles the site with the Academy name and sets Atlas's description aside, until unmount", () => {
    const { unmount } = renderHook(() =>
      useAcademyHeadDefaults('Elzozo Academy')
    );
    expect(document.title).toBe('Elzozo Academy');
    expect(description()).toEqual([]);
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
    unmount();
    expect(document.title).toBe('Atlas');
    expect(description()).toEqual([
      'The operating system for education businesses.',
    ]);
  });

  it('keeps a title a page already set, and follows a switch to another Academy', () => {
    document.title = 'About · Elzozo Academy';
    const { rerender } = renderHook(
      ({ name }) => useAcademyHeadDefaults(name),
      {
        initialProps: { name: 'Elzozo Academy' },
      }
    );
    expect(document.title).toBe('About · Elzozo Academy');

    document.title = 'Elzozo Academy';
    rerender({ name: 'Nile Academy' });
    expect(document.title).toBe('Nile Academy');
  });

  it('changes nothing outside an Academy site', () => {
    renderHook(() => useAcademyHeadDefaults(undefined));
    expect(document.title).toBe('Atlas');
    expect(description()).toHaveLength(1);
  });
});

describe('useAcademyPageTitle', () => {
  it('sets the page title and falls back to the Academy name, never "Atlas"', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AcademyTitleBaselineContext.Provider value="Elzozo Academy">
        {children}
      </AcademyTitleBaselineContext.Provider>
    );
    const { unmount } = renderHook(
      () => useAcademyPageTitle('Sign in · Elzozo Academy'),
      {
        wrapper,
      }
    );
    expect(document.title).toBe('Sign in · Elzozo Academy');
    unmount();
    expect(document.title).toBe('Elzozo Academy');
  });
});

describe('Coming Soon', () => {
  const academy = {
    academyId: 'a1',
    academyName: 'Elzozo Academy',
  } as HostnameResolution;

  /** As in the app: under the router root's Academy head defaults. */
  function AcademyRoot({ children }: { children: ReactNode }) {
    useAcademyHeadDefaults(academy.academyName);
    return (
      <AcademyTitleBaselineContext.Provider value={academy.academyName}>
        {children}
      </AcademyTitleBaselineContext.Provider>
    );
  }

  function renderComingSoon(
    locale: 'en' | 'ar',
    collector?: { current: unknown }
  ) {
    const page = (
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <AcademyRoot>
          <AcademyComingSoon academy={academy} locale={locale} />
        </AcademyRoot>
      </I18nextProvider>
    );
    return render(
      collector ? (
        <SeoHeadCollectorContext.Provider value={collector as never}>
          {page}
        </SeoHeadCollectorContext.Provider>
      ) : (
        page
      )
    );
  }

  it('titles and describes the page with the Academy, in English and Arabic', () => {
    renderComingSoon('en');
    expect(document.title).toBe('Coming soon · Elzozo Academy');
    expect(description()).toEqual([
      'Elzozo Academy — our website is coming soon.',
    ]);
    cleanup();

    renderComingSoon('ar');
    expect(document.title).toBe('قريبًا · Elzozo Academy');
    expect(description()).toEqual(['Elzozo Academy — موقعنا قادم قريبًا.']);
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it("server-renders the same head, without Atlas's title or description", () => {
    const collector = { current: undefined as unknown };
    renderComingSoon('en', collector);
    const headHtml = renderSeoHeadHtml(
      collector.current as Parameters<typeof renderSeoHeadHtml>[0]
    );
    const html = buildSsrDocument(
      `<html><head>${ATLAS_HEAD}</head><body><div id="root"></div></body></html>`,
      {
        locale: 'en',
        direction: 'ltr',
        headHtml,
        preloadHtml: '',
        appHtml: '',
        payloadJson: '{}',
      }
    );
    expect(html).toContain('<title>Coming soon · Elzozo Academy</title>');
    expect(html).toContain(
      'content="Elzozo Academy — our website is coming soon."'
    );
    expect(html).not.toContain('<title>Atlas</title>');
    expect(html).not.toContain('operating system for education businesses');
  });
});
