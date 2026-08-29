/**
 * Organization Create Page (Phase P19).
 *
 * The real entry point into the Client onboarding journey — previously
 * missing entirely (`Reports/DEVELOPMENT_E2E_FLOW_AUDIT.md` P0-1).
 * Reached from `OrganizationOverviewPage`'s own empty state, itself
 * already reachable by every authenticated user regardless of org
 * membership (no `requiredPermissions` on its nav entry).
 *
 * After a successful create, `refreshSession()` re-fetches `GET /users/me`
 * (via `sessionService.refresh`), which re-derives `session.organization`
 * as the new membership (server-marked `isPrimary: true` — see
 * `OrganizationsService.create`) — no explicit `switchOrganization` call
 * needed. Then navigates to Plans, the real next step of the journey.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useCreateOrganization } from '../hooks';
import {
  createOrganizationSchema,
  type CreateOrganizationFormData,
} from '../schemas/organization.schemas';

export default function OrganizationCreatePage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const { mutateAsync: createOrganization, isPending } = useCreateOrganization();

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: CreateOrganizationFormData) => {
    try {
      await createOrganization(data);
      toast({
        title: t('organization:create.success'),
        description: t('common:states.success.description'),
      });
      // Re-fetches the real user profile — including the brand-new
      // membership/permissions — so every `requiredPermissions`-gated
      // route the rest of the journey needs is immediately usable, not
      // stale until the next natural session refresh.
      await refreshSession();
      navigate(DASHBOARD_ROUTES.plans, { replace: true });
    } catch (error) {
      toast({
        title: t('organization:create.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="organization:create.title"
        descriptionKey="organization:create.subtitle"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('organization:create.basicInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organization:create.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('organization:create.namePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Building2 className="size-4" strokeWidth={2} aria-hidden />
              )}
              {t('organization:create.submit')}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
