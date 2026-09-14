/**
 * Connect an academy's Zoom account.
 *
 * WHY THIS IS A CREDENTIALS FORM AND NOT A "SIGN IN WITH ZOOM" BUTTON.
 * Atlas uses Zoom's Server-to-Server OAuth, which is owned by the Zoom
 * ACCOUNT rather than by one person's Zoom login. That matters for a
 * school: a redirect-based user grant would bind every meeting to the
 * instructor who happened to click the button, and would break the day
 * they leave. There is no redirect in this model, so there is no callback
 * button to show — the academy pastes the credentials from the app they
 * created in their own Zoom account.
 *
 * THE THREE GROUPS ARE SEPARATE BECAUSE THEY UNLOCK DIFFERENT THINGS, and
 * saying so is the difference between a form somebody can complete and
 * six unexplained boxes:
 *
 *   API credentials  -> required. Without them nothing can be created.
 *   Meeting SDK      -> optional. Without it sessions schedule but cannot
 *                       be joined inside Atlas.
 *   Webhook token    -> optional. Without it attendance and recordings
 *                       never arrive.
 *
 * NOTHING IS EVER READ BACK. There is no endpoint that returns these, so
 * the form is always blank on load even when a connection exists — a
 * secret that can be re-displayed is a secret that ends up in a
 * screenshot. The screen shows connection HEALTH instead.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useServerValidation } from '@forms';
import { zoomConnectionSchema, type ZoomConnectionFormData } from '../schemas/liveSession.schemas';
import type { ApiError } from '@api';

export interface ZoomConnectionFormProps {
  readonly isPending: boolean;
  readonly onSubmit: (data: ZoomConnectionFormData) => void | Promise<void>;
  readonly error?: ApiError | null;
  /** Shown on the submit button when a connection already exists. */
  readonly isReconnect: boolean;
}

export function ZoomConnectionForm({
  isPending,
  onSubmit,
  error,
  isReconnect,
}: ZoomConnectionFormProps): JSX.Element {
  const { t } = useTranslation();

  const form = useForm<ZoomConnectionFormData>({
    resolver: zodResolver(zoomConnectionSchema),
    defaultValues: {
      accountId: '',
      clientId: '',
      clientSecret: '',
      sdkKey: '',
      sdkSecret: '',
      webhookSecretToken: '',
    },
  });

  useServerValidation(form, error ?? null);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <section className="space-y-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t('liveSessions:connectForm.apiGroup')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('liveSessions:connectForm.apiGroupHint')}
            </p>
          </div>

          {(['accountId', 'clientId'] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`liveSessions:connectForm.${name}`)}</FormLabel>
                  <FormControl>
                    {/* Not a password field: these two are identifiers,
                        not secrets, and masking them only makes them
                        harder to paste correctly. */}
                    <Input {...field} autoComplete="off" spellCheck={false} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('liveSessions:connectForm.clientSecret')}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t('liveSessions:connectForm.sdkGroup')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('liveSessions:connectForm.sdkGroupHint')}
            </p>
          </div>

          <FormField
            control={form.control}
            name="sdkKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('liveSessions:connectForm.sdkKey')}</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" spellCheck={false} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sdkSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('liveSessions:connectForm.sdkSecret')}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t('liveSessions:connectForm.webhookGroup')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('liveSessions:connectForm.webhookGroupHint')}
            </p>
          </div>

          <FormField
            control={form.control}
            name="webhookSecretToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('liveSessions:connectForm.webhookSecretToken')}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormDescription>
                  {t('liveSessions:connectForm.webhookUrlHint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {t('liveSessions:connectForm.encryptionNote')}
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
          ) : null}
          {t(
            isReconnect
              ? 'liveSessions:connectForm.reconnect'
              : 'liveSessions:connectForm.connect',
          )}
        </Button>
      </form>
    </Form>
  );
}
