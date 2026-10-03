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
import { Save, X } from 'lucide-react';
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
import { ErrorState } from '@components/feedback';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { useNameConflictError } from '@forms';
import { useUpdateProfile } from '../hooks';
import type { CurrentUser } from '@types';

const personalSchema = z.object({
  firstName: z.string().min(1, 'profile:errors.firstNameRequired'),
  lastName: z.string().min(1, 'profile:errors.lastNameRequired'),
});

type PersonalFormData = z.infer<typeof personalSchema>;

export interface ProfilePersonalSectionProps {
  readonly user: CurrentUser;
}

export function ProfilePersonalSection({
  user,
}: ProfilePersonalSectionProps): JSX.Element {
  const { t } = useTranslation();
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
  // W4 — a learner name is unique inside each academy; a rename that clashes
  // is refused and names the user's own academies. Shown on the family-name
  // field (the copy suggests adding a middle or family name).
  const nameConflict = useNameConflictError(form, updateProfile.error, {
    fields: { name: 'lastName' },
  });

  useEffect(() => {
    reset({
      firstName: user.name.split(' ')[0] || '',
      lastName: user.name.split(' ').slice(1).join(' ') || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name]);

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
          {updateProfile.error && !nameConflict ? (
            <ErrorState onRetry={handleSubmit(handleFormSubmit)} />
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('profile:fields.firstName')}</Label>
              <Input
                id="firstName"
                disabled={!isEditing || updateProfile.isPending}
                {...register('firstName')}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName ? (
                <p className="text-sm text-destructive">
                  {t(
                    errors.firstName.message ||
                      'profile:errors.firstNameRequired'
                  )}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">{t('profile:fields.lastName')}</Label>
              <Input
                id="lastName"
                disabled={!isEditing || updateProfile.isPending}
                {...register('lastName')}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              />
              {errors.lastName ? (
                <p
                  id="lastName-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {/* A server message arrives already translated (it names
                      the user's academies); anything else is a key. */}
                  {errors.lastName.type === 'server' &&
                  errors.lastName.message &&
                  !errors.lastName.message.startsWith('errors:')
                    ? errors.lastName.message
                    : t(
                        errors.lastName.message ||
                          'profile:errors.lastNameRequired'
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
