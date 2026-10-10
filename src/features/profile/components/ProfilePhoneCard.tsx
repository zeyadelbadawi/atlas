/**
 * Phone number on the profile (docs/USER_PHONE.md): view, add, change,
 * remove — on the dashboard profile and the learner's `/my/profile`.
 *
 * HONEST STATUS. Nothing verifies a number yet (no SMS/WhatsApp provider is
 * contracted), so a saved number says "Not verified" with "verification is
 * coming soon" — never a fake badge and never a "Verify" button that does
 * nothing. When the backend reports verification as available, the verified
 * state already renders.
 *
 * PRIVACY. The number is read from its own endpoint, never from the session
 * user, and is not kept offline. It is rendered as plain text, left-to-right.
 *
 * `?phone=add` in the URL (the dashboard prompt's link) opens the editor.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Clock, Phone, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@components/feedback';
import {
  PhoneField,
  PhoneNumberDisplay,
  defaultPhoneCountry,
  isPhoneCountry,
  refinePhone,
} from '@components/phone';
import { isFieldViolationError, useServerValidation } from '@forms';
import { useToast } from '@app/providers';
import type { ApiError } from '@api';
import { useRemovePhone, useUpdatePhone, useUserPhone } from '../hooks';

const phoneSchema = z
  .object({ phoneCountry: z.string(), phoneNumber: z.string() })
  .superRefine((data, context) =>
    refinePhone(data, context, { required: true })
  );

type PhoneFormData = z.infer<typeof phoneSchema>;

const RATE_LIMITED_KEY = 'errors.auth.rateLimited';

function isRateLimited(error: ApiError | null): boolean {
  return (
    error?.messageKey === RATE_LIMITED_KEY || error?.kind === 'rateLimited'
  );
}

export function ProfilePhoneCard(): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneQuery = useUserPhone();
  const updatePhone = useUpdatePhone();
  const removePhone = useRemovePhone();
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const current = phoneQuery.data?.phone ?? null;

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneCountry: defaultPhoneCountry(), phoneNumber: '' },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;
  useServerValidation(form, updatePhone.error);

  const startEditing = () => {
    updatePhone.reset();
    reset({
      phoneCountry:
        current && isPhoneCountry(current.country)
          ? current.country
          : defaultPhoneCountry(),
      phoneNumber: current?.nationalNumber ?? '',
    });
    setEditing(true);
  };

  // The dashboard prompt links here with `?phone=add`.
  const wantsEditor = searchParams.get('phone') === 'add';
  useEffect(() => {
    if (!wantsEditor || !phoneQuery.isSuccess) return;
    if (!editing) startEditing();
    const next = new URLSearchParams(searchParams);
    next.delete('phone');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsEditor, phoneQuery.isSuccess]);

  const cancel = () => {
    setEditing(false);
    updatePhone.reset();
  };

  const submit = (data: PhoneFormData) => {
    updatePhone.mutate(
      { phoneNumber: data.phoneNumber, phoneCountry: data.phoneCountry },
      {
        onSuccess: () => {
          setEditing(false);
          notifySuccess('profile:phone.saved');
        },
      }
    );
  };

  const confirmRemove = () => {
    setConfirmingRemove(false);
    removePhone.mutate(undefined, {
      onSuccess: () => notifySuccess('profile:phone.removed'),
    });
  };

  const updateError = updatePhone.error;
  const hasFieldViolations =
    isFieldViolationError(updateError) &&
    (updateError?.violations?.length ?? 0) > 0;

  return (
    <Card id="phone" data-testid="profile-phone-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="size-5" aria-hidden />
          {t('profile:phone.title')}
        </CardTitle>
        <CardDescription>{t('profile:phone.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phoneQuery.isLoading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">{t('common:actions.loading')}</span>
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        ) : phoneQuery.error ? (
          <ErrorState
            kind={phoneQuery.error.kind}
            onRetry={() => void phoneQuery.refetch()}
          />
        ) : editing ? (
          <form
            onSubmit={handleSubmit(submit)}
            className="max-w-md space-y-4"
            noValidate
          >
            {isRateLimited(updateError) ? (
              <p role="alert" className="text-sm text-destructive">
                {t('profile:phone.rateLimited')}
              </p>
            ) : updateError && !hasFieldViolations ? (
              <ErrorState
                kind={updateError.kind}
                onRetry={handleSubmit(submit)}
              />
            ) : null}
            <PhoneField
              control={control}
              errors={errors}
              id="profile-phone"
              label={t('profile:phone.label')}
              disabled={updatePhone.isPending}
              autoFocus
            />
            {current?.verified ? (
              <p className="text-sm text-muted-foreground">
                {t('profile:phone.reverifyNotice')}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={updatePhone.isPending}
                aria-busy={updatePhone.isPending}
              >
                <Save className="me-2 size-4" aria-hidden />
                {updatePhone.isPending
                  ? t('common:actions.saving')
                  : t('common:actions.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancel}
                disabled={updatePhone.isPending}
              >
                <X className="me-2 size-4" aria-hidden />
                {t('common:actions.cancel')}
              </Button>
            </div>
          </form>
        ) : current ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <PhoneNumberDisplay
                e164={current.e164}
                country={current.country}
                className="text-base font-medium"
              />
              {current.verified ? (
                <Badge variant="secondary" className="gap-1">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t('profile:phone.status.verified')}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1"
                  data-testid="phone-unverified"
                >
                  <Clock className="size-3.5" aria-hidden />
                  {t('profile:phone.status.unverified')}
                </Badge>
              )}
            </div>
            {!current.verified ? (
              <p className="text-sm text-muted-foreground">
                {t('profile:phone.status.comingSoon')}
              </p>
            ) : null}
            {removePhone.error ? (
              <ErrorState
                kind={removePhone.error.kind}
                descriptionKey={
                  isRateLimited(removePhone.error)
                    ? 'profile:phone.rateLimited'
                    : undefined
                }
              />
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={startEditing}>
                {t('profile:phone.change')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingRemove(true)}
                disabled={removePhone.isPending}
              >
                {t('profile:phone.remove')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('profile:phone.empty')}
            </p>
            <Button type="button" onClick={startEditing}>
              {t('profile:phone.add')}
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmingRemove} onOpenChange={setConfirmingRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('profile:phone.removeConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile:phone.removeConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>
              {t('profile:phone.removeConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
