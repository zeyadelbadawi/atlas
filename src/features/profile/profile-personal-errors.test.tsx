/**
 * B1 (UX audit) — Profile › Personal.
 *
 * V08: the backend's name limit (`name` ≤ 100 characters) is checked before
 * sending, with the number in the message; a 400 lands on the name field;
 * any other failure says, once, that nothing was saved and why — never
 * "Unexpected error". V23: required fields are marked.
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import type { CurrentUser } from '@types';
import { ProfilePersonalSection } from './components/ProfilePersonalSection';

const state = vi.hoisted(() => ({
  error: null as unknown,
  mutate: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useUpdateProfile: () => ({
    mutate: state.mutate,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: state.error,
  }),
}));

const USER = {
  id: 'u-1',
  name: 'Sarah Chen',
  email: 'sarah@example.com',
  roles: [],
  permissions: [],
  organizations: [],
  organizationMemberships: [],
  principalKind: 'staff',
  academies: [],
} as unknown as CurrentUser;

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function renderSection(language: 'en' | 'ar' = 'en') {
  const wrap = (children: ReactNode) => (
    <I18nextProvider i18n={I18N[language]}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{children}</div>
    </I18nextProvider>
  );
  return render(wrap(<ProfilePersonalSection user={USER} />));
}

function startEditing(language: 'en' | 'ar' = 'en') {
  fireEvent.click(
    screen.getByRole('button', { name: language === 'ar' ? 'تعديل' : 'Edit' })
  );
}

afterEach(() => {
  cleanup();
  state.error = null;
  state.mutate.mockReset();
});

describe('ProfilePersonalSection — validation and failures', () => {
  it('marks both name fields as required', () => {
    renderSection();
    for (const id of ['firstName', 'lastName']) {
      const input = document.getElementById(id) as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label?.textContent).toContain('*');
      expect(label?.textContent).toContain('This field is required');
    }
  });

  it('checks the 100-character limit before sending, naming the number', async () => {
    renderSection();
    startEditing();
    fireEvent.change(document.getElementById('firstName')!, {
      target: { value: 'S'.repeat(120) },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    const message = await screen.findByText(
      'Your first and last name together must be 100 characters or fewer'
    );
    expect(message.id).toBe('firstName-error');
    expect(
      document.getElementById('firstName')!.getAttribute('aria-invalid')
    ).toBe('true');
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it('checks the limit in Arabic too', async () => {
    renderSection('ar');
    startEditing('ar');
    fireEvent.change(document.getElementById('firstName')!, {
      target: { value: 'س'.repeat(120) },
    });
    fireEvent.click(screen.getByRole('button', { name: /حفظ/ }));
    expect(
      await screen.findByText(
        'يجب ألّا يزيد الاسم الأول واسم العائلة معًا عن 100 حرفًا'
      )
    ).toBeTruthy();
  });

  it('puts the server’s `name` violation on the first-name field, once', async () => {
    const view = renderSection();
    startEditing();
    // The PATCH comes back 400 with the backend's real violation.
    state.error = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      retryable: false,
      violations: [
        {
          field: 'name',
          messageKey: 'validation:maxLength',
          values: { count: 100 },
        },
      ],
    });
    // The same tree as `renderSection`, so the section keeps its state.
    view.rerender(
      <I18nextProvider i18n={I18N.en}>
        <div dir="ltr">
          <ProfilePersonalSection user={USER} />
        </div>
      </I18nextProvider>
    );
    const message = await screen.findByText(
      'Your full name must be 100 characters or fewer'
    );
    expect(message.id).toBe('firstName-error');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.queryByText('Unexpected error')).toBeNull();
    // Focus lands on the field to fix.
    await waitFor(() => expect(document.activeElement?.id).toBe('firstName'));
  });

  it('treats a violation named after a form field as that field’s, once', async () => {
    state.error = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      retryable: false,
      violations: [{ field: 'firstName', messageKey: 'validation:required' }],
    });
    renderSection();
    expect(await screen.findByText('First name is required')).toBeTruthy();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('labels the server violation in Arabic, not with the API field name', async () => {
    state.error = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      retryable: false,
      violations: [
        {
          field: 'name',
          messageKey: 'validation:maxLength',
          values: { count: 100 },
        },
      ],
    });
    renderSection('ar');
    const message = await waitFor(() => {
      const node = document.getElementById('firstName-error');
      if (!node) throw new Error('no message yet');
      return node;
    });
    expect(message.textContent).toContain('اسمك الكامل');
    expect(message.textContent).toContain('100');
    expect(message.textContent).not.toContain('Name');
  });

  it.each([
    [
      'a server error',
      new ApiError({
        kind: 'server',
        messageKey: 'errors.internal',
        status: 500,
        retryable: true,
      }),
      'Something failed on our side',
    ],
    [
      'a lost connection',
      new ApiError({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      }),
      "We couldn't reach the server",
    ],
  ])(
    'after %s, says once that nothing was saved, with the real reason',
    (_label, error, reason) => {
      state.error = error;
      renderSection();
      const alert = screen.getByTestId('save-failed');
      expect(alert.textContent).toContain("Your changes weren't saved");
      expect(alert.textContent).toContain(reason);
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(screen.queryByText('Unexpected error')).toBeNull();
    }
  );

  it('says it in Arabic on the Arabic page', () => {
    state.error = new ApiError({
      kind: 'server',
      messageKey: 'errors.internal',
      status: 500,
      retryable: true,
    });
    renderSection('ar');
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain('لم تُحفظ تغييراتك');
    expect(alert.textContent).toContain('حدث خلل من جهتنا');
  });

  it('sends the trimmed full name', async () => {
    renderSection();
    startEditing();
    fireEvent.change(document.getElementById('firstName')!, {
      target: { value: '  Sara  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => expect(state.mutate).toHaveBeenCalledTimes(1));
    expect(state.mutate.mock.calls[0][0]).toEqual({ name: 'Sara Chen' });
  });
});
