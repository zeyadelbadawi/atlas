/**
 * Learner device policy card (P64 Phase 2, D4/D8).
 *
 * `maxDevices` — how many browsers a learner may keep registered to this
 * academy. The cap applies to devices ALREADY registered, not only new
 * ones: after a lower limit, the learner's most recently registered
 * devices are refused (oldest keep working) until they remove one on
 * their Devices page. That is why LOWERING a limit is confirmed first.
 *
 * `maxConcurrentSessions` — the concurrent-session limit the backend
 * stores and reports to the learner's Devices page. Lesson playback
 * itself is one device at a time (the learning lease) whatever this says,
 * so the helper text does not promise more.
 *
 * Both are bounded by the platform maximum the GET returns; the server
 * refuses anything above it (`errors.academy.devicePolicyAboveMaximum`)
 * rather than silently lowering it. Owner only — reads included.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MonitorSmartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { useAcademyDevicePolicy, useUpdateAcademyDevicePolicy } from '../hooks';
import {
  buildDevicePolicySchema,
  DEVICE_POLICY_DTO_MAX_DEVICES,
  DEVICE_POLICY_DTO_MAX_SESSIONS,
  type DevicePolicyFormData,
} from '../schemas/academy-protection.schemas';
import {
  isOwnerOnlyRefusal,
  protectionErrorMessage,
} from '../utils/academy-protection.utils';
import { ProtectionOwnerOnlyNotice } from './ProtectionOwnerOnlyNotice';
import type { AcademyDevicePolicy } from '@types';

export interface DevicePolicyCardProps {
  readonly academyId: string;
  /** Whether the viewer may read and change the policy (Client Owner). */
  readonly canEdit: boolean;
}

export function DevicePolicyCard({
  academyId,
  canEdit,
}: DevicePolicyCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:protection.devices.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:protection.devices.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <DevicePolicyBody academyId={academyId} />
        ) : (
          <ProtectionOwnerOnlyNotice />
        )}
      </CardContent>
    </Card>
  );
}

function DevicePolicyBody({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element {
  const { data, isLoading, error, refetch } = useAcademyDevicePolicy(
    academyId,
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (isOwnerOnlyRefusal(error)) return <ProtectionOwnerOnlyNotice />;
  if (error || !data) {
    return <ErrorState kind={error?.kind} onRetry={() => refetch()} />;
  }
  return <DevicePolicyForm academyId={academyId} data={data} />;
}

function DevicePolicyForm({
  academyId,
  data,
}: {
  readonly academyId: string;
  readonly data: AcademyDevicePolicy;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const update = useUpdateAcademyDevicePolicy(academyId);
  const [pending, setPending] = useState<DevicePolicyFormData | null>(null);

  const maxDevices = Math.min(
    data.platformMaxDevices,
    DEVICE_POLICY_DTO_MAX_DEVICES
  );
  const maxSessions = Math.min(
    data.platformMaxConcurrentSessions,
    DEVICE_POLICY_DTO_MAX_SESSIONS
  );
  const schema = useMemo(
    () => buildDevicePolicySchema(maxDevices, maxSessions),
    [maxDevices, maxSessions]
  );

  const form = useForm<DevicePolicyFormData>({
    resolver: zodResolver(schema),
    values: {
      maxDevices: data.maxDevices,
      maxConcurrentSessions: data.maxConcurrentSessions,
    },
  });

  const save = (values: DevicePolicyFormData): void => {
    update.mutate(
      {
        maxDevices: values.maxDevices,
        maxConcurrentSessions: values.maxConcurrentSessions,
      },
      {
        onSuccess: () => notifySuccess('academy:protection.devices.saved'),
        onError: () => notifyError('academy:protection.devices.saveFailed'),
      }
    );
  };

  const onSubmit = (values: DevicePolicyFormData): void => {
    const restricts =
      values.maxDevices < data.maxDevices ||
      values.maxConcurrentSessions < data.maxConcurrentSessions;
    if (restricts) {
      setPending(values);
      return;
    }
    save(values);
  };

  const inlineError = update.error
    ? protectionErrorMessage(
        t,
        i18n,
        update.error,
        'academy:protection.devices.saveFailed'
      )
    : null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        // The schema's translated message, not the browser's bubble.
        noValidate
        className="space-y-4"
        aria-busy={update.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="maxDevices"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('academy:protection.devices.maxDevices.label')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxDevices}
                    step={1}
                    disabled={update.isPending}
                    className="sm:max-w-[10rem]"
                  />
                </FormControl>
                <FormDescription>
                  {t('academy:protection.devices.maxDevices.description', {
                    max: maxDevices,
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxConcurrentSessions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('academy:protection.devices.maxSessions.label')}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxSessions}
                    step={1}
                    disabled={update.isPending}
                    className="sm:max-w-[10rem]"
                  />
                </FormControl>
                <FormDescription>
                  {t('academy:protection.devices.maxSessions.description', {
                    max: maxSessions,
                  })}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground" role="status">
          {t(`academy:protection.devices.source.${data.source}`)}
        </p>

        {inlineError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{inlineError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!form.formState.isDirty || update.isPending}
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" strokeWidth={2} aria-hidden />
            )}
            {t('academy:protection.devices.save')}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('academy:protection.devices.confirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('academy:protection.devices.confirm.description', {
                devices: pending?.maxDevices ?? data.maxDevices,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) save(pending);
                setPending(null);
              }}
            >
              {t('academy:protection.devices.confirm.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
