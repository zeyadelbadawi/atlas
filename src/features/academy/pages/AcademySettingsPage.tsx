/**
 * Academy Settings Page.
 *
 * Configure academy preferences including general settings, localization,
 * contact information, and status management.
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
import { useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useAcademy, useUpdateAcademy } from '../hooks';
import {
  updateAcademySettingsSchema,
  type UpdateAcademySettingsFormData,
} from '../schemas/academy.schemas';

export default function AcademySettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();

  const {
    data: academy,
    isLoading,
    error: loadError,
    refetch,
  } = useAcademy(academyId ?? '');
  const {
    mutateAsync: updateAcademy,
    isPending,
    error: mutationError,
  } = useUpdateAcademy();

  const form = useForm<UpdateAcademySettingsFormData>({
    resolver: zodResolver(updateAcademySettingsSchema),
    values: academy
      ? {
          name: academy.name,
          slug: academy.slug,
          description: academy.description ?? '',
          status: academy.status,
          language: academy.language,
          timezone: academy.timezone,
          currency: academy.currency,
          contactEmail: academy.contactEmail ?? '',
          contactPhone: academy.contactPhone ?? '',
          website: academy.website ?? '',
        }
      : undefined,
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'academy:settings.unsavedChanges',
  });

  const onSubmit = async (data: UpdateAcademySettingsFormData) => {
    if (!academyId) return;

    try {
      await updateAcademy({
        id: academyId,
        payload: {
          name: data.name,
          slug: data.slug,
          description: data.description || undefined,
          status: data.status,
          language: data.language,
          timezone: data.timezone,
          currency: data.currency,
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          website: data.website || undefined,
        },
      });
      toast({
        title: t('academy:settings.success'),
        description: t('common:states.success.description'),
      });
    } catch (error) {
      toast({
        title: t('academy:settings.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    navigate(DASHBOARD_ROUTES.academy + `?academyId=${academyId}`);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !academy) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="academy:settings.title"
          descriptionKey="academy:settings.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:settings.title"
        descriptionKey="academy:settings.subtitle"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:settings.general')}</CardTitle>
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
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('academy:create.slugHelp')}
                    </FormDescription>
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:settings.statusLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">
                          {t('academy:settings.statusDraft')}
                        </SelectItem>
                        <SelectItem value="active">
                          {t('academy:settings.statusActive')}
                        </SelectItem>
                        <SelectItem value="suspended">
                          {t('academy:settings.statusSuspended')}
                        </SelectItem>
                        <SelectItem value="archived">
                          {t('academy:settings.statusArchived')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Localization Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:settings.localization')}</CardTitle>
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
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:settings.contact')}</CardTitle>
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

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('academy:settings.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('academy:settings.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                  {t('academy:settings.saveButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
