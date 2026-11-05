/**
 * Profile Personal Section.
 *
 * Edit personal information. Prompt 13 replacement for the Prompt 3A
 * scaffold — the form used to fake-save via `setTimeout` and collected
 * `phone`/`bio` fields `CurrentUser`/`currentUserService.updateProfile`
 * have no contract for (only `name`/`avatar` are real). Those fields are
 * removed rather than left half-fake; email is shown read-only since no
 * mutation writes it (a real email change is a verification flow no
 * contract defines yet — documented here rather than invented).
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Save, UserPen, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import {
  nameConflictFromError,
  useNameConflictError,
  useServerValidation,
} from '@forms';
import { validationMessage } from '@/shared/forms/validation-message';
import { useUpdateProfile } from '../hooks';
import {
  fieldErrorText,
  hasViolationOn,
  useFocusFirstViolation,
  useLabelledViolations,
} from '@forms';
import { RequiredMark, SaveFailedAlert } from '@forms';
import type { CurrentUser } from '@types';

/** `UpdateProfileDto.name` — `@MaxLength(100)` on "first last". */
const NAME_MAX_LENGTH = 100;

/** The API's one `name` field is edited as two; its violations land here. */
const SERVER_FIELDS = { name: 'firstName' } as const;

/** Every violation field this form shows beside an input. */
const FIELD_VIOLATIONS = {
  ...SERVER_FIELDS,
  firstName: 'firstName',
  lastName: 'lastName',
} as const;

const fullName = (first: string, last: string): string =>
  `${first} ${last}`.trim();

// B1 (UX audit, V08) — the backend's length limit is checked before
// sending, with the number in the message, instead of a 400 that only ever
// said "Unexpected error". The message sits on the longer of the two
// fields: the one the person most likely needs to shorten.
const personalSchema = z
  .object({
    firstName: z.string().trim().min(1, 'profile:errors.firstNameRequired'),
    lastName: z.string().trim().min(1, 'profile:errors.lastNameRequired'),
  })
  .superRefine((data, context) => {
    if (fullName(data.firstName, data.lastName).length <= NAME_MAX_LENGTH) {
      return;
    }
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [
        data.firstName.length >= data.lastName.length
          ? 'firstName'
          : 'lastName',
      ],
      message: validationMessage('profile:errors.nameTooLong', {
        count: NAME_MAX_LENGTH,
      }),
    });
  });

type PersonalFormData = z.infer<typeof personalSchema>;

export interface ProfilePersonalSectionProps {
  readonly user: CurrentUser;
}

export function ProfilePersonalSection({
  user,
}: ProfilePersonalSectionProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const updateProfile = useUpdateProfile();

  const form = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = form;
  // Declared before the server-error effects below, so a reset never
  // clears a field error they have just placed.
  useEffect(() => {
    reset({
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name]);

  // W4 — a learner name is unique inside each academy; a rename that clashes
  // is refused and names the user's own academies. Shown on the family-name
  // field (the copy suggests adding a middle or family name).
  const nameConflict = useNameConflictError(form, updateProfile.error, {
    fields: { name: 'lastName' },
  });
  // B1 (V08) — every other violation lands on its field, labelled in the
  // page's language. A name clash is already placed above; it is not
  // applied twice.
  const violations = useLabelledViolations(
    nameConflictFromError(updateProfile.error) ? null : updateProfile.error,
    {
      name: 'profile:fields.fullName',
      firstName: 'profile:fields.firstName',
      lastName: 'profile:fields.lastName',
    }
  );
  useServerValidation(form, violations, SERVER_FIELDS);
  useFocusFirstViolation(form, violations, FIELD_VIOLATIONS, SERVER_FIELDS);
  // Anything no field can show: one inline message, nothing else (the
  // mutation is `inlineErrors`, so no toast repeats it).
  const saveFailure =
    updateProfile.error &&
    !nameConflict &&
    !hasViolationOn(updateProfile.error, FIELD_VIOLATIONS)
      ? updateProfile.error
      : null;

  const handleFormSubmit = (data: PersonalFormData) => {
    const name = `${data.firstName} ${data.lastName}`.trim();
    updateProfile.mutate(
      { name },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  // "Save and leave" in the unsaved-changes dialog: the same save, awaited,
  // without leaving edit mode on failure.
  useUnsavedChanges({
    isDirty: isDirty && isEditing,
    onSave: () =>
      saveViaForm({ handleSubmit }, async (data: PersonalFormData) => {
        try {
          await updateProfile.mutateAsync({
            name: `${data.firstName} ${data.lastName}`.trim(),
          });
          setIsEditing(false);
          return true;
        } catch {
          return false;
        }
      }),
  });

  // W4 — registration no longer refuses a learner name another learner
  // already uses (that answer went to anyone, unauthenticated); the account
  // was admitted and is asked here, once signed in, to pick a different one.
  const clashAcademies = user.academies
    .filter((academy) => academy.nameChangeSuggested)
    .map((academy) => academy.name);

  const handleCancel = () => {
    reset();
    setIsEditing(false);
    updateProfile.reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile:sections.personal.title')}</CardTitle>
        <CardDescription>
          {t('profile:sections.personal.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {clashAcademies.length > 0 ? (
            <Alert role="status" data-testid="name-change-suggested">
              <UserPen className="size-4" aria-hidden />
              <AlertTitle>
                {t('profile:sections.personal.nameChangeSuggested.title')}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {t('profile:sections.personal.nameChangeSuggested.body', {
                    academies: new Intl.ListFormat(i18n.language, {
                      type: 'conjunction',
                    }).format(clashAcademies),
                  })}
                </p>
                {!isEditing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    {t('profile:sections.personal.nameChangeSuggested.action')}
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t('profile:fields.firstName')}
                <RequiredMark />
              </Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                disabled={!isEditing || updateProfile.isPending}
                {...register('firstName')}
                aria-required
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? 'firstName-error' : undefined
                }
              />
              {errors.firstName ? (
                <p
                  id="firstName-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {fieldErrorText(
                    t,
                    errors.firstName.message ||
                      'profile:errors.firstNameRequired',
                    t('profile:fields.firstName')
                  )}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t('profile:fields.lastName')}
                <RequiredMark />
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                disabled={!isEditing || updateProfile.isPending}
                {...register('lastName')}
                aria-required
                aria-invalid={!!errors.lastName}
                aria-describedby={
                  errors.lastName ? 'lastName-error' : undefined
                }
              />
              {errors.lastName ? (
                <p
                  id="lastName-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {/* A server message arrives already translated (it names
                      the user's academies); anything else is a key. */}
                  {fieldErrorText(
                    t,
                    errors.lastName.message ||
                      'profile:errors.lastNameRequired',
                    t('profile:fields.lastName')
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('profile:fields.email')}</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              readOnly
            />
            <p className="text-sm text-muted-foreground">
              {t('profile:hints.emailReadOnly')}
            </p>
          </div>

          {saveFailure ? (
            <SaveFailedAlert
              error={saveFailure}
              titleKey="profile:errors.notSaved"
              onRetry={handleSubmit(handleFormSubmit)}
            />
          ) : null}

          <div className="flex gap-3">
            {!isEditing ? (
              <Button type="button" onClick={() => setIsEditing(true)}>
                {t('common:actions.edit')}
              </Button>
            ) : (
              <>
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !isDirty}
                >
                  <Save className="me-2 size-4" aria-hidden />
                  {updateProfile.isPending
                    ? t('common:actions.saving')
                    : t('common:actions.save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfile.isPending}
                >
                  <X className="me-2 size-4" aria-hidden />
                  {t('common:actions.cancel')}
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
