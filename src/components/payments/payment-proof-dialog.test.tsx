/**
 * Production QA Issue 2 — "View Proof" did nothing on mobile. The proof now
 * opens in a dialog on the tap itself and loads into it; nothing calls
 * `window.open`, so there is no popup for a mobile browser to block.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PaymentProofDialog } from './PaymentProofDialog';

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

beforeEach(() => {
  let n = 0;
  createObjectURL.mockImplementation(() => `blob:proof-${++n}`);
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  cleanup();
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
});

function renderDialog(
  load: () => Promise<Blob>,
  {
    open = true,
    language = 'en',
    fileName = 'receipt.png',
  }: { open?: boolean; language?: 'en' | 'ar'; fileName?: string } = {}
) {
  const onOpenChange = vi.fn();
  const view = (isOpen: boolean) => (
    <I18nextProvider i18n={createI18nInstance(language)}>
      <PaymentProofDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        load={load}
        fileName={fileName}
        subject="Intro to Design"
      />
    </I18nextProvider>
  );
  const result = render(view(open));
  return {
    ...result,
    onOpenChange,
    reopen: (o: boolean) => result.rerender(view(o)),
  };
}

describe('PaymentProofDialog', () => {
  it('shows an image proof inline with open and download links', async () => {
    const openSpy = vi.spyOn(window, 'open');
    const load = vi
      .fn()
      .mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    renderDialog(load);

    const image = await screen.findByTestId('payment-proof-image');
    expect(image.getAttribute('src')).toBe('blob:proof-1');
    expect(image.getAttribute('alt')).toContain('Intro to Design');
    const open = screen.getByTestId('payment-proof-open');
    expect(open.getAttribute('href')).toBe('blob:proof-1');
    expect(open.getAttribute('target')).toBe('_blank');
    const download = screen.getByTestId('payment-proof-download');
    expect(download.getAttribute('download')).toBe('receipt.png');
    expect(load).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('offers a PDF as links to tap, without an inline image', async () => {
    const load = vi
      .fn()
      .mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }));
    renderDialog(load, { fileName: 'receipt.pdf' });

    const open = await screen.findByTestId('payment-proof-open');
    expect(open.getAttribute('href')).toBe('blob:proof-1');
    expect(screen.queryByTestId('payment-proof-image')).toBeNull();
    expect(
      screen.getByTestId('payment-proof-download').getAttribute('download')
    ).toBe('receipt.pdf');
  });

  it('explains a failed load and retries on request', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Blob(['x'], { type: 'image/jpeg' }));
    renderDialog(load);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByTestId('payment-proof-image');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not load until opened, and releases the file when closed', async () => {
    const load = vi
      .fn()
      .mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    const { reopen } = renderDialog(load, { open: false });
    expect(load).not.toHaveBeenCalled();

    reopen(true);
    await screen.findByTestId('payment-proof-image');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    reopen(false);
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:proof-1')
    );
  });

  it('ignores a load that finishes after the dialog was closed', async () => {
    let resolve!: (blob: Blob) => void;
    const load = vi.fn(() => new Promise<Blob>((r) => (resolve = r)));
    const { reopen } = renderDialog(load);
    reopen(false);
    await act(async () => resolve(new Blob(['x'], { type: 'image/png' })));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('renders in Arabic without raw keys', async () => {
    const load = vi
      .fn()
      .mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    renderDialog(load, { language: 'ar' });

    await screen.findByTestId('payment-proof-image');
    const dialog = screen.getByTestId('payment-proof-dialog');
    expect(dialog.textContent).toContain('إثبات الدفع');
    expect(dialog.textContent).toContain('فتح في علامة تبويب جديدة');
    expect(dialog.textContent).not.toMatch(/paymentProof\.|actions\./);
  });
});
