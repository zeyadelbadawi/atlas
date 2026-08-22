/**
 * Website Brand Tab.
 *
 * Primary logo and favicon remain on the existing Academy Branding page
 * (Prompt 3B, `AcademyService.updateAcademyBranding`) — this tab only adds
 * what that page does not already cover: a dark-background logo variant
 * and the website's color tokens (see `website.types.ts`'s doc comment).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { toast } from '@/hooks/use-toast';
import { useUpdateWebsiteConfiguration } from '../hooks';
import { WebsiteColorField } from './WebsiteColorField';
import { WebsiteImageField } from './WebsiteImageField';
import type { WebsiteConfiguration } from '@types';

export interface WebsiteBrandTabProps {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
}

export function WebsiteBrandTab({
  academyId,
  configuration,
}: WebsiteBrandTabProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateConfig = useUpdateWebsiteConfiguration();

  const save = (brand: Partial<WebsiteConfiguration['brand']>) => {
    updateConfig.mutate(
      { academyId, payload: { brand } },
      {
        onSuccess: () => {
          toast({ title: t('website:brand.saved') });
        },
        onError: () => {
          toast({ title: t('website:brand.saveError'), variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('website:brand.primaryLogoNote')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(buildPath(DASHBOARD_ROUTES.academyBranding, { academyId }))
            }
          >
            {t('website:brand.manageInAcademyBranding')}
            <ExternalLink className="size-3.5" aria-hidden />
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
          <WebsiteColorField
            id="website-primary-color"
            labelKey="website:brand.primaryColor"
            value={configuration.brand.primaryColor}
            onChange={(primaryColor) => save({ primaryColor })}
          />
          <WebsiteColorField
            id="website-secondary-color"
            labelKey="website:brand.secondaryColor"
            value={configuration.brand.secondaryColor}
            onChange={(secondaryColor) => save({ secondaryColor })}
          />
          <WebsiteColorField
            id="website-accent-color"
            labelKey="website:brand.accentColor"
            value={configuration.brand.accentColor}
            onChange={(accentColor) => save({ accentColor })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <WebsiteImageField
            id="website-dark-logo"
            labelKey="website:brand.darkLogo"
            value={configuration.brand.darkLogo}
            onChange={(darkLogo) => save({ darkLogo })}
            aspectClassName="aspect-video bg-neutral-900"
          />
          <p className="text-sm text-muted-foreground">
            {t('website:brand.darkLogoHelp')}
          </p>
        </CardContent>
      </Card>

      {updateConfig.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('website:common.saving')}
        </p>
      ) : null}
    </div>
  );
}
