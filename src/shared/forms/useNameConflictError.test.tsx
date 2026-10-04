/**
 * W4 — duplicate-name refusals land on the field they are about, in English
 * and Arabic, and the profile clash names only the user's own academies.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import { resolveValidationMessage } from './form.utils';
import {
  NAME_CONFLICT_ERROR_KEYS,
  nameConflictFromError,
  useNameConflictError,
} from './useNameConflictError';

function conflict(
  messageKey: string,
  field: string,
  details?: Record<string, unknown>
): ApiError {
  return new ApiError({
    kind:
      messageKey === NAME_CONFLICT_ERROR_KEYS.nameInvalid
        ? 'validation'
        : 'conflict',
    messageKey,
    status: messageKey === NAME_CONFLICT_ERROR_KEYS.nameInvalid ? 400 : 409,
    violations: [{ field, messageKey }],
    details: details as ApiError['details'],
    retryable: false,
  });
}

afterEach(cleanup);

describe('nameConflictFromError', () => {
  it('recognises every W4 key and reads the server field', () => {
    expect(
      nameConflictFromError(
        conflict(
          NAME_CONFLICT_ERROR_KEYS.organizationNameUnavailable,
          'organizationName'
        )
      )
    ).toEqual({
      field: 'organizationName',
      messageKey: 'errors.organization.nameUnavailable',
      academies: [],
    });
    expect(
      nameConflictFromError(
        conflict(NAME_CONFLICT_ERROR_KEYS.academyNameTaken, 'academyName')
      )?.field
    ).toBe('academyName');
    expect(
      nameConflictFromError(
        conflict(
          NAME_CONFLICT_ERROR_KEYS.learnerNameTakenExistingAccount,
          'email'
        )
      )?.field
    ).toBe('email');
    expect(
      nameConflictFromError(
        conflict(NAME_CONFLICT_ERROR_KEYS.nameInvalid, 'name')
      )?.messageKey
    ).toBe('errors.validation.nameInvalid');
  });

  it('extracts only academy names from the profile details', () => {
    const parsed = nameConflictFromError(
      conflict(NAME_CONFLICT_ERROR_KEYS.profileNameTakenInAcademy, 'name', {
        academies: [
          { academyId: 'a1', name: 'Nile Academy' },
          { academyId: 'a2', name: 'أكاديمية النور' },
          { academyId: 'a3' },
        ],
      })
    );
    expect(parsed?.academies).toEqual(['Nile Academy', 'أكاديمية النور']);
  });

  it('ignores every other error', () => {
    expect(
      nameConflictFromError(conflict('errors.academy.slugTaken', 'slug'))
    ).toBeNull();
    expect(nameConflictFromError(new Error('boom'))).toBeNull();
    expect(nameConflictFromError(null)).toBeNull();
  });
});

interface Values {
  readonly name: string;
  readonly lastName: string;
  readonly email: string;
}

function Harness({
  error,
  fields,
}: {
  readonly error: unknown;
  readonly fields?: Partial<Record<string, keyof Values>>;
}): JSX.Element {
  const { t } = useTranslation();
  const form = useForm<Values>({
    defaultValues: { name: '', lastName: '', email: '' },
  });
  useNameConflictError(form, error, { fields });
  const { errors } = form.formState;
  return (
    <form>
      {(['name', 'lastName', 'email'] as const).map((field) => (
        <div key={field}>
          <input aria-label={field} {...form.register(field)} />
          {errors[field] ? (
            <p data-testid={`${field}-error`}>
              {errors[field]?.message?.startsWith('errors:')
                ? resolveValidationMessage(errors[field]?.message, t)
                : errors[field]?.message}
            </p>
          ) : null}
        </div>
      ))}
    </form>
  );
}

function renderIn(language: 'en' | 'ar', ui: JSX.Element) {
  const i18n = createI18nInstance(language);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('useNameConflictError', () => {
  it('puts a taken learner name on the name field and focuses it (EN)', async () => {
    renderIn(
      'en',
      <Harness
        error={conflict(NAME_CONFLICT_ERROR_KEYS.learnerNameTaken, 'name')}
      />
    );
    const message = await screen.findByTestId('name-error');
    expect(message.textContent).toContain(
      'A learner in this academy already has this name'
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('name'))
    );
  });

  it('maps a server field onto the form field and renders Arabic copy', async () => {
    renderIn(
      'ar',
      <Harness
        error={conflict(
          NAME_CONFLICT_ERROR_KEYS.academyNameTaken,
          'academyName'
        )}
        fields={{ academyName: 'name' }}
      />
    );
    const message = await screen.findByTestId('name-error');
    expect(message.textContent).toContain(
      'هذا الاسم مستخدم بالفعل لأكاديمية أخرى'
    );
  });

  it('keeps the organization message generic', async () => {
    renderIn(
      'en',
      <Harness
        error={conflict(
          NAME_CONFLICT_ERROR_KEYS.organizationNameUnavailable,
          'name'
        )}
      />
    );
    expect((await screen.findByTestId('name-error')).textContent).toBe(
      "This organization name isn't available. Please try another."
    );
  });

  it('names the user’s own academies on a profile clash', async () => {
    renderIn(
      'en',
      <Harness
        error={conflict(
          NAME_CONFLICT_ERROR_KEYS.profileNameTakenInAcademy,
          'name',
          {
            academies: [
              { academyId: 'a1', name: 'Nile Academy' },
              { academyId: 'a2', name: 'Cairo Coding' },
            ],
          }
        )}
        fields={{ name: 'lastName' }}
      />
    );
    expect((await screen.findByTestId('lastName-error')).textContent).toBe(
      'Another learner already uses this name in Nile Academy and Cairo Coding. Add a middle or family name so your name stays unique there.'
    );
  });

  it('places the staff variant on the email field', async () => {
    renderIn(
      'ar',
      <Harness
        error={conflict(
          NAME_CONFLICT_ERROR_KEYS.learnerNameTakenExistingAccount,
          'email'
        )}
      />
    );
    expect((await screen.findByTestId('email-error')).textContent).toContain(
      'اسم حساب هذا الشخص مطابق'
    );
  });

  it('does nothing for an unrelated error', () => {
    renderIn(
      'en',
      <Harness error={conflict('errors.academy.slugTaken', 'slug')} />
    );
    expect(screen.queryByTestId('name-error')).toBeNull();
  });
});
