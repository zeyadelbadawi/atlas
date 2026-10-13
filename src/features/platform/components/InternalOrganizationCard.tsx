/**
 * B0-ANL-04 — marks an organization as internal (test, demo or staff) so
 * platform metrics such as MRR leave it out. Platform Owner only; the
 * customer never sees this flag. Every change is audited on the server.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage } from '@utils';
import {
  useOrganizationPlatformFlags,
  useSetOrganizationInternal,
} from '../hooks';

export function InternalOrganizationCard({
  organizationId,
}: {
  readonly organizationId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const flags = useOrganizationPlatformFlags(organizationId);
  const setInternal = useSetOrganizationInternal(organizationId);
  const switchId = `internal-organization-${organizationId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('platform:organizations.internal.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor={switchId}>
              {t('platform:organizations.internal.label')}
            </Label>
            <p
              id={`${switchId}-help`}
              className="text-sm text-muted-foreground"
            >
              {t('platform:organizations.internal.description')}
            </p>
          </div>
          <Switch
            id={switchId}
            aria-describedby={`${switchId}-help`}
            checked={flags.data?.isInternal ?? false}
            disabled={flags.isLoading || flags.isError || setInternal.isPending}
            onCheckedChange={(checked) => setInternal.mutate(checked)}
          />
        </div>
        {flags.isError ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {apiErrorMessage(t, i18n, flags.error)}
          </p>
        ) : null}
        {setInternal.isError ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {apiErrorMessage(t, i18n, setInternal.error)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
