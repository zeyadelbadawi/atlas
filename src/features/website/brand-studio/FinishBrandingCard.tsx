/**
 * "Finish branding" (Theme 1 plan §F.4.3 step 3): shown on the provisioning
 * status surfaces while setup-form branding is being saved, and — with a
 * retry — if saving it failed. Nothing is shown when there was no pending
 * branding, or once it has been saved.
 */
import { useTranslation } from 'react-i18next';
import { Loader2, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDeferredBrandingPersistence } from './useDeferredBrandingPersistence';
import type { ProvisioningRequest } from '@types';

export function FinishBrandingCard({
  request,
}: {
  readonly request: Pick<ProvisioningRequest, 'id' | 'academyId' | 'steps'>;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { state, retry } = useDeferredBrandingPersistence(request);
  if (state === 'none' || state === 'saved') return null;

  return (
    <Card role={state === 'failed' ? 'alert' : 'status'}>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        {state === 'saving' ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : (
          <Palette className="size-4 text-destructive" aria-hidden />
        )}
        <p className="flex-1 text-sm text-foreground">
          {state === 'saving'
            ? t('website:brandStudio.finishSaving')
            : t('website:brandStudio.finishFailed')}
        </p>
        {state === 'failed' ? (
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="size-4" aria-hidden />
            {t('website:brandStudio.retry')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
