/**
 * B0 (UX audit) — the form error summary: shown after a failed submit with
 * two or more problems (or any problem the form cannot show by a field),
 * focused, every item naming the problem and moving focus to its field.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import { FormErrorSummary, flattenFormErrors } from './FormErrorSummary';

interface Values {
  name: string;
  email: string;
}

function Harness({
  lang = 'en',
  serverOnly = false,
}: {
  lang?: 'en' | 'ar';
  serverOnly?: boolean;
}) {
  const form = useForm<Values>({ defaultValues: { name: '', email: '' } });
  const onSubmit = form.handleSubmit(() => {
    if (serverOnly) {
      form.setError('root.server', { message: 'errors:validation.failed' });
    }
  });
  return (
    <I18nextProvider i18n={createI18nInstance(lang)}>
      <form onSubmit={onSubmit} noValidate>
        <FormErrorSummary
          form={form}
          fieldLabels={{
            name: 'common:form.required',
            email: 'common:form.optional',
          }}
        />
        <input
          aria-label="name"
          {...form.register('name', {
            required: serverOnly ? false : 'validation:email',
          })}
        />
        <input
          aria-label="email"
          {...form.register('email', {
            required: serverOnly ? false : 'Enter an email',
          })}
        />
        <button type="submit">save</button>
      </form>
    </I18nextProvider>
  );
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByText('save'));
  });
  // The summary takes focus one tick after the submit.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(cleanup);

describe('FormErrorSummary', () => {
  it('stays hidden until a submit fails', () => {
    render(<Harness />);
    expect(screen.queryByTestId('form-error-summary')).toBeNull();
  });

  it('lists every problem with its field, takes focus, and links to the field', async () => {
    render(<Harness />);
    await submit();
    const summary = screen.getByTestId('form-error-summary');
    expect(summary.textContent).toContain('Fix these 2 problems before saving');
    expect(summary.textContent).toContain(
      'Required: Enter a valid email address'
    );
    expect(summary.textContent).toContain('Optional: Enter an email');
    expect(document.activeElement).toBe(summary);

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /Optional: Enter an email/ })
      );
    });
    expect(document.activeElement).toBe(screen.getByLabelText('email'));
  });

  it('shows a form-level server error even when it is the only one', async () => {
    render(<Harness serverOnly />);
    await submit();
    expect(screen.getByTestId('form-error-summary').textContent).toContain(
      "Some of the information isn't valid. Check it and try again."
    );
  });

  it('speaks Arabic in an Arabic form', async () => {
    render(<Harness lang="ar" />);
    await submit();
    expect(screen.getByTestId('form-error-summary').textContent).toContain(
      'صحّح هاتين المشكلتين قبل الحفظ'
    );
  });

  it('flattens nested errors into field paths', () => {
    expect(
      flattenFormErrors({
        address: { city: { type: 'required', message: 'x' } },
        root: { server: { type: 'server', message: 'y' } },
      } as never)
    ).toEqual([
      { name: 'address.city', message: 'x' },
      { name: null, message: 'y' },
    ]);
  });
});

describe('FormErrorSummary — scoped to its own form', () => {
  function TwoForms() {
    const form = useForm<{ name: string }>({ defaultValues: { name: '' } });
    const onSubmit = form.handleSubmit(() => {
      // A server violation on a field THIS form does not render.
      form.setError('phone' as never, { message: 'Enter a phone number' });
    });
    return (
      <I18nextProvider i18n={createI18nInstance('en')}>
        <form aria-label="other">
          <input name="phone" aria-label="other phone" />
        </form>
        <form onSubmit={onSubmit} noValidate aria-label="mine">
          <FormErrorSummary form={form} />
          <input aria-label="name" {...form.register('name')} />
          <button type="submit">save</button>
        </form>
      </I18nextProvider>
    );
  }

  it('shows an error for a field missing from this form even if another form has it', async () => {
    render(<TwoForms />);
    await submit();
    expect(screen.getByTestId('form-error-summary').textContent).toContain(
      'Enter a phone number'
    );
  });
});
