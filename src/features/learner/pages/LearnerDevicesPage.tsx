/**
 * `/my/devices` — the devices this learner may learn on, and the learning
 * sessions currently using them (§E.1, §E.4, AD-10, D4).
 *
 * THE PAGE A DEVICE-LIMIT REFUSAL SENDS PEOPLE TO, which is why it has to
 * work on the phone they were refused on: removing a device is the action
 * that unblocks them, and it lives here rather than in a support
 * conversation.
 *
 * "X OF Y DEVICES" IS THE HEADLINE, and it is typeset as one (pre-Phase-3
 * baseline: it used to be a 12 px caption beside a section heading). A
 * learner who has just been told they are at their limit needs the limit
 * next to the number, and the policy that set it — an academy that raised
 * the cap to three should not have its learners reading the platform
 * default of two anywhere.
 *
 * DEVICES ARE SERVER-ISSUED, NOT FINGERPRINTED (§G). This list is what
 * Atlas issued through the `atlas_device` cookie, so removing a row
 * revokes a credential rather than forgetting a guess — which is exactly
 * why removal is worth confirming: the device really does have to
 * re-register, under the cap, next time it is used.
 *
 * REMOVING THE CURRENT DEVICE IS ALLOWED HERE, with a warning and the
 * destructive style, and refused inside the player. Here it is a
 * deliberate act on a page about devices; there it would be a trap on the
 * screen that just asked the learner to free a slot.
 *
 * LEARNING SESSIONS ARE NOT SIGN-INS. The account's sign-in sessions live
 * on the Security page; what this page lists is which device holds the
 * single learning lease right now. The copy says "learning session"
 * throughout so the two are never confused.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MonitorSmartphone, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { readErrorKind } from '../utils/read-error-kind';
import { formatCountryName } from '@utils';
import type { LanguageCode } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerDevices, useRemoveLearnerDevice } from '../hooks';

export default function LearnerDevicesPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const fmt = useDateFormatter();
  const { data, isLoading, error, refetch } = useLearnerDevices();
  const removeDevice = useRemoveLearnerDevice();

  const [pendingRemoval, setPendingRemoval] = useState<{
    readonly id: string;
    readonly label: string;
    readonly current: boolean;
  } | null>(null);

  const closeRemoval = () => {
    setPendingRemoval(null);
    removeDevice.reset();
  };

  const header = (
    <LearnerPageHeader
      section="devices"
      titleKey="learning:learnerDashboard.devices.title"
      descriptionKey="learning:learnerDashboard.devices.subtitle"
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState
          kind={readErrorKind(error)}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const limitReached = !!data && data.devices.length >= data.maxDevices;

  return (
    <>
      {header}

      {isLoading ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <span className="sr-only">
            {t('learning:learnerDashboard.devices.loading')}
          </span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data ? (
        <LearnerSectionPlaceholder
          icon={MonitorSmartphone}
          titleKey="learning:learnerDashboard.devices.empty.title"
          descriptionKey="learning:learnerDashboard.devices.empty.description"
        />
      ) : (
        <div className="space-y-6">
          {/* The headline: the number, its limit, and who set the limit. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-display text-lg font-semibold tabular-nums text-foreground">
              {t('learning:learnerDashboard.devices.usage', {
                used: data.devices.length,
                // `count` drives i18next's plural selection (Arabic has six
                // forms); `used` is what the sentence interpolates.
                count: data.devices.length,
                limit: data.maxDevices,
              })}
            </p>
            {limitReached ? (
              <Badge variant="secondary">
                {t('learning:learnerDashboard.devices.limitReached')}
              </Badge>
            ) : null}
            <p className="w-full text-sm text-muted-foreground">
              {t(
                `learning:learnerDashboard.devices.policySource.${data.policySource}`
              )}
            </p>
          </div>

          <section aria-labelledby="devices-heading" className="space-y-3">
            <h2
              id="devices-heading"
              className="font-display text-base font-semibold text-foreground"
            >
              {t('learning:learnerDashboard.devices.registeredTitle')}
            </h2>

            {data.devices.length === 0 ? (
              <LearnerSectionPlaceholder
                icon={MonitorSmartphone}
                titleKey="learning:learnerDashboard.devices.empty.title"
                descriptionKey="learning:learnerDashboard.devices.empty.description"
              />
            ) : (
              <ul className="space-y-2" role="list">
                {data.devices.map((device) => (
                  <li
                    key={device.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {device.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('learning:learnerDashboard.devices.lastSeen', {
                          when: fmt.dateTime(device.lastSeenAt),
                        })}
                      </p>
                    </div>

                    {device.current ? (
                      <Badge variant="secondary">
                        {t('learning:learnerDashboard.devices.thisDevice')}
                      </Badge>
                    ) : null}

                    {/* 44 px tall on touch widths (accessibility.md ›
                        Mobility), the compact 36 px only where a pointer
                        is the norm. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 sm:h-9"
                      onClick={() =>
                        setPendingRemoval({
                          id: device.id,
                          label: device.label,
                          current: device.current,
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t('learning:learnerDashboard.devices.remove')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="sessions-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="sessions-heading"
                className="font-display text-base font-semibold text-foreground"
              >
                {t('learning:learnerDashboard.devices.sessionsTitle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('learning:learnerDashboard.devices.sessionLimit', {
                  limit: data.maxConcurrentSessions,
                })}
              </p>
            </div>

            {data.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('learning:learnerDashboard.devices.noSessions')}
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {data.sessions.map((session) => {
                  const country = formatCountryName(
                    session.locationCountry ?? undefined,
                    language
                  );
                  return (
                    <li
                      key={session.sessionId}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {session.deviceLabel ??
                            t('learning:player.takeover.unknownDevice')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.lastUsedAt
                            ? t('learning:learnerDashboard.devices.lastUsed', {
                                when: fmt.dateTime(session.lastUsedAt),
                              })
                            : t('learning:learnerDashboard.devices.startedAt', {
                                when: fmt.dateTime(session.createdAt),
                              })}
                          {country ? ` · ${country}` : ''}
                        </p>
                      </div>

                      {session.current ? (
                        <Badge variant="secondary">
                          {t('learning:learnerDashboard.devices.thisSession')}
                        </Badge>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <AlertDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => {
          if (!open) closeRemoval();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('learning:learnerDashboard.devices.confirmRemove.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval?.current
                ? t(
                    'learning:learnerDashboard.devices.confirmRemove.currentDescription',
                    { device: pendingRemoval?.label ?? '' }
                  )
                : t(
                    'learning:learnerDashboard.devices.confirmRemove.description',
                    { device: pendingRemoval?.label ?? '' }
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* A failed removal is said here, where the learner is looking,
              and the dialog stays open so they can try again or give up —
              never a silent close that leaves the row in place. */}
          {removeDevice.error ? (
            <p role="alert" className="text-sm text-destructive">
              {t('learning:learnerDashboard.devices.removeFailed')}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeDevice.isPending}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            {/* Ending the session you are in is the unexpected loss
                feedback.md warns about, so that case takes the destructive
                style; removing another device keeps the default. */}
            <AlertDialogAction
              className={buttonVariants({
                variant: pendingRemoval?.current ? 'destructive' : 'default',
              })}
              onClick={(event) => {
                event.preventDefault();
                if (!pendingRemoval) return;
                removeDevice.mutate(pendingRemoval.id, {
                  onSuccess: () => setPendingRemoval(null),
                });
              }}
              disabled={removeDevice.isPending}
            >
              {removeDevice.isPending ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : null}
              {t('learning:learnerDashboard.devices.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
