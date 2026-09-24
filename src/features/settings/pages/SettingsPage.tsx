/**
 * Settings Page.
 *
 * Platform-level settings and configuration management.
 */
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from '../components/GeneralSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { CommunicationsSettings } from '../components/CommunicationsSettings';

export default function SettingsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        titleKey="settings:title"
        descriptionKey="settings:subtitle"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            {t('settings:general.title')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            {t('settings:notifications.title')}
          </TabsTrigger>
          <TabsTrigger value="security">
            {t('settings:security.title')}
          </TabsTrigger>
          <TabsTrigger value="communications">
            {t('settings:communications.title')}
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

        {/* P66 — emailed sign-in codes, trusted devices, digests, quota alerts, providers. */}
        <TabsContent value="communications" className="space-y-6">
          <CommunicationsSettings />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
