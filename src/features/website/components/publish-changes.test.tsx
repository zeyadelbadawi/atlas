/**
 * Draft and live are separate (2 Oct 2026): while the site is live the
 * publish bar offers "Publish changes" next to "Unpublish" and says what is
 * still unpublished — so an Owner never has to take the site offline, or
 * guess, to make a saved change public.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsitePublishBar } from './WebsitePublishBar';

const publishMutate = vi.fn();
const unpublishMutate = vi.fn();
const confirm = vi.fn();
let canPublish = true;

vi.mock('../hooks', () => ({
  useWebsitePages: () => ({ data: { items: [] } }),
  usePublishWebsite: () => ({
    mutate: publishMutate,
    isPending: false,
    error: null,
  }),
  useUnpublishWebsite: () => ({
    mutate: unpublishMutate,
    isPending: false,
    error: null,
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => canPublish }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
}));

const wrap = (language: 'en' | 'ar', children: ReactNode) =>
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );

beforeEach(() => {
  canPublish = true;
  publishMutate.mockReset();
  unpublishMutate.mockReset();
  confirm.mockReset();
});
afterEach(cleanup);

describe('publish bar while the site is live', () => {
  it('offers Publish changes and says what is pending', async () => {
    confirm.mockResolvedValue(true);
    wrap(
      'en',
      <WebsitePublishBar
        academyId="a1"
        status="published"
        unpublishedChanges={{ configuration: true, pages: 2 }}
      />
    );
    expect(screen.getByTestId('website-publish-hint').textContent).toBe(
      'This website is live. Site settings and 2 pages have unpublished changes.'
    );
    const publishChanges = screen.getByTestId('website-publish-changes');
    expect(publishChanges).toHaveProperty('disabled', false);
    fireEvent.click(publishChanges);
    await waitFor(() => expect(publishMutate).toHaveBeenCalledWith('a1'));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'website:publish.publishChangesConfirmTitle',
      })
    );
    expect(unpublishMutate).not.toHaveBeenCalled();
  });

  it('says the site is up to date, and Publish changes is disabled, when nothing is pending', () => {
    wrap(
      'en',
      <WebsitePublishBar
        academyId="a1"
        status="published"
        unpublishedChanges={{ configuration: false, pages: 0 }}
      />
    );
    expect(screen.getByTestId('website-publish-hint').textContent).toBe(
      'This website is live and shows everything you have saved.'
    );
    expect(screen.getByTestId('website-publish-changes')).toHaveProperty(
      'disabled',
      true
    );
  });

  it('keeps Unpublish as its own, destructive action', async () => {
    confirm.mockResolvedValue(true);
    wrap(
      'en',
      <WebsitePublishBar
        academyId="a1"
        status="published"
        unpublishedChanges={{ configuration: false, pages: 1 }}
      />
    );
    fireEvent.click(screen.getByTestId('website-publish-toggle'));
    await waitFor(() => expect(unpublishMutate).toHaveBeenCalledWith('a1'));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'destructive' })
    );
    expect(publishMutate).not.toHaveBeenCalled();
  });

  it('uses Arabic plural forms for the pending summary', () => {
    wrap(
      'ar',
      <WebsitePublishBar
        academyId="a1"
        status="published"
        unpublishedChanges={{ configuration: false, pages: 2 }}
      />
    );
    expect(screen.getByTestId('website-publish-hint').textContent).toContain(
      'توجد تغييرات غير منشورة في صفحتين.'
    );
    expect(screen.getByTestId('website-publish-changes').textContent).toBe(
      'نشر التغييرات'
    );
  });

  it('shows no publish controls without the publish permission', () => {
    canPublish = false;
    wrap(
      'en',
      <WebsitePublishBar
        academyId="a1"
        status="published"
        unpublishedChanges={{ configuration: true, pages: 0 }}
      />
    );
    expect(screen.queryByTestId('website-publish-changes')).toBeNull();
    expect(screen.queryByTestId('website-publish-toggle')).toBeNull();
  });
});
