/**
 * Website Settings → Social links (Task B): the platform is chosen from the
 * catalogue, never typed; legacy free-text links are read, kept, and
 * normalised only when edited; addresses must be web pages.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteFooterLink } from '@types';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

import { SocialLinksEditor } from './SocialLinksEditor';

beforeAll(() => {
  // Radix Select needs these in jsdom.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
  cleanup();
  toast.mockReset();
});

const lt = (en: string, ar = '') => ({ en, ar });

function renderEditor(links: WebsiteFooterLink[], locale: 'en' | 'ar' = 'en') {
  const onChange = vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <SocialLinksEditor links={links} onChange={onChange} />
    </I18nextProvider>
  );
  return onChange;
}

const rows = () => screen.queryAllByTestId('social-link-row');

describe('SocialLinksEditor', () => {
  it('has no free-text platform field: a platform select and a URL field per row', () => {
    renderEditor([
      {
        id: 's1',
        label: lt('Instagram'),
        url: 'https://instagram.com/a',
        platform: 'instagram',
      },
    ]);
    const [row] = rows();
    expect(
      within(row).getByTestId('social-platform-select').textContent
    ).toContain('Instagram');
    expect(within(row).getAllByRole('textbox')).toHaveLength(1); // the URL only
    expect(
      (within(row).getByTestId('social-url-input') as HTMLInputElement).value
    ).toBe('https://instagram.com/a');
  });

  it('reads a legacy link: the platform its label names is shown, nothing is lost', () => {
    renderEditor([
      { id: 's1', label: lt('FACEBOOK'), url: 'https://facebook.com/a' },
    ]);
    expect(screen.getByTestId('social-platform-select').textContent).toContain(
      'Facebook'
    );
    expect(screen.queryByText(/Saved as/)).toBeNull();
  });

  it('keeps an unidentifiable legacy link, showing its saved label until a platform is chosen', () => {
    renderEditor([
      {
        id: 's1',
        label: lt('Our newsletter'),
        url: 'https://news.example.com',
      },
    ]);
    expect(screen.getByTestId('social-platform-select').textContent).toContain(
      'Choose a platform'
    );
    expect(screen.getByText(/Saved as “Our newsletter”/)).toBeTruthy();
  });

  it('choosing a platform stores its identifier (and its name as the label)', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([
      {
        id: 's1',
        label: lt('Our newsletter'),
        url: 'https://news.example.com',
      },
    ]);
    await user.click(screen.getByTestId('social-platform-select'));
    await user.click(await screen.findByRole('option', { name: 'Telegram' }));
    expect(onChange).toHaveBeenCalledWith([
      {
        id: 's1',
        label: lt('Telegram', 'Telegram'),
        url: 'https://news.example.com',
        platform: 'telegram',
      },
    ]);
  });

  it('offers the whole catalogue in the select', async () => {
    const user = userEvent.setup();
    renderEditor([
      { id: 's1', label: lt('Instagram'), url: '', platform: 'instagram' },
    ]);
    await user.click(screen.getByTestId('social-platform-select'));
    const names = (await screen.findAllByRole('option')).map(
      (o) => o.textContent
    );
    for (const name of [
      'Facebook',
      'Instagram',
      'X',
      'TikTok',
      'LinkedIn',
      'YouTube',
      'WhatsApp',
      'Telegram',
    ]) {
      expect(names).toContain(name);
    }
  });

  it('saving a legacy row normalises it to a structured platform', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([
      { id: 's1', label: lt('insta'), url: 'https://instagram.com/a' },
    ]);
    const input = screen.getByTestId('social-url-input');
    await user.clear(input);
    await user.type(input, 'https://instagram.com/b');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith([
      {
        id: 's1',
        label: lt('Instagram', 'Instagram'),
        url: 'https://instagram.com/b',
        platform: 'instagram',
      },
    ]);
  });

  it('refuses unsafe or non-web addresses', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([
      { id: 's1', label: lt('X'), url: '', platform: 'x' },
    ]);
    for (const bad of [
      'javascript:alert(1)',
      'instagram.com/acme',
      'mailto:a@b.co',
    ]) {
      const input = screen.getByTestId('social-url-input');
      await user.clear(input);
      await user.type(input, bad);
      await user.tab();
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledTimes(3);
  });

  it('refuses the same platform and address twice', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([
      { id: 's1', label: lt('X'), url: 'https://x.com/acme', platform: 'x' },
      { id: 's2', label: lt('X'), url: '', platform: 'x' },
    ]);
    const input = screen.getAllByTestId('social-url-input')[1];
    await user.type(input, 'https://x.com/acme/');
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'This link is already in your social links.',
      })
    );
  });

  it('adds a row with the first platform not used yet, and removes a row', async () => {
    const user = userEvent.setup();
    const onChange = renderEditor([
      {
        id: 's1',
        label: lt('Facebook'),
        url: 'https://facebook.com/a',
        platform: 'facebook',
      },
    ]);
    await user.click(screen.getByRole('button', { name: 'Add link' }));
    const added = onChange.mock.calls[0][0] as WebsiteFooterLink[];
    expect(added).toHaveLength(2);
    expect(added[1]).toMatchObject({
      platform: 'instagram',
      url: '',
      label: lt('Instagram', 'Instagram'),
    });

    await user.click(
      screen.getByRole('button', { name: 'Remove Facebook link' })
    );
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('Arabic: translated labels; the address field stays left-to-right', () => {
    renderEditor(
      [{ id: 's1', label: lt('YouTube'), url: '', platform: 'youtube' }],
      'ar'
    );
    expect(screen.getByText('روابط التواصل الاجتماعي')).toBeTruthy();
    expect(screen.getByText('المنصة')).toBeTruthy();
    expect(screen.getByTestId('social-url-input').getAttribute('dir')).toBe(
      'ltr'
    );
  });
});
