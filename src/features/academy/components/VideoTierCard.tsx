/**
 * Video protection tier card (P64 Phase 2, D10/D11).
 *
 * The tier NEW uploads are created under — never a statement about the
 * videos already uploaded, which keep the tier they were uploaded with
 * (D11). The GET returns what the academy chose AND what the plan
 * entitles, so Premium is only offered when the plan includes it; the
 * server still refuses it with `403 errors.entitlement.videoTierNotEntitled`
 * if the plan changed under the screen, and that copy is shown.
 *
 * Owner only — reads included. A change is confirmed first because it
 * decides how every future upload is delivered to learners.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clapperboard, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from '@components/feedback';
import { useToast } from '@app/providers';
import { useAcademyVideoTier, useUpdateAcademyVideoTier } from '../hooks';
import {
  isOwnerOnlyRefusal,
  protectionErrorMessage,
} from '../utils/academy-protection.utils';
import { ProtectionOwnerOnlyNotice } from './ProtectionOwnerOnlyNotice';
import type { AcademyVideoTierSettings, VideoSecurityTier } from '@types';

export interface VideoTierCardProps {
  readonly academyId: string;
  /** Whether the viewer may read and change the tier (Client Owner). */
  readonly canEdit: boolean;
}

const TIERS: readonly VideoSecurityTier[] = ['normal', 'premium'];

export function VideoTierCard({
  academyId,
  canEdit,
}: VideoTierCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clapperboard
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:protection.videoTier.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:protection.videoTier.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <VideoTierBody academyId={academyId} />
        ) : (
          <ProtectionOwnerOnlyNotice />
        )}
      </CardContent>
    </Card>
  );
}

function VideoTierBody({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element {
  const { data, isLoading, error, refetch } = useAcademyVideoTier(academyId, {
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (isOwnerOnlyRefusal(error)) return <ProtectionOwnerOnlyNotice />;
  if (error || !data) {
    return <ErrorState kind={error?.kind} onRetry={() => refetch()} />;
  }
  return <VideoTierForm academyId={academyId} data={data} />;
}

function VideoTierForm({
  academyId,
  data,
}: {
  readonly academyId: string;
  readonly data: AcademyVideoTierSettings;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const update = useUpdateAcademyVideoTier(academyId);
  const [selected, setSelected] = useState<VideoSecurityTier>(
    data.videoSecurityTier
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setSelected(data.videoSecurityTier);
  }, [data.videoSecurityTier]);

  const premiumEntitled = data.entitled === 'premium';
  const isDirty = selected !== data.videoSecurityTier;

  const save = (): void => {
    update.mutate(
      { videoSecurityTier: selected },
      {
        onSuccess: () => notifySuccess('academy:protection.videoTier.saved'),
        onError: () => notifyError('academy:protection.videoTier.saveFailed'),
      }
    );
  };

  const inlineError = update.error
    ? protectionErrorMessage(
        t,
        i18n,
        update.error,
        'academy:protection.videoTier.saveFailed'
      )
    : null;

  return (
    <div className="space-y-4" aria-busy={update.isPending}>
      <RadioGroup
        value={selected}
        onValueChange={(value) => setSelected(value as VideoSecurityTier)}
        disabled={update.isPending}
        aria-label={t('academy:protection.videoTier.title')}
        className="gap-3"
      >
        {TIERS.map((tier) => {
          const locked = tier === 'premium' && !premiumEntitled;
          return (
            <div
              key={tier}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <RadioGroupItem
                value={tier}
                id={`video-tier-${tier}`}
                disabled={locked}
                className="mt-0.5"
                aria-describedby={`video-tier-${tier}-description`}
              />
              <Label
                htmlFor={`video-tier-${tier}`}
                className="flex-1 cursor-pointer space-y-1 font-normal"
              >
                <span className="block text-sm font-medium text-foreground">
                  {t(`academy:protection.videoTier.options.${tier}.label`)}
                </span>
                <span
                  id={`video-tier-${tier}-description`}
                  className="block text-xs text-muted-foreground"
                >
                  {t(
                    `academy:protection.videoTier.options.${tier}.description`
                  )}
                  {locked
                    ? ` ${t('academy:protection.videoTier.notInPlan')}`
                    : ''}
                </span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        {t('academy:protection.videoTier.newUploadsOnly')}
      </p>
      {data.source === 'plan' ? (
        <p className="text-xs text-muted-foreground" role="status">
          {t('academy:protection.videoTier.planDefault')}
        </p>
      ) : null}

      {inlineError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{inlineError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={!isDirty || update.isPending}
        >
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" strokeWidth={2} aria-hidden />
          )}
          {t('academy:protection.videoTier.save')}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('academy:protection.videoTier.confirm.title', {
                tier: t(
                  `academy:protection.videoTier.options.${selected}.label`
                ),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('academy:protection.videoTier.confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false);
                save();
              }}
            >
              {t('academy:protection.videoTier.confirm.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
