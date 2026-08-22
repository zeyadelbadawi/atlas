/**
 * Notifications Page.
 *
 * Displays user notifications with filtering and actions.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Check, Trash2 } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage(): JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  return (
    <PageContainer>
      <PageHeader
        titleKey="notifications:title"
        descriptionKey="notifications:subtitle"
      />

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as "all" | "unread")}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              {t("notifications:filters.all")}
            </TabsTrigger>
            <TabsTrigger value="unread">
              {t("notifications:filters.unread")}
              <Badge variant="secondary" className="ml-2">
                0
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              {t("notifications:actions.markAllRead")}
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              {t("notifications:actions.clearAll")}
            </Button>
          </div>
        </div>

        <TabsContent value={filter} className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {t("notifications:empty")}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
