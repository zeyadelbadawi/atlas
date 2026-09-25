/**
 * Content protection card (P64 Phase 2, D8).
 *
 * The one learner-visible protection an owner controls is the WATERMARK:
 * the lesson grant carries `watermark.enabled` and the overlay text, and
 * the player draws exactly what it is sent. Blank text means each learner
 * sees their own short id (`ID 1A2B3C4D`) — custom text replaces it, and
 * then the overlay no longer says WHICH learner was watching, so the card
 * says so.
 *
 * THE PLAYER DETERRENTS ARE SHOWN, NOT OFFERED. The backend stores
 * `disableDownload`, `disablePip` and `disableContextMenu`, but the
 * learner grant deliberately does not carry them and the player always
 * applies the stronger default (see `ProtectedVideoPlayer`). A switch
 * that saved "off" while every learner still got "on" would tell the
 * owner something untrue, so they are listed as always applied and the
 * stored values are sent back unchanged on save.
 *
 * Owner only — reads included. Turning the watermark on or off changes
 * what every learner sees on every video, so it is confirmed first.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
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
import {
  useAcademyContentProtection,
  useUpdateAcademyContentProtection,
} from '../hooks';
import {
  contentProtectionSchema,
  WATERMARK_TEXT_MAX_LENGTH,
  type ContentProtectionFormData,
} from '../schemas/academy-protection.schemas';
import {
  isOwnerOnlyRefusal,
  protectionErrorMessage,
} from '../utils/academy-protection.utils';
import { ProtectionOwnerOnlyNotice } from './ProtectionOwnerOnlyNotice';
import type { AcademyContentProtection } from '@types';

export interface ContentProtectionCardProps {
  readonly academyId: string;
  /** Whether the viewer may read and change the settings (Client Owner). */
  readonly canEdit: boolean;
}

const DETERRENTS = ['download', 'pip', 'contextMenu'] as const;

export function ContentProtectionCard({
  academyId,
  canEdit,
}: ContentProtectionCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:protection.content.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:protection.content.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canEdit ? (
          <ContentProtectionBody academyId={academyId} />
        ) : (
          <ProtectionOwnerOnlyNotice />
        )}
      </CardContent>
    </Card>
  );
}

function ContentProtectionBody({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element {
  const { data, isLoading, error, refetch } = useAcademyContentProtection(
    academyId,
    { enabled: true }
  );

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isOwnerOnlyRefusal(error)) return <ProtectionOwnerOnlyNotice />;
  if (error || !data) {
    return <ErrorState kind={error?.kind} onRetry={() => refetch()} />;
  }
  return <ContentProtectionForm academyId={academyId} data={data} />;
}

function ContentProtectionForm({
  academyId,
  data,
}: {
  readonly academyId: string;
  readonly data: AcademyContentProtection;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const update = useUpdateAcademyContentProtection(academyId);
  const [pending, setPending] = useState<ContentProtectionFormData | null>(
    null
  );

  const form = useForm<ContentProtectionFormData>({
    resolver: zodResolver(contentProtectionSchema),
    values: {
      watermark: data.watermark,
      watermarkText: data.watermarkText ?? '',
    },
  });
  const watermarkOn = form.watch('watermark');

  const save = (values: ContentProtectionFormData): void => {
    const text = values.watermarkText.trim();
    update.mutate(
      {
        contentProtection: {
          watermark: values.watermark,
          // Omitted clears it: the overlay goes back to each learner's own id.
          ...(text ? { watermarkText: text } : {}),
          // Sent back exactly as stored — see the file comment.
          disableDownload: data.disableDownload,
          disablePip: data.disablePip,
          disableContextMenu: data.disableContextMenu,
        },
      },
      {
        onSuccess: () => notifySuccess('academy:protection.content.saved'),
        onError: () => notifyError('academy:protection.content.saveFailed'),
      }
    );
  };

  const onSubmit = (values: ContentProtectionFormData): void => {
    if (values.watermark !== data.watermark) {
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
        'academy:protection.content.saveFailed'
      )
    : null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        aria-busy={update.isPending}
      >
        <FormField
          control={form.control}
          name="watermark"
          render={({ field }) => (
            <FormItem className="flex items-start justify-between gap-4 space-y-0">
              <div className="space-y-0.5">
                <FormLabel>
                  {t('academy:protection.content.watermark.label')}
                </FormLabel>
                <FormDescription>
                  {t('academy:protection.content.watermark.description')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={update.isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="watermarkText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('academy:protection.content.watermarkText.label')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={WATERMARK_TEXT_MAX_LENGTH}
                  disabled={!watermarkOn || update.isPending}
                  placeholder={t(
                    'academy:protection.content.watermarkText.placeholder'
                  )}
                  className="sm:max-w-md"
                />
              </FormControl>
              <FormDescription>
                {t('academy:protection.content.watermarkText.description', {
                  count: WATERMARK_TEXT_MAX_LENGTH,
                })}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <section
          className="space-y-2"
          aria-labelledby="content-protection-deterrents"
        >
          <h3
            id="content-protection-deterrents"
            className="text-sm font-medium"
          >
            {t('academy:protection.content.deterrents.title')}
          </h3>
          <ul className="space-y-2">
            {DETERRENTS.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium">
                    {t(`academy:protection.content.deterrents.${key}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      `academy:protection.content.deterrents.${key}.description`
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t('academy:protection.content.deterrents.alwaysOn')}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {t('academy:protection.content.deterrents.note')}
          </p>
        </section>

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
            {t('academy:protection.content.save')}
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
              {pending?.watermark
                ? t('academy:protection.content.confirmOn.title')
                : t('academy:protection.content.confirmOff.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.watermark
                ? t('academy:protection.content.confirmOn.description')
                : t('academy:protection.content.confirmOff.description')}
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
              {pending?.watermark
                ? t('academy:protection.content.confirmOn.action')
                : t('academy:protection.content.confirmOff.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
