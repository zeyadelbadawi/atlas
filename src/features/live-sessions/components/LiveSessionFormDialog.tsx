/**
 * Live Session form — create and edit, inside the Course Builder.
 *
 * Follows `LessonFormDialog`'s shape deliberately: same dialog primitives,
 * same react-hook-form + zod resolver, same `useServerValidation` so a 400
 * lands on the field that caused it. A Live Session is another curriculum
 * activity, and it should feel like one rather than like a different
 * product bolted on.
 *
 * RECORDING IS AN EXPLICIT, DEFAULT-OFF CHOICE. The switch starts off, the
 * label says what it does, and the helper text states the two facts a host
 * actually needs: that it consumes one of the plan's recorded sessions,
 * and how many remain. When the allowance is exhausted the control is
 * disabled with an explanation rather than silently failing on save.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useServerValidation } from '@forms';
import {
  liveSessionFormSchema,
  type LiveSessionFormData,
} from '../schemas/liveSession.schemas';
import type { ApiError } from '@api';
import type { RecordingQuotaUsage } from '@types';

export interface LiveSessionFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly defaultValues?: Partial<LiveSessionFormData>;
  readonly isPending: boolean;
  readonly onSubmit: (data: LiveSessionFormData) => void | Promise<void>;
  readonly error?: ApiError | null;
  /** Drives the recording control's availability and its helper text. */
  readonly recordingQuota?: RecordingQuotaUsage;
}

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in LOCAL time, not an ISO UTC string. */
function toLocalInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function LiveSessionFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  isPending,
  onSubmit,
  error,
  recordingQuota,
}: LiveSessionFormDialogProps): JSX.Element {
  const { t } = useTranslation();

  const form = useForm<LiveSessionFormData>({
    resolver: zodResolver(liveSessionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      // OFF unless the host says otherwise — never inherited from Zoom.
      recordingEnabled: false,
      scheduledStartAt: '',
      scheduledEndAt: '',
      ...defaultValues,
    },
  });

  useServerValidation(form, error ?? null);

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      recordingEnabled: defaultValues?.recordingEnabled ?? false,
      scheduledStartAt: toLocalInputValue(defaultValues?.scheduledStartAt),
      scheduledEndAt: toLocalInputValue(defaultValues?.scheduledEndAt),
    });
    // `defaultValues` is a fresh object each render; keying on `open` is
    // what stops the form resetting under the user mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const alreadyRecording = defaultValues?.recordingEnabled === true;
  const exhausted =
    recordingQuota !== undefined &&
    recordingQuota.remaining !== null &&
    recordingQuota.remaining <= 0;
  // An existing recorded session keeps its switch usable so it can be
  // turned OFF; only turning one ON is blocked by an exhausted allowance.
  const recordingDisabled = exhausted && !alreadyRecording;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(
              mode === 'create'
                ? 'liveSessions:form.createTitle'
                : 'liveSessions:form.editTitle',
            )}
          </DialogTitle>
          <DialogDescription>
            {t('liveSessions:form.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('liveSessions:form.title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('liveSessions:form.titlePlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('liveSessions:form.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="scheduledStartAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('liveSessions:form.startsAt')}</FormLabel>
                    <FormControl>
                      {/* `datetime-local` renders in the viewer's own
                          timezone, which is what a scheduling control
                          should do; the value is converted to an absolute
                          instant before it is sent. */}
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledEndAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('liveSessions:form.endsAt')}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="recordingEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start justify-between gap-4 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <FormLabel className="flex items-center gap-2">
                      <Video className="size-4" aria-hidden />
                      {t('liveSessions:form.recordSession')}
                    </FormLabel>
                    <FormDescription>
                      {recordingDisabled
                        ? t('liveSessions:form.recordingQuotaExhausted')
                        : recordingQuota
                          ? recordingQuota.remaining === null
                            ? t('liveSessions:form.recordingUnlimited')
                            : t('liveSessions:form.recordingRemaining', {
                                count: recordingQuota.remaining,
                              })
                          : t('liveSessions:form.recordingHint')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={recordingDisabled}
                      aria-label={t('liveSessions:form.recordSession')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                ) : null}
                {t(
                  mode === 'create'
                    ? 'liveSessions:form.create'
                    : 'common:actions.save',
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
