/**
 * Billing Page.
 *
 * Displays subscription information and billing history.
 */
import { useTranslation } from 'react-i18next';
import { CreditCard, FileText, Download } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function BillingPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader titleKey="billing:title" descriptionKey="billing:subtitle" />

      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('billing:currentPlan.title')}</CardTitle>
                <CardDescription>
                  {t('billing:currentPlan.description')}
                </CardDescription>
              </div>
              <Badge variant="default">{t('billing:status.active')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{t('billing:plans.free')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('billing:currentPlan.price', { amount: '$0' })}
                </p>
              </div>
              <Button>{t('billing:actions.upgrade')}</Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">
                {t('billing:currentPlan.features')}
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('billing:features.basicAccess')}</li>
                <li>• {t('billing:features.limitedStorage')}</li>
                <li>• {t('billing:features.communitySupport')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>{t('billing:paymentMethod.title')}</CardTitle>
            <CardDescription>
              {t('billing:paymentMethod.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('billing:paymentMethod.empty')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('billing:history.title')}</CardTitle>
                <CardDescription>
                  {t('billing:history.description')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('billing:actions.downloadAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t('billing:history.empty')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
