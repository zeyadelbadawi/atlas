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
import { Globe2, Loader2, Mail, Save, SlidersHorizontal } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { saveViaForm } from '@utils';
import { useAuth, useUnsavedChanges } from '@hooks';
import { useAcademyDomain } from '@features/domain';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy, useUpdateAcademy } from '../hooks';
import { DeleteAcademyCard } from '../components/DeleteAcademyCard';
import { RegistrationPolicyCard } from '../components/RegistrationPolicyCard';
import { CommunicationSettingsCard } from '../components/CommunicationSettingsCard';
import { AcademyInvitesCard } from '../components/AcademyInvitesCard';
import { ContentProtectionCard } from '../components/ContentProtectionCard';
import { VideoTierCard } from '../components/VideoTierCard';
import { DevicePolicyCard } from '../components/DevicePolicyCard';
import { getAcademyAdminTabs } from '../utils/academy-navigation.utils';
import {
  updateAcademySettingsSchema,
  type UpdateAcademySettingsFormData,
} from '../schemas/academy.schemas';
import type { BreadcrumbItem } from '@types';

export default function AcademySettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { organization } = useAuth();

  /*
    P64 Phase 1 (D8) — changing the registration policy is a SECURITY
    policy, restricted to the Client Owner (`assertCanManageSecurityPolicy`);
    a Manager reading this page gets `403 errors.academy.insufficientRole`.
    The card is told up front so a Manager is never shown a Save that can
    only fail, and it still maps the 403 — the session's role is a hint,
    the server is the authority.
  */
  const canManageRegistrationPolicy = organization?.role === 'owner';

  /*
    The invite link is `https://{academy host}/sign-up?invite={token}`.
    The host is a backend-resolved fact — the connected custom domain when
    there is one, otherwise the allocated Atlas subdomain — never a host
    assembled on the client from the slug and a compiled-in base domain
    (the same rule `WebsiteOverviewPage` follows). Without one the create
    dialog shows the raw token and says so.
  */
  const { data: domainConfiguration } = useAcademyDomain(academyId ?? '');
  const academyHost =
    domainConfiguration?.canonicalHost?.host ??
    domainConfiguration?.subdomain?.fullHost;

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
  // `save` resolves false after a failure it already reported, so both the
  // Save button and the unsaved-changes dialog's "Save and leave" share it.
  const save = async (data: UpdateAcademySettingsFormData): Promise<boolean> => {
    if (!academyId) return false;

    try {
      await updateAcademy({
        id: academyId,
        payload: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          status: data.status,
          language: data.language,
          timezone: data.timezone,
          currency: data.currency,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          website: data.website || null,
        },
      });
      // The saved values are the new baseline: clean now, not after the
      // refetch — and still clean if the server echoes them back unchanged.
      form.reset(data);
      toast({
        title: t('academy:settings.success'),
        description: t('common:states.success.description'),
      });
      return true;
    } catch {
      toast({
        title: t('academy:settings.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const onSubmit = async (data: UpdateAcademySettingsFormData) => {
    await save(data);
  };

  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, save),
  });

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

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'academy:settings.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={academy.name}
        titleKey="academy:settings.title"
        descriptionKey="academy:settings.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs items={getAcademyAdminTabs(academyId ?? '')} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t('academy:settings.general')}
              </CardTitle>
              <CardDescription>
                {t('academy:settings.generalDescription')}
              </CardDescription>
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
              <CardTitle className="flex items-center gap-2">
                <Globe2
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t('academy:settings.localization')}
              </CardTitle>
              <CardDescription>
                {t('academy:settings.localizationDescription')}
              </CardDescription>
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
              <CardTitle className="flex items-center gap-2">
                <Mail
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t('academy:settings.contact')}
              </CardTitle>
              <CardDescription>
                {t('academy:settings.contactDescription')}
              </CardDescription>
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

      {/*
        Outside the form, and last on the page: deleting is not a setting
        being saved, and a destructive action belongs after everything it
        would destroy rather than beside the Save button.
      */}
      {/*
        Registration (P64 Phase 1) — how learners get ONTO the academy,
        which is a property of the academy rather than a field of the
        settings form: both cards read and write their own endpoints
        (`registration-policy`, `invites`) and save independently, so they
        sit outside the form and never share its dirty state or Save.
      */}
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold">
          {t('academy:registration.sectionTitle')}
        </h2>
        <RegistrationPolicyCard
          academyId={academyId ?? ''}
          canEdit={canManageRegistrationPolicy}
        />
        <AcademyInvitesCard
          academyId={academyId ?? ''}
          academyHost={academyHost}
        />
      </div>

      {/*
        Communication (P66) — emailed sign-in codes, announcement email
        and the learner digest default. Owner-only like the registration
        policy, and its own endpoint, so it also lives outside the form.
      */}
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold">
          {t('academy:communication.sectionTitle')}
        </h2>
        <CommunicationSettingsCard
          academyId={academyId ?? ''}
          canEdit={canManageRegistrationPolicy}
        />
      </div>

      {/*
        Content protection (P64 Phase 2, D8/D10) — watermark, the default
        video tier for new uploads, and the learner device limits. Three
        endpoints, all Client Owner only for READING as well as writing
        (`assertCanManageSecurityPolicy` runs on every GET), so each card
        is told `canEdit` and a Manager sees why they are empty instead of
        a request that can only 403. Not behind a frontend feature flag:
        the server is the boundary, and a flag would only hide the truth.
      */}
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold">
          {t('academy:protection.sectionTitle')}
        </h2>
        <ContentProtectionCard
          academyId={academyId ?? ''}
          canEdit={canManageRegistrationPolicy}
        />
        <VideoTierCard
          academyId={academyId ?? ''}
          canEdit={canManageRegistrationPolicy}
        />
        <DevicePolicyCard
          academyId={academyId ?? ''}
          canEdit={canManageRegistrationPolicy}
        />
      </div>

      <div className="mt-8">
        <DeleteAcademyCard academy={academy} />
      </div>
    </PageContainer>
  );
}
