/**
 * B0-CPY-21 — the manual-method help texts address whoever actually reads
 * the instructions: learners for an academy's methods (settings page and
 * setup form), the organization for Atlas's own subscription methods.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { Form } from '@/components/ui/form';
import {
  BankTransferDetailsFields,
  InstapayDetailsFields,
  WalletDetailsFields,
} from './components/ManualMethodDetailsFields';
import { ManualMethodTextsFields } from './components/ManualMethodFormFields';

afterEach(cleanup);

function Harness({ children }: { children: (c: never) => JSX.Element }) {
  const form = useForm({ defaultValues: { instructions: {} } });
  return <Form {...form}>{children(form.control as never)}</Form>;
}

function renderIn(language: 'en' | 'ar', node: (c: never) => JSX.Element) {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <Harness>{node}</Harness>
    </I18nextProvider>
  );
}

describe('manual method help — audience', () => {
  it.each([
    [
      'bank',
      (c: never) => <BankTransferDetailsFields control={c} testIdPrefix="t" />,
    ],
    [
      'instapay',
      (c: never) => <InstapayDetailsFields control={c} testIdPrefix="t" />,
    ],
    [
      'wallet',
      (c: never) => <WalletDetailsFields control={c} testIdPrefix="t" />,
    ],
  ])(
    'academy %s fields speak to learners, never the Organization',
    (_n, node) => {
      renderIn('en', node);
      expect(screen.getAllByText(/^Shown to learners with the /).length).toBe(
        1
      );
      expect(screen.getAllByText(/^Tell learners what to write/).length).toBe(
        1
      );
      expect(screen.queryByText(/the Organization/)).toBeNull();
    }
  );

  it('says the same in Arabic', () => {
    renderIn('ar', (c) => (
      <BankTransferDetailsFields control={c} testIdPrefix="t" />
    ));
    expect(
      screen.getByText(/^تظهر للمتعلمين مع بيانات الحساب البنكي/)
    ).toBeTruthy();
    expect(screen.queryByText(/للمؤسسة|المؤسسة بما/)).toBeNull();
  });

  it('keeps the Organization wording for Atlas subscription methods', () => {
    renderIn('en', (c) => (
      <ManualMethodTextsFields
        control={c}
        section="bankTransferMethods"
        testIdPrefix="t"
      />
    ));
    expect(
      screen.getByText(/^Shown to the Organization with the bank details/)
    ).toBeTruthy();
  });
});
