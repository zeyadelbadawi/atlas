/**
 * The status-change confirmation states the customer impact of the TARGET
 * state before anything is sent, and only calls back on confirm.
 *
 * This is the human safeguard on a customer-facing switch: publishing,
 * unpublishing, or hiding an add-on across every academy is a decision the
 * operator must actually make, and one they must be able to back out of.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ChangeCatalogStatusDialog } from './components/ChangeCatalogStatusDialog';
import type { AddOnCatalogStatus, PlatformAddOnRow } from './types';

const addOn: PlatformAddOnRow = {
  id: 'a1',
  key: 'live-sessions',
  name: 'Live Sessions',
  description: 'Run live classes.',
  catalogStatus: 'coming_soon',
  installCount: 0,
  enabledCount: 0,
  version: 2,
  updatedAt: '2026-09-01T10:00:00Z',
};

function renderDialog(
  target: AddOnCatalogStatus,
  onConfirm = vi.fn(),
  onOpenChange = vi.fn(),
  language = 'en',
) {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  render(
    <I18nextProvider i18n={i18n}>
      <ChangeCatalogStatusDialog
        open
        onOpenChange={onOpenChange}
        addOn={addOn}
        targetStatus={target}
        isSubmitting={false}
        onConfirm={onConfirm}
      />
    </I18nextProvider>,
  );
  return { onConfirm, onOpenChange };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChangeCatalogStatusDialog', () => {
  it('states the PUBLISHED impact, and that it does not install for anyone', () => {
    renderDialog('published');
    expect(
      screen.getByText(/can install it under the usual entitlement rules/i),
    ).toBeTruthy();
    expect(screen.getByText(/does not install or enable it for anyone/i)).toBeTruthy();
  });

  it('states the COMING SOON impact (visible, not installable)', () => {
    renderDialog('coming_soon');
    expect(screen.getByText(/"Coming Soon" label, but cannot install it yet/i)).toBeTruthy();
  });

  it('states the DRAFT impact (hidden entirely, existing installs kept)', () => {
    renderDialog('draft');
    expect(screen.getByText(/will not see this add-on in the store at all/i)).toBeTruthy();
  });

  it('calls onConfirm when the operator applies the change', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog('published');
    await user.click(screen.getByRole('button', { name: /apply change/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without confirming', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderDialog('published');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders in Arabic with no missing keys', () => {
    const { container } = (() => {
      renderDialog('published', vi.fn(), vi.fn(), 'ar');
      return { container: document.body };
    })();
    expect(container.textContent).not.toMatch(/platformAddOns:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
