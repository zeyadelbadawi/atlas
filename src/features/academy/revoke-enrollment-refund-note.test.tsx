/**
 * Revoking a learner's access only ends access: the order stays paid and
 * nothing is refunded. Recording a refund is a separate action (Record
 * refund on the payment), so the dialog says revoking doesn't refund and
 * points there, in both languages, and does not offer "Refunded" as a
 * reason (the revoke API takes none).
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
  it('says revoking does not refund, and points to Record refund', () => {
    renderDialog('en');
    const note = screen.getByTestId('revoke-refund-note').textContent ?? '';
    expect(note).toMatch(/doesn't refund/);
    expect(note).toMatch(/Record refund/);
    expect(screen.queryByText('Refunded')).toBeNull();
  });

  it('says the same in Arabic', () => {
    renderDialog('ar');
    const note = screen.getByTestId('revoke-refund-note').textContent ?? '';
    expect(note).toMatch(/لا يردّ أي مبلغ/);
    expect(note).toMatch(/تسجيل استرداد/);
    expect(note).not.toMatch(/Atlas/);
  });
});
