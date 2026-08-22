/**
 * Academy Create Page.
 *
 * Guided academy creation with form validation and error handling.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
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
import { toast } from '@/hooks/use-toast';
import { usePlatform } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCreateAcademy } from '../hooks';
import {
  createAcademySchema,
  type CreateAcademyFormData,
} from '../schemas/academy.schemas';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_TIMEZONE,
  DEFAULT_CURRENCY,
} from '../constants/academy.constants';

export default function AcademyCreatePage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setActiveAcademy } = usePlatform();
  const { mutateAsync: createAcademy, isPending } = useCreateAcademy();

  const form = useForm<CreateAcademyFormData>({
    resolver: zodResolver(createAcademySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      country: '',
      language: DEFAULT_LANGUAGE,
      timezone: DEFAULT_TIMEZONE,
      currency: DEFAULT_CURRENCY,
    },
  });

  const onSubmit = async (data: CreateAcademyFormData) => {
    try {
      const academy = await createAcademy(data);
      toast({
        title: t('academy:create.success'),
        description: t('common:states.success.description'),
      });
      setActiveAcademy(academy.id);
      navigate(
        buildPath(DASHBOARD_ROUTES.academyOnboarding, {
          academyId: academy.id,
        }),
        { replace: true }
      );
    } catch (error) {
      toast({
        title: t('academy:create.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    navigate(DASHBOARD_ROUTES.academy);
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="academy:create.title"
        descriptionKey="academy:create.subtitle"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:create.basicInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:create.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('academy:create.namePlaceholder')}
                        {...field}
                      />
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
                        placeholder={t('academy:create.slugPlaceholder')}
                        {...field}
                      />
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
                      {t('academy:create.descriptionLabel')}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({t('academy:create.optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('academy:create.descriptionPlaceholder')}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>{t('academy:create.configuration')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('academy:create.languageLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'academy:create.languagePlaceholder'
                              )}
                            />
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'academy:create.timezonePlaceholder'
                              )}
                            />
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'academy:create.currencyPlaceholder'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">
                            GBP - British Pound
                          </SelectItem>
                          <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                          <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('academy:create.countryLabel')}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({t('academy:create.optional')})
                        </span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'academy:create.countryPlaceholder'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AE">
                            United Arab Emirates
                          </SelectItem>
                          <SelectItem value="SA">Saudi Arabia</SelectItem>
                          <SelectItem value="EG">Egypt</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('academy:profile.contactInfo')}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({t('academy:create.optional')})
                </span>
              </CardTitle>
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
                        <Input
                          type="email"
                          placeholder={t(
                            'academy:create.contactEmailPlaceholder'
                          )}
                          {...field}
                        />
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
                        <Input
                          type="tel"
                          placeholder={t(
                            'academy:create.contactPhonePlaceholder'
                          )}
                          {...field}
                        />
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
                      <Input
                        type="url"
                        placeholder={t('academy:create.websitePlaceholder')}
                        {...field}
                      />
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
              {t('academy:create.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('academy:create.creating')}
                </>
              ) : (
                <>
                  <Building2 className="size-4" strokeWidth={2} aria-hidden />
                  {t('academy:create.createButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
