/**
 * Profile Account Section.
 *
 * Display account information and status.
 */
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CurrentUser } from "@types";

export interface ProfileAccountSectionProps {
  readonly user: CurrentUser;
}

export function ProfileAccountSection({
  user,
}: ProfileAccountSectionProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile:sections.account.title")}</CardTitle>
        <CardDescription>
          {t("profile:sections.account.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("profile:fields.userId")}
            </p>
            <p className="mt-1 font-mono text-sm">{user.id}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("profile:fields.accountStatus")}
            </p>
            <Badge variant="success" className="mt-1">
              {t("profile:status.active")}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("profile:fields.role")}
            </p>
            <p className="mt-1 text-sm capitalize">
              {user.roles.length > 0
                ? user.roles.join(", ")
                : t("profile:status.noRole")}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("profile:fields.memberSince")}
            </p>
            <p className="mt-1 text-sm">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium mb-3">
            {t("profile:sections.account.organizations")}
          </h3>
          {user.organizationMemberships &&
          user.organizationMemberships.length > 0 ? (
            <div className="space-y-2">
              {user.organizationMemberships.map((membership) => (
                <div
                  key={membership.organizationId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{membership.organizationName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {membership.role}
                    </p>
                  </div>
                  {membership.isPrimary ? (
                    <Badge variant="outline">
                      {t("profile:status.current")}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("profile:sections.account.noOrganizations")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
