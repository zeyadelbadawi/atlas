/**
 * B2 (UX audit) — website settings, messages and shared form pieces say
 * what is wrong, once, in the customer's language.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createI18nInstance } from '@/localization/i18n';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  globalSeoSchema,
  isAbsoluteWebAddress,
  pageSeoSchema,
} from './schemas/website.schemas';
import { ContactSubmissionsToolbar } from './components/ContactSubmissionsToolbar';

const ui = vi.hoisted(() => ({ language: 'en' as 'en' | 'ar' }));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLanguage: () => ({ language: ui.language, isRtl: ui.language === 'ar' }),
}));

afterEach(cleanup);

describe('canonical addresses (V04)', () => {
  it.each([
    'not a url',
    'example.com',
    'ftp://example.com',
    'https://',
    'https://localhost',
  ])('refuses %s with a message that says what to type', (value) => {
    expect(isAbsoluteWebAddress(value)).toBe(false);
    const result = globalSeoSchema.safeParse({ canonicalBaseUrl: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('validation:absoluteUrl');
    }
  });

  it.each(['https://www.my-academy.com', 'http://learn.example.org/path'])(
    'accepts %s',
    (value) => {
      expect(
        globalSeoSchema.safeParse({ canonicalBaseUrl: value }).success
      ).toBe(true);
    }
  );

  it('accepts no base address at all', () => {
    expect(globalSeoSchema.safeParse({ canonicalBaseUrl: '' }).success).toBe(
      true
    );
  });

  it('a canonical path is told it is a path, not a URL', () => {
    const result = pageSeoSchema.safeParse({ canonicalPath: 'About Us' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('validation:sitePath');
    }
  });
});

function MessageProbe({
  error,
}: {
  readonly error: Record<string, unknown>;
}): JSX.Element {
  const form = useForm<{ title: { en: string } }>({
    defaultValues: { title: { en: '' } },
  });
  const { setError } = form;
  useEffect(() => {
    const nested = error.en as { message: string } | undefined;
    if (nested)
      setError('title.en', { type: 'manual', message: nested.message });
    else setError('title', error as never);
  }, [error, setError]);
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="title"
        render={() => (
          <FormItem>
            <FormControl>
              <input />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

const NESTED = { en: { type: 'too_big', message: 'validation:required' } };
const COLON = { type: 'server', message: 'Tip: use a shorter title' };

describe('FormMessage (V03)', () => {
  const renderProbe = (error: Record<string, unknown>) =>
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MessageProbe error={error} />
      </I18nextProvider>
    );

  it('shows a localized field’s nested message instead of "undefined"', async () => {
    renderProbe(NESTED);
    await waitFor(() =>
      expect(document.body.textContent).toContain('This field is required')
    );
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('shows text that merely contains a colon as text, never blank', async () => {
    renderProbe(COLON);
    await waitFor(() =>
      expect(document.body.textContent).toContain('Tip: use a shorter title')
    );
  });
});

describe('messages date range (V22)', () => {
  const props: Omit<
    Parameters<typeof ContactSubmissionsToolbar>[0],
    'filters' | 'onRangeChange'
  > = {
    hasFilters: true,
    summary: undefined,
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
    onSortChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it.each(['en', 'ar'] as const)(
    'says a reversed range is reversed (%s) and swaps it',
    (language) => {
      const onRangeChange = vi.fn();
      render(
        <I18nextProvider i18n={createI18nInstance(language)}>
          <ContactSubmissionsToolbar
            {...props}
            filters={
              {
                from: '2026-12-31',
                to: '2026-01-01',
                sort: 'createdAt:desc',
                search: '',
              } as never
            }
            onRangeChange={onRangeChange}
          />
        </I18nextProvider>
      );
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain(
        language === 'en'
          ? 'The start date is after the end date'
          : 'تاريخ البداية بعد تاريخ النهاية'
      );
      fireEvent.click(
        screen.getByRole('button', {
          name: language === 'en' ? 'Swap dates' : 'بدّل التاريخين',
        })
      );
      expect(onRangeChange).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
    }
  );

  it('says nothing for a range in order', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ContactSubmissionsToolbar
          {...props}
          filters={
            {
              from: '2026-01-01',
              to: '2026-12-31',
              sort: 'createdAt:desc',
              search: '',
            } as never
          }
          onRangeChange={vi.fn()}
        />
      </I18nextProvider>
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
