/**
 * Academy Profile Page.
 *
 * View and edit academy profile information including basic details,
 * contact information, and localization settings.
 *
 * D5-3 — the country is an ISO code picked from the phone field's country
 * list, and the currency follows it until changed by hand
 * (`useCurrencyFollowsCountry`). The currency is the default for new course
 * prices; it never converts or rewrites an existing price.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { saveViaForm, currencyOptions, formatCountryName } from '@utils';
import { CountrySelect } from '@/shared/components/phone';
import { useAuth, useUnsavedChanges } from '@hooks';
import {
  nameConflictFromError,
  useNameConflictError,
  useServerValidation,
} from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy, useUpdateAcademy } from '../hooks';
import { useCurrencyFollowsCountry } from '../hooks/useCurrencyFollowsCountry';
import { AcademySlugDescription } from '../components/AcademySlugDescription';
import { academySlugErrorMessage } from '../utils/academy-slug-error.utils';
import type { LanguageCode } from '@types';
import {
  updateAcademyProfileSchema,
  type UpdateAcademyProfileFormData,
} from '../schemas/academy.schemas';

export default function AcademyProfilePage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { organization } = useAuth();
  // Changing the web address (slug) is Organization-Owner-only
  // (backend-enforced, 403 otherwise); others see it read-only.
  const canChangeSlug = organization?.role === 'owner';

  const {
    data: academy,
    isLoading,
    error: loadError,
    refetch,
  } = useAcademy(academyId ?? '');
  // One slug change every 60 days: until then the field is read-only and
  // says when the next change is possible (the server refuses it anyway).
  const slugLocked = !!academy?.nextSlugChangeAt;
  const {
    mutateAsync: updateAcademy,
    isPending,
    error: mutationError,
  } = useUpdateAcademy();

  const form = useForm<UpdateAcademyProfileFormData>({
    resolver: zodResolver(updateAcademyProfileSchema),
    values: academy
      ? {
          name: academy.name,
          slug: academy.slug,
          description: academy.description ?? '',
          contactEmail: academy.contactEmail ?? '',
          contactPhone: academy.contactPhone ?? '',
          website: academy.website ?? '',
          street: academy.address?.street ?? '',
          city: academy.address?.city ?? '',
          state: academy.address?.state ?? '',
          postalCode: academy.address?.postalCode ?? '',
          country: academy.address?.country ?? '',
          language: academy.language,
          timezone: academy.timezone,
          currency: academy.currency,
        }
      : undefined,
  });

  const currencyFollow = useCurrencyFollowsCountry(
    form,
    academy
      ? { country: academy.address?.country, currency: academy.currency }
      : undefined
  );

  useServerValidation(form, mutationError);
  // W4 — academy names are unique platform-wide: a taken name is shown on
  // the name field instead of a generic toast.
  useNameConflictError(form, mutationError);
  // `save` resolves false after a failure it already reported, so both the
  // Save button and the unsaved-changes dialog's "Save and leave" share it.
  const save = async (data: UpdateAcademyProfileFormData): Promise<boolean> => {
    if (!academyId) return false;

    try {
      await updateAcademy({
        id: academyId,
        payload: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          website: data.website || null,
          address: {
            street: data.street,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country || '',
          },
          language: data.language,
          timezone: data.timezone,
          currency: data.currency,
        },
      });
      // The saved values are the new baseline: clean now, not after the
      // refetch — and still clean if the server echoes them back unchanged.
      form.reset(data);
      toast({
        title: t('academy:profile.success'),
        description: t('common:states.success.description'),
      });
      return true;
    } catch (error) {
      if (nameConflictFromError(error)) return false;
      const slugError = academySlugErrorMessage(
        error,
        t,
        i18n.language as LanguageCode
      );
      if (slugError) {
        form.setError(
          'slug',
          { type: 'server', message: slugError },
          { shouldFocus: true }
        );
        return false;
      }
      toast({
        title: t('academy:profile.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const onSubmit = async (data: UpdateAcademyProfileFormData) => {
    await save(data);
  };

  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, save),
  });

  const handleCancel = () => {
    navigate(
      academyId
        ? buildPath(DASHBOARD_ROUTES.academyOverview, { academyId })
        : DASHBOARD_ROUTES.academy
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:profile.title"
          descriptionKey="academy:profile.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:profile.title"
        descriptionKey="academy:profile.subtitle"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:profile.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:create.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:create.slugLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        dir="ltr"
                        data-ltr-content
                        readOnly={!canChangeSlug || slugLocked}
                        aria-readonly={!canChangeSlug || slugLocked || undefined}
                      />
                    </FormControl>
                    <AcademySlugDescription
                      canChange={canChangeSlug}
                      changing={!!academy && field.value !== academy.slug}
                      nextChangeAt={academy?.nextSlugChangeAt}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('academy:create.descriptionLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:profile.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('academy:create.contactEmailLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('academy:create.contactPhoneLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:create.websiteLabel')}</FormLabel>
                    <FormControl>
                      <Input type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:profile.address')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:profile.streetLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:profile.cityLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:profile.stateLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('academy:profile.postalCodeLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:create.countryLabel')}</FormLabel>
                      <FormControl>
                        <CountrySelect
                          value={field.value ?? ''}
                          onChange={currencyFollow.selectCountry}
                          onBlur={field.onBlur}
                          placeholder={t('academy:create.countryPlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localization */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:profile.localization')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:create.languageLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:create.timezoneLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Africa/Cairo">
                            Africa/Cairo
                          </SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">
                            America/New_York
                          </SelectItem>
                          <SelectItem value="Europe/London">
                            Europe/London
                          </SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                          <SelectItem value="Asia/Riyadh">
                            Asia/Riyadh
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:create.currencyLabel')}</FormLabel>
                      <Select
                        onValueChange={currencyFollow.selectCurrency}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* From the academy as saved, not `field.value`:
                              this form mounts a render before `values`
                              applies, and options without a legacy currency
                              make Radix's native select clear the field. */}
                          {currencyOptions(academy.currency).map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('academy:profile.currencyHelp')}
                      </FormDescription>
                      {currencyFollow.suggestion ? (
                        <p
                          className="text-sm text-muted-foreground"
                          data-testid="currency-country-hint"
                        >
                          {t('academy:profile.countryCurrencyHint', {
                            country:
                              formatCountryName(
                                form.getValues('country'),
                                i18n.language
                              ) ?? form.getValues('country'),
                            currency: currencyFollow.suggestion,
                          })}{' '}
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 align-baseline"
                            onClick={currencyFollow.acceptSuggestion}
                          >
                            {t('academy:profile.useCurrency', {
                              currency: currencyFollow.suggestion,
                            })}
                          </Button>
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('academy:profile.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('academy:profile.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                  {t('academy:profile.saveButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
