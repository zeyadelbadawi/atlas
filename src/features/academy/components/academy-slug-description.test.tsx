/**
 * Slug change — the Academy Slug field says plainly what saving a new value
 * does (the website moves, the old address keeps working and redirects),
 * and a refused slug is shown on the field itself.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { ApiError } from '@api';
import { createI18nInstance } from '@/localization/i18n';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { AcademySlugDescription } from './AcademySlugDescription';
import { academySlugErrorMessage } from '../utils/academy-slug-error.utils';

function Field(props: { canChange: boolean; changing: boolean }) {
  const form = useForm<{ slug: string }>({ defaultValues: { slug: 'nour' } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="slug"
        render={() => (
          <FormItem>
            <AcademySlugDescription {...props} />
          </FormItem>
        )}
      />
    </Form>
  );
}

function show(language: 'en' | 'ar', props: { canChange: boolean; changing: boolean }) {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <Field {...props} />
    </I18nextProvider>
  );
}

afterEach(cleanup);

describe('AcademySlugDescription', () => {
  it('tells the owner that a new slug moves the website and the old address redirects', () => {
    show('en', { canChange: true, changing: false });
    expect(
      screen.getByText(/Changing it moves your website to the new address/)
    ).toBeTruthy();
    expect(screen.getByText(/stays reserved for you/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('confirms what will happen once the owner has typed a new slug', () => {
    show('en', { canChange: true, changing: true });
    expect(screen.getByRole('status').textContent).toMatch(
      /When you save, your website moves to this new address/
    );
  });

  it('says so in Arabic too', () => {
    show('ar', { canChange: true, changing: true });
    expect(screen.getByText(/تغييره ينقل موقعك إلى العنوان الجديد/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/عند الحفظ/);
  });

  it('tells everyone else only the owner can change it', () => {
    show('en', { canChange: false, changing: true });
    expect(
      screen.getByText('Only the organization owner can change the web address.')
    ).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('academySlugErrorMessage', () => {
  const refusal = (messageKey: string) =>
    new ApiError({ kind: 'conflict', messageKey, status: 409, retryable: false });

  it('maps the slug refusals to their field message', () => {
    expect(academySlugErrorMessage(refusal('errors.academy.slugTaken'))).toBe(
      'errors:academy.slugTaken'
    );
    expect(academySlugErrorMessage(refusal('errors.academy.slugReserved'))).toBe(
      'errors:academy.slugReserved'
    );
  });

  it('leaves every other error alone', () => {
    expect(academySlugErrorMessage(refusal('errors.academy.nameTaken'))).toBeNull();
    expect(academySlugErrorMessage(new Error('boom'))).toBeNull();
  });
});
