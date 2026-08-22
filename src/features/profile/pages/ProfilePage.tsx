/**
 * User Profile Page.
 *
 * View and edit user profile information, preferences, and account settings.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser, useAuth } from "@hooks";
import { ProfilePersonalSection } from "../components/ProfilePersonalSection";
import { ProfileAccountSection } from "../components/ProfileAccountSection";
import { ProfilePreferencesSection } from "../components/ProfilePreferencesSection";
import { ProfileSecuritySection } from "../components/ProfileSecuritySection";

export default function ProfilePage(): JSX.Element {
  const { t } = useTranslation();
  const { isRestoring } = useAuth();
  const user = useCurrentUser();
  const [activeTab, setActiveTab] = useState("personal");
  const isLoading = isRestoring;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t("common:actions.loading")}</p>
        </div>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            {t("profile:errors.userNotFound")}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
          <User className="size-6" strokeWidth={2} aria-hidden />
        </div>
        <PageHeader
          titleKey="profile:title"
          descriptionKey="profile:subtitle"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="personal">
            {t("profile:tabs.personal")}
          </TabsTrigger>
          <TabsTrigger value="account">{t("profile:tabs.account")}</TabsTrigger>
          <TabsTrigger value="preferences">
            {t("profile:tabs.preferences")}
          </TabsTrigger>
          <TabsTrigger value="security">
            {t("profile:tabs.security")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <ProfilePersonalSection user={user} />
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <ProfileAccountSection user={user} />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <ProfilePreferencesSection />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <ProfileSecuritySection />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
