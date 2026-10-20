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

type Props = { canChange: boolean; changing: boolean; nextChangeAt?: string };

function Field(props: Props) {
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

function show(language: 'en' | 'ar', props: Props) {
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

  it('says when the next change is possible inside the 60-day window', () => {
    show('en', {
      canChange: true,
      changing: false,
      nextChangeAt: '2026-12-19T12:00:00.000Z',
    });
    expect(screen.getByText(/once every 60 days/)).toBeTruthy();
    expect(
      screen.getByText(
        'You changed the address recently. You can change it again on 19 December 2026.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('names the date in Arabic too', () => {
    show('ar', {
      canChange: true,
      changing: false,
      nextChangeAt: '2026-12-19T12:00:00.000Z',
    });
    expect(screen.getByText(/يمكنك تغييره مرة أخرى في 19 ديسمبر 2026/)).toBeTruthy();
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
  const i18n = createI18nInstance('en');
  const t = i18n.t.bind(i18n);
  const refusal = (messageKey: string, details?: Record<string, unknown>) =>
    new ApiError({
      kind: 'conflict',
      messageKey,
      status: 409,
      retryable: false,
      ...(details ? { details } : {}),
    } as never);

  it('maps the slug refusals to their field message', () => {
    expect(
      academySlugErrorMessage(refusal('errors.academy.slugTaken'), t, 'en')
    ).toBe('errors:academy.slugTaken');
    expect(
      academySlugErrorMessage(refusal('errors.academy.slugReserved'), t, 'en')
    ).toBe('errors:academy.slugReserved');
  });

  it('names the date a change becomes possible for a change made too soon', () => {
    expect(
      academySlugErrorMessage(
        refusal('errors.academy.slugChangeTooSoon', {
          nextSlugChangeAt: '2026-12-19T12:00:00.000Z',
          intervalDays: 60,
        }),
        t,
        'en'
      )
    ).toBe(
      'You can change the address only once every 60 days. You can change it again on 19 December 2026.'
    );
  });

  it('leaves every other error alone', () => {
    expect(
      academySlugErrorMessage(refusal('errors.academy.nameTaken'), t, 'en')
    ).toBeNull();
    expect(academySlugErrorMessage(new Error('boom'), t, 'en')).toBeNull();
  });
});
