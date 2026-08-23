/**
 * Roles & Permissions — Platform Owner Console (Prompt 13).
 *
 * Atlas has no Role/Permission catalog entity and no assignment mutation
 * contract (see `rbac.types.ts`'s doc comment for the full boundary).
 * This page is therefore intentionally an INSPECTION view, not an
 * administration console: it shows the signed-in Platform Owner's own
 * effective roles and permissions, derived from the same `CurrentUser`
 * every RouteGuard and `usePermissions()` check already trusts — never a
 * fabricated catalog or a fake "assign role" action.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@hooks';
import { deriveEffectiveAccessSummary } from '../utils/rbac.utils';

export default function PlatformRolesPermissionsPage(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();

  const summary = useMemo(
    () => (user ? deriveEffectiveAccessSummary(user) : undefined),
    [user]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:rolesPermissions.title"
        descriptionKey="platform:rolesPermissions.subtitle"
      />

      <div className="space-y-6">
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertTitle>{t('platform:rolesPermissions.boundaryTitle')}</AlertTitle>
          <AlertDescription>{t('platform:rolesPermissions.boundaryDescription')}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('platform:rolesPermissions.rolesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!summary || summary.roles.length === 0 ? (
              <EmptyState titleKey="platform:rolesPermissions.noRoles" />
            ) : (
              <ul className="divide-y divide-border">
                {summary.roles.map((assignment, index) => (
                  <li
                    key={`${assignment.role}-${assignment.organizationId ?? 'global'}-${index}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{assignment.role}</span>
                    <span className="text-xs text-muted-foreground">
                      {assignment.scope === 'global'
                        ? t('platform:rolesPermissions.scope.global')
                        : t('platform:rolesPermissions.scope.organization', {
                            name: assignment.organizationName,
                          })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('platform:rolesPermissions.permissionsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary || summary.permissions.length === 0 ? (
              <EmptyState titleKey="platform:rolesPermissions.noPermissions" />
            ) : (
              <ul className="divide-y divide-border">
                {summary.permissions.map((assignment, index) => (
                  <li
                    key={`${assignment.permission}-${assignment.organizationId ?? 'global'}-${index}`}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <code className="font-mono text-xs text-foreground">
                      {assignment.permission}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {assignment.scope === 'global'
                        ? t('platform:rolesPermissions.scope.global')
                        : t('platform:rolesPermissions.scope.organization', {
                            name: assignment.organizationName,
                          })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
