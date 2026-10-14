/**
 * B0-WEB-07 — blog posts and course discussions have no reader surface
 * yet, so while `academyBlogAndForum` is off the Website Content page
 * offers Announcements only (which do reach learners, in-app) and no link
 * into blog authoring.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { FEATURE_FLAGS } from '@config';
import { WebsiteBlogContentTab } from './components/WebsiteBlogContentTab';

afterEach(cleanup);

function renderTab(language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <WebsiteBlogContentTab />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('academy blog and forum entry points', () => {
  it('are off in this build', () => {
    expect(FEATURE_FLAGS.academyBlogAndForum).toBe(false);
  });

  it('the content tab offers announcements, not blog authoring', () => {
    renderTab();
    expect(
      screen.getByRole('button', { name: /Manage announcements/ })
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Manage blog posts/ })
    ).toBeNull();
    expect(screen.queryByText('Blog')).toBeNull();
  });
});
