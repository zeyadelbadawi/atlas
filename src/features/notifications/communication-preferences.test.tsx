/**
 * The communication preferences matrix and its data-wired panel.
 *
 * WHAT THESE PROTECT:
 *
 * 1. LOCKED ROWS HAVE NO CONTROL. The temptation is a disabled switch,
 *    which announces as a switch and invites the "why can't I" support
 *    ticket. The contract's `locked: true` must render as a labelled
 *    "Always on" pill and nothing interactive — and that must come from
 *    the contract, so a locked row is detected by shape, not by name.
 *
 * 2. A MUTABLE CONTROL EMITS THE EXACT PATCH BODY. The backend accepts a
 *    partial; the matrix must send only the category that changed, with
 *    both of its fields, or a digest change would silently reset email.
 *
 * 3. EVERY CONTROL IS DESCRIBED. `aria-describedby` on each switch and
 *    select, pointing at a description that exists in the document.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { CommunicationPreferences } from '@types';

const useCommunicationPreferences = vi.fn();
const mutate = vi.fn();

vi.mock('./hooks', () => ({
  useCommunicationPreferences: () => useCommunicationPreferences() as unknown,
  useUpdateCommunicationPreferences: () => ({ mutate, isPending: false }),
}));

import { CommunicationPreferencesMatrix } from './components/CommunicationPreferencesMatrix';
import { CommunicationPreferencesPanel } from './components/CommunicationPreferencesPanel';
import { applyCommunicationPreferencesUpdate } from './hooks/useUpdateCommunicationPreferences';

const PREFERENCES: CommunicationPreferences = {
  language: 'en',
  categories: {
    security: { email: true, locked: true },
    transactional: { email: true, locked: true },
    lifecycle: { email: true, locked: true, reminders: true },
    engagement: { email: true, digest: 'daily' },
    operational: { email: false, digest: 'immediate' },
  },
};

function renderWithI18n(ui: JSX.Element, language: 'en' | 'ar' = 'en') {
  const i18n = createI18nInstance(language);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

function rowNamed(title: string): HTMLElement {
  const heading = screen.getByText(title);
  const row = heading.closest('li');
  if (!row) throw new Error(`No row for ${title}`);
  return row;
}

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CommunicationPreferencesMatrix', () => {
  it('renders locked rows as "Always on" with nothing interactive', () => {
    renderWithI18n(
      <CommunicationPreferencesMatrix value={PREFERENCES} onChange={vi.fn()} />
    );

    for (const title of ['Security', 'Receipts and orders']) {
      const row = rowNamed(title);
      expect(within(row).getByText('Always on')).toBeTruthy();
      expect(within(row).queryByRole('switch')).toBeNull();
      expect(within(row).queryByRole('combobox')).toBeNull();
    }

    // Lifecycle is locked too, but its reminders sub-switch is mutable.
    const lifecycle = rowNamed('Account and courses');
    expect(within(lifecycle).getByText('Always on')).toBeTruthy();
    expect(within(lifecycle).getAllByRole('switch')).toHaveLength(1);
  });

  it('emits the exact patch body for each mutable control', () => {
    const onChange = vi.fn();
    renderWithI18n(
      <CommunicationPreferencesMatrix value={PREFERENCES} onChange={onChange} />
    );

    fireEvent.click(
      screen.getByRole('switch', { name: 'Email for Updates and announcements' })
    );
    expect(onChange).toHaveBeenLastCalledWith({
      engagement: { email: false, digest: 'daily' },
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Reminders' }));
    expect(onChange).toHaveBeenLastCalledWith({
      lifecycle: { reminders: false },
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Email for Operations' }));
    expect(onChange).toHaveBeenLastCalledWith({
      operational: { email: true, digest: 'immediate' },
    });
  });

  it('describes every control and disables digest while email is off', () => {
    renderWithI18n(
      <CommunicationPreferencesMatrix value={PREFERENCES} onChange={vi.fn()} />
    );

    const controls = [
      ...screen.getAllByRole('switch'),
      ...screen.getAllByRole('combobox'),
    ];
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      const describedBy = control.getAttribute('aria-describedby');
      expect(describedBy, control.outerHTML).toBeTruthy();
      expect(document.getElementById(describedBy!)?.textContent).toBeTruthy();
    }

    // Operational email is off, so its digest select is not actionable.
    const digest = screen.getByRole('combobox', { name: 'Delivery for Operations' });
    expect(digest.hasAttribute('disabled')).toBe(true);
    const engagementDigest = screen.getByRole('combobox', {
      name: 'Delivery for Updates and announcements',
    });
    expect(engagementDigest.hasAttribute('disabled')).toBe(false);
  });

  it('omits the operational row when the contract says null, and hides defaults-only controls', () => {
    renderWithI18n(
      <CommunicationPreferencesMatrix
        mode="defaults"
        value={{
          ...PREFERENCES,
          categories: { ...PREFERENCES.categories, operational: null },
        }}
        onChange={vi.fn()}
        showLanguage={false}
        showDigest={false}
        showReminders={false}
      />
    );

    expect(screen.queryByText('Operations')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });

  it('renders in Arabic with the same structure', () => {
    renderWithI18n(
      <CommunicationPreferencesMatrix value={PREFERENCES} onChange={vi.fn()} />,
      'ar'
    );
    expect(screen.getAllByText('مفعّل دائمًا')).toHaveLength(3);
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });
});

describe('CommunicationPreferencesPanel', () => {
  it('shows a labelled loading state', () => {
    useCommunicationPreferences.mockReturnValue({ isLoading: true });
    renderWithI18n(<CommunicationPreferencesPanel />);
    expect(
      screen.getByRole('status', { name: 'Loading email preferences' })
    ).toBeTruthy();
  });

  it('shows an error with a retry that refetches', () => {
    const refetch = vi.fn();
    useCommunicationPreferences.mockReturnValue({
      isLoading: false,
      error: new Error('boom'),
      refetch,
    });
    renderWithI18n(<CommunicationPreferencesPanel />);

    expect(screen.getByText("Couldn't load your email preferences")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('routes a change into the mutation', () => {
    useCommunicationPreferences.mockReturnValue({
      isLoading: false,
      error: null,
      data: PREFERENCES,
    });
    renderWithI18n(<CommunicationPreferencesPanel />);

    fireEvent.click(screen.getByRole('switch', { name: 'Reminders' }));
    expect(mutate).toHaveBeenCalledWith({ lifecycle: { reminders: false } });
  });
});

describe('applyCommunicationPreferencesUpdate', () => {
  it('patches only what the body names, and never resurrects a null operational row', () => {
    const next = applyCommunicationPreferencesUpdate(PREFERENCES, {
      language: 'ar',
      engagement: { email: false, digest: 'off' },
    });
    expect(next.language).toBe('ar');
    expect(next.categories.engagement).toEqual({ email: false, digest: 'off' });
    expect(next.categories.lifecycle).toEqual(PREFERENCES.categories.lifecycle);
    expect(next.categories.operational).toEqual(PREFERENCES.categories.operational);

    const learner = applyCommunicationPreferencesUpdate(
      { ...PREFERENCES, categories: { ...PREFERENCES.categories, operational: null } },
      { operational: { email: true, digest: 'daily' } }
    );
    expect(learner.categories.operational).toBeNull();
  });
});
