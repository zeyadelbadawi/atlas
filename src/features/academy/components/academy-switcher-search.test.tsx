/**
 * The Academy Switcher opens compact: a header with a search toggle, then
 * the list. The search field exists only once asked for — by the toggle or
 * by typing on the list — and Escape closes the search before the dropdown.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

// jsdom has no ResizeObserver or scrollIntoView; cmdk's list uses both.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

const switchAcademy = vi.fn();

vi.mock('../hooks/useAcademies', () => ({
  useAcademies: () => ({
    data: {
      items: [
        {
          id: 'a1',
          name: 'Cairo Data Academy',
          status: 'active',
          viewerRole: 'owner',
        },
        {
          id: 'a2',
          name: 'Nile Language School',
          status: 'active',
          viewerRole: 'manager',
        },
        {
          id: 'a3',
          name: 'Delta Design Studio',
          status: 'active',
          viewerRole: 'instructor',
        },
      ],
    },
  }),
}));
vi.mock('../hooks/useSwitchAcademy', () => ({
  useSwitchAcademy: () => ({ switchAcademy }),
}));
vi.mock('../scope/academy-scope.context', () => ({
  useAcademyScope: () => ({
    academyId: undefined,
    membership: undefined,
    lostAcademyIds: new Set<string>(),
  }),
}));
vi.mock('@hooks', () => ({
  usePlatform: () => ({ activeAcademyId: 'a1' }),
}));

import { AcademySwitcher } from './AcademySwitcher';

function renderSwitcher(locale: 'en' | 'ar' = 'en') {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <div dir={dir}>
        <AcademySwitcher />
      </div>
    </I18nextProvider>
  );
}

const options = () =>
  screen
    .queryAllByTestId(/^academy-switcher-option-/)
    .map((o) => o.id && o.textContent);

afterEach(() => {
  cleanup();
  switchAcademy.mockReset();
  document.documentElement.removeAttribute('dir');
});

describe('Academy Switcher search', () => {
  it('opens compact: no search field, a search toggle, focus on the list', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));

    const toggle = await screen.findByTestId('academy-switcher-search-toggle');
    expect(screen.queryByTestId('academy-switcher-search')).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: 'Search academies…' })
    ).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Search academies');
    expect(options()).toHaveLength(3);

    const list = screen.getByRole('listbox');
    expect(document.activeElement).toBe(list);
    // An option is active, so Enter works at once.
    await waitFor(() =>
      expect(
        list.querySelector('[cmdk-item][aria-selected="true"]')
      ).not.toBeNull()
    );
  });

  it('the toggle opens the search, focuses it, and filtering still works', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await user.click(
      await screen.findByTestId('academy-switcher-search-toggle')
    );

    const input = screen.getByTestId('academy-switcher-search');
    expect(document.activeElement).toBe(input);
    const toggle = screen.getByTestId('academy-switcher-search-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      document
        .getElementById(toggle.getAttribute('aria-controls')!)
        ?.contains(input)
    ).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Close search');

    await user.type(input, 'nile');
    const listed = screen.getAllByTestId(/^academy-switcher-option-/);
    expect(listed).toHaveLength(1);
    expect(listed[0].textContent).toContain('Nile Language School');

    await user.keyboard('{Enter}');
    expect(switchAcademy).toHaveBeenCalledWith('a2');
  });

  it('closing the search restores the full list and returns focus to the toggle', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await user.click(
      await screen.findByTestId('academy-switcher-search-toggle')
    );
    await user.type(screen.getByTestId('academy-switcher-search'), 'delta');
    expect(options()).toHaveLength(1);

    await user.click(screen.getByTestId('academy-switcher-search-toggle'));
    expect(screen.queryByTestId('academy-switcher-search')).toBeNull();
    expect(options()).toHaveLength(3);
    expect(document.activeElement).toBe(
      screen.getByTestId('academy-switcher-search-toggle')
    );
  });

  it('keyboard: Enter/Space on the toggle open the search; Escape closes the search, then the dropdown', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const trigger = screen.getByTestId('academy-switcher');
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');

    // Shift+Tab from the list reaches the toggle; Space opens the search.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByTestId('academy-switcher-search-toggle')
    );
    await user.keyboard(' ');
    expect(document.activeElement).toBe(
      screen.getByTestId('academy-switcher-search')
    );
    // Choosing via Enter on the toggle never selects an academy.
    expect(switchAcademy).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('academy-switcher-search')).toBeNull();
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByTestId('academy-switcher-search-toggle')
    );

    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(
      screen.getByTestId('academy-switcher-search')
    );
    expect(switchAcademy).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('arrow keys and Enter choose an academy without opening the search', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(switchAcademy).toHaveBeenCalledWith('a2');
  });

  it('typing on the list opens the search with that character', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await screen.findByRole('listbox');
    await user.keyboard('d');
    const input = screen.getByTestId(
      'academy-switcher-search'
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('d');
    await user.keyboard('elta');
    expect(input.value).toBe('delta');
    expect(options()).toHaveLength(1);
  });

  it('reopening starts compact again', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await user.click(
      await screen.findByTestId('academy-switcher-search-toggle')
    );
    await user.keyboard('{Escape}{Escape}');
    await user.click(screen.getByTestId('academy-switcher'));
    await screen.findByRole('listbox');
    expect(screen.queryByTestId('academy-switcher-search')).toBeNull();
  });

  it('Arabic (RTL): translated header, toggle and placeholder', async () => {
    const user = userEvent.setup();
    renderSwitcher('ar');
    await user.click(screen.getByTestId('academy-switcher'));
    const toggle = await screen.findByTestId('academy-switcher-search-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('البحث في الأكاديميات');
    await user.click(toggle);
    const input = screen.getByTestId('academy-switcher-search');
    expect(input.getAttribute('placeholder')).toBe('ابحث في الأكاديميات…');
    expect(
      within(input.closest('[role="dialog"]') ?? document.body).getByText(
        'تبديل الأكاديمية'
      )
    ).toBeTruthy();
  });

  it('the search row animates only when motion is allowed, and its focus ring is inset on the field', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByTestId('academy-switcher'));
    await user.click(
      await screen.findByTestId('academy-switcher-search-toggle')
    );
    const input = screen.getByTestId('academy-switcher-search');
    const field = input.parentElement!;
    const row = field.parentElement!;
    for (const cls of row.className
      .split(/\s+/)
      .filter(
        (c) =>
          c.includes('animate') || c.includes('slide') || c.includes('fade')
      )) {
      expect(cls.startsWith('motion-safe:')).toBe(true);
    }
    expect(field.className).toContain('focus-within:ring-inset');
    expect(input.className).toContain('focus-visible:ring-0');
  });
});
