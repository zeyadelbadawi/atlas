/**
 * Academy Settings Page.
 *
 * Configure academy preferences including general settings, localization,
 * contact information. The internal lifecycle status is not edited here (Task 1): the website publish state is the client-facing status.
 */
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Globe2,
  Loader2,
  Mail,
  MessageSquare,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  UserPlus,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
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
import { saveViaForm, currencyOptions } from '@utils';
import { useAuth, usePermissions, useUnsavedChanges } from '@hooks';
import { cn } from '@utils';
import { useConfirmDialog } from '@app/providers';
import { useUnsavedChangesRegistry } from '@features/unsaved-changes';
import { useAcademyDomain } from '@features/domain';
import {
  nameConflictFromError,
  useNameConflictError,
  useServerValidation,
} from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy, useUpdateAcademy } from '../hooks';
import { DeleteAcademyCard } from '../components/DeleteAcademyCard';
import { AcademySlugDescription } from '../components/AcademySlugDescription';
import { academySlugErrorMessage } from '../utils/academy-slug-error.utils';
import { RegistrationPolicyCard } from '../components/RegistrationPolicyCard';
import { CommunicationSettingsCard } from '../components/CommunicationSettingsCard';
import { AcademyInvitesCard } from '../components/AcademyInvitesCard';
import { ContentProtectionCard } from '../components/ContentProtectionCard';
import { VideoTierCard } from '../components/VideoTierCard';
import { DevicePolicyCard } from '../components/DevicePolicyCard';
import {
  updateAcademySettingsSchema,
  type UpdateAcademySettingsFormData,
} from '../schemas/academy.schemas';
import type { BreadcrumbItem, LanguageCode } from '@types';

/*
  The page is split into sections with their own view (a vertical list on
  wide screens, a scrollable row on phones) so an owner sees one topic and
  at most one save action at a time. `?section=` deep-links a section.
*/
const SETTINGS_SECTIONS = [
  { id: 'details', icon: Building2 },
  { id: 'registration', icon: UserPlus },
  { id: 'communication', icon: MessageSquare },
  { id: 'protection', icon: ShieldCheck },
  { id: 'video', icon: Video },
  { id: 'devices', icon: Smartphone },
  { id: 'danger', icon: Trash2 },
] as const satisfies readonly { id: string; icon: LucideIcon }[];

type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['id'];

const isSettingsSection = (value: string | null): value is SettingsSection =>
  SETTINGS_SECTIONS.some((section) => section.id === value);

export default function AcademySettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
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
  // The web address (slug) can only be changed by the Organization Owner
  // (backend-enforced, 403 otherwise); others see it read-only.
  const canChangeSlug = organization?.role === 'owner';

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
  // One slug change every 60 days: until then the field is read-only and
  // says when the next change is possible (the server refuses it anyway).
  const slugLocked = !!academy?.nextSlugChangeAt;
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
  // W4 — academy names are unique platform-wide: a taken name is shown on
  // the name field instead of a generic toast.
  useNameConflictError(form, mutationError);
  // `save` resolves false after a failure it already reported, so both the
  // Save button and the unsaved-changes dialog's "Save and leave" share it.
  const save = async (
    data: UpdateAcademySettingsFormData
  ): Promise<boolean> => {
    if (!academyId) return false;

    try {
      await updateAcademy({
        id: academyId,
        payload: {
          name: data.name,
          slug: data.slug,
          description: data.description || null,
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

  // Deleting needs `academy.provisioning.create` (DeleteAcademyCard renders
  // nothing without it), so the Delete section is offered only with it.
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission('academy.provisioning.create');
  const visibleSections = SETTINGS_SECTIONS.filter(
    ({ id }) => id !== 'danger' || canDelete
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const [section, setSection] = useState<SettingsSection>(
    isSettingsSection(requestedSection) &&
      (requestedSection !== 'danger' || canDelete)
      ? requestedSection
      : 'details'
  );
  const { confirm } = useConfirmDialog();
  const unsaved = useUnsavedChangesRegistry();

  // Sections unmount when another opens, so unsaved edits would vanish
  // without a navigation the route blocker could see: ask first.
  const handleSectionChange = async (next: SettingsSection) => {
    if (next === section) return;
    if (unsaved?.isDirtyNow()) {
      const leave = await confirm({
        titleKey: 'common:unsavedChanges.title',
        descriptionKey: 'common:unsavedChanges.description',
        confirmLabelKey: 'common:unsavedChanges.leave',
        cancelLabelKey: 'common:unsavedChanges.stay',
        intent: 'destructive',
      });
      if (!leave) return;
      form.reset();
    }
    setSection(next);
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        updated.set('section', next);
        return updated;
      },
      { replace: true }
    );
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

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav
          aria-label={t('academy:settings.nav.label')}
          className="-mx-4 mb-6 overflow-x-auto px-4 lg:sticky lg:top-6 lg:mx-0 lg:mb-0 lg:overflow-visible lg:px-0"
        >
          <ul className="flex gap-2 lg:flex-col lg:gap-1">
            {visibleSections.map(({ id, icon: Icon }) => {
              const active = id === section;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleSectionChange(id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-3 whitespace-nowrap rounded-md border px-3 py-2 text-start text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:border-transparent',
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                      id === 'danger' &&
                        !active &&
                        'lg:mt-4 lg:text-destructive'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t(`academy:settings.nav.${id}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section
          aria-labelledby="academy-settings-section-title"
          className="min-w-0 space-y-6"
        >
          <header className="space-y-1">
            <h2
              id="academy-settings-section-title"
              className="text-lg font-semibold"
            >
              {t(`academy:settings.nav.${section}`)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(`academy:settings.nav.${section}Description`)}
            </p>
          </header>

          {section === 'details' && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
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
                            <Input
                              {...field}
                              dir="ltr"
                              data-ltr-content
                              readOnly={!canChangeSlug || slugLocked}
                              aria-readonly={
                                !canChangeSlug || slugLocked || undefined
                              }
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
                            <FormLabel>
                              {t('academy:create.languageLabel')}
                            </FormLabel>
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
                            <FormLabel>
                              {t('academy:create.timezoneLabel')}
                            </FormLabel>
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
                                <SelectItem value="Asia/Dubai">
                                  Asia/Dubai
                                </SelectItem>
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
                            <FormLabel>
                              {t('academy:create.currencyLabel')}
                            </FormLabel>
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
                                {/* From the academy as saved, not `field.value`:
                              this form mounts a render before `values`
                              applies, and options without a legacy currency
                              make Radix's native select clear the field. */}
                                {currencyOptions(academy.currency).map(
                                  (code) => (
                                    <SelectItem key={code} value={code}>
                                      {code}
                                    </SelectItem>
                                  )
                                )}
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
                          <FormLabel>
                            {t('academy:create.websiteLabel')}
                          </FormLabel>
                          <FormControl>
                            <Input type="url" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/*
                  One save for the whole section, shown only while there
                  is something to save (a contextual save bar).
                */}
                {(form.formState.isDirty || isPending) && (
                  <div
                    role="region"
                    aria-label={t('academy:settings.unsavedBar')}
                    className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
                  >
                    <p className="text-sm font-medium" aria-live="polite">
                      {t('academy:settings.unsavedBar')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() => form.reset()}
                        disabled={isPending}
                      >
                        {t('academy:settings.discardButton')}
                      </Button>
                      <Button
                        type="submit"
                        className="min-h-11"
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <Loader2
                              className="size-4 animate-spin"
                              aria-hidden
                            />
                            {t('academy:settings.saving')}
                          </>
                        ) : (
                          <>
                            <Save
                              className="size-4"
                              strokeWidth={2}
                              aria-hidden
                            />
                            {t('academy:settings.saveButton')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          )}

          {/*
            The other sections read and write their own endpoints and save
            independently (Client Owner only for registration, communication
            and protection — each card is told `canEdit` and the server stays
            the authority), so they never share the details form's state.
          */}
          {section === 'registration' && (
            <>
              <RegistrationPolicyCard
                academyId={academyId ?? ''}
                canEdit={canManageRegistrationPolicy}
              />
              <AcademyInvitesCard
                academyId={academyId ?? ''}
                academyHost={academyHost}
              />
            </>
          )}

          {section === 'communication' && (
            <CommunicationSettingsCard
              academyId={academyId ?? ''}
              canEdit={canManageRegistrationPolicy}
            />
          )}

          {section === 'protection' && (
            <ContentProtectionCard
              academyId={academyId ?? ''}
              canEdit={canManageRegistrationPolicy}
            />
          )}

          {section === 'video' && (
            <VideoTierCard
              academyId={academyId ?? ''}
              canEdit={canManageRegistrationPolicy}
            />
          )}

          {section === 'devices' && (
            <DevicePolicyCard
              academyId={academyId ?? ''}
              canEdit={canManageRegistrationPolicy}
            />
          )}

          {section === 'danger' && <DeleteAcademyCard academy={academy} />}
        </section>
      </div>
    </PageContainer>
  );
}
