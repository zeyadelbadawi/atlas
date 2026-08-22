/**
 * Settings Page.
 *
 * Platform-level settings and configuration management.
 */
import { useTranslation } from "react-i18next";
import { Settings as SettingsIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "../components/GeneralSettings";
import { NotificationSettings } from "../components/NotificationSettings";
import { SecuritySettings } from "../components/SecuritySettings";

export default function SettingsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        titleKey="settings:page.title"
        descriptionKey="settings:page.description"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            {t("settings:tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {t("settings:tabs.notifications")}
          </TabsTrigger>
          <TabsTrigger value="security">
            {t("settings:tabs.security")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
