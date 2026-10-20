/**
 * Revoking a learner's access only ends access. Atlas has no way to record
 * that an academy refunded a learner it was paid by directly (the order
 * stays paid, and the revoke API takes no refund reason), so the dialog
 * must not let the owner think revoking refunds anyone. It says so, in
 * both languages, and does not offer "Refunded" as a reason.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { RevokeEnrollmentDialog } from './components/AcademyStudentActionDialogs';

afterEach(cleanup);

function renderDialog(language: 'en' | 'ar') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <RevokeEnrollmentDialog
        open
        onOpenChange={vi.fn()}
        isPending={false}
        courseTitle="Calculus Essentials"
        onConfirm={vi.fn()}
      />
    </I18nextProvider>
  );
}

describe('revoke access dialog — refunds', () => {
  it('says revoking does not refund, and the owner returns the money', () => {
    renderDialog('en');
    const note = screen.getByTestId('revoke-refund-note').textContent ?? '';
    expect(note).toMatch(/doesn't refund/);
    expect(note).toMatch(/return the money to them yourself/);
    expect(screen.queryByText('Refunded')).toBeNull();
  });

  it('says the same in Arabic, naming «أطلس»', () => {
    renderDialog('ar');
    const note = screen.getByTestId('revoke-refund-note').textContent ?? '';
    expect(note).toMatch(/لا يردّ أي مبلغ/);
    expect(note).toMatch(/أطلس/);
    expect(note).not.toMatch(/Atlas/);
  });
});
