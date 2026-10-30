/**
 * B2 — one Founding Academy, in a side sheet: every field the Platform
 * Owner may see, the audit timeline, and the actions (notes and concierge
 * hours, a family change re-locked at that plan's annual price today, and
 * revoke, confirmed by the page). Edits send `expectedUpdatedAt`, so a
 * stale edit is refused rather than overwriting someone else's.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Loader2, Lock, Save } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import {
  usePlatformFoundingDetail,
  usePlatformFoundingPlans,
  useUpdateFounding,
} from '../hooks/usePlatformFounding';
import type { FoundingMembershipDetail } from '../services/PlatformFoundingService';
import {
  FOUNDING_K,
  foundingMoney,
  foundingPlanName,
  foundingStatusTone,
  foundingTimelineKey,
} from '../utils/founding.utils';

const K = FOUNDING_K;
const NOTES_MAX = 4000;

export interface FoundingAcademySheetProps {
  readonly membershipId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRequestRevoke: (membership: FoundingMembershipDetail) => void;
}

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </>
  );
}

export function FoundingAcademySheet({
  membershipId,
  open,
  onOpenChange,
  onRequestRevoke,
}: FoundingAcademySheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const detailQuery = usePlatformFoundingDetail(open ? membershipId : null);
  const detail = detailQuery.data;
  const plansQuery = usePlatformFoundingPlans(
    open && detail?.status === 'active'
  );
  const update = useUpdateFounding();
  const formId = useId();

  const [notes, setNotes] = useState('');
  const [hours, setHours] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [confirmPlan, setConfirmPlan] = useState(false);

  useEffect(() => {
    if (!detail) return;
    setNotes(detail.notes ?? '');
    setHours(String(detail.conciergeHoursUsed));
    setPlanKey(detail.plan.key);
  }, [detail]);

  const lang = i18n.language;
  const money = (value: { amount: number; currency: string }) =>
    foundingMoney(value, lang);
  const hoursNumber = Number(hours);
  const hoursValid =
    hours.trim() !== '' &&
    Number.isFinite(hoursNumber) &&
    hoursNumber >= 0 &&
    hoursNumber <= 999;
  const dirty =
    detail !== undefined &&
    (notes.trim() !== (detail.notes ?? '') ||
      (hoursValid &&
        Math.round(hoursNumber * 100) / 100 !== detail.conciergeHoursUsed));
  const targetPlan = plansQuery.data?.find((plan) => plan.key === planKey);

  const save = (
    payload: { notes?: string; conciergeHoursUsed?: number; planKey?: string },
    successKey: string
  ) => {
    if (!detail) return;
    update.mutate(
      {
        id: detail.id,
        payload: { expectedUpdatedAt: detail.updatedAt, ...payload },
      },
      {
        onSuccess: () => notifySuccess(successKey),
        onError: (error) =>
          notifyError(
            error.status === 409 ? `${K}.toasts.stale` : `${K}.toasts.failed`
          ),
      }
    );
  };

  const renderBody = () => {
    if (detailQuery.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={detailQuery.error.kind}
            onRetry={() => void detailQuery.refetch()}
          />
        </div>
      );
    }
    if (!detail) {
      return (
        <div className="space-y-3 p-6" aria-busy="true">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
    const editable = detail.status !== 'revoked';
    return (
      <div className="space-y-6 p-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="min-w-0 break-words text-base font-semibold text-foreground"
              dir="auto"
            >
              {detail.organization.name}
            </p>
            <StatusBadge
              labelKey={`${K}.status.${detail.status}`}
              tone={foundingStatusTone(detail.status)}
            />
            <span className="text-sm text-muted-foreground">
              {t(`${K}.seatLabel`, {
                seat: formatNumber(detail.seatNumber, language),
              })}
            </span>
          </div>
          <dl className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label={t(`${K}.fields.owner`)}>
              <span dir="auto">{detail.owner.name}</span>
            </Row>
            <Row label={t(`${K}.fields.email`)}>
              <a
                href={`mailto:${detail.owner.email}`}
                className="text-primary hover:underline"
                dir="ltr"
                data-ltr-content
              >
                {detail.owner.email}
              </a>
            </Row>
            {detail.owner.phone ? (
              <Row label={t(`${K}.fields.phone`)}>
                <span dir="ltr" data-ltr-content>
                  {detail.owner.phone}
                </span>
              </Row>
            ) : null}
            <Row label={t(`${K}.fields.plan`)}>
              {foundingPlanName(detail.plan, lang)}
            </Row>
            <Row label={t(`${K}.fields.lockedPrice`)}>
              <span dir="ltr" data-ltr-content>
                {money(detail.lockedPrice)}
              </span>{' '}
              <span className="text-muted-foreground">{t(`${K}.perYear`)}</span>
            </Row>
            <Row label={t(`${K}.fields.lockStarts`)}>
              {fmt.date(detail.lockStartsAt)}
            </Row>
            <Row label={t(`${K}.fields.lockEnds`)}>
              {fmt.date(detail.lockEndsAt)}
            </Row>
            <Row label={t(`${K}.fields.subscription`)}>
              {detail.subscription
                ? t(`${K}.subscriptionStatus.${detail.subscription.status}`, {
                    defaultValue: detail.subscription.status,
                  })
                : t(`${K}.noSubscription`)}
            </Row>
            {detail.subscription?.currentPeriodEnd ? (
              <Row label={t(`${K}.fields.periodEnds`)}>
                {fmt.date(detail.subscription.currentPeriodEnd)}
              </Row>
            ) : null}
            {detail.nextRenewal ? (
              <Row label={t(`${K}.fields.nextRenewal`)}>
                <span dir="ltr" data-ltr-content>
                  {money(detail.nextRenewal)}
                </span>{' '}
                <span className="text-muted-foreground">
                  {t(
                    detail.nextRenewal.locked
                      ? `${K}.renewalLocked`
                      : `${K}.renewalCatalog`
                  )}
                </span>
              </Row>
            ) : null}
            <Row label={t(`${K}.fields.concierge`)}>
              {t(`${K}.hoursOf`, {
                used: formatNumber(detail.conciergeHoursUsed, language),
                cap: formatNumber(detail.conciergeHoursCap, language),
              })}
            </Row>
            {detail.sourceContact ? (
              <Row label={t(`${K}.fields.request`)}>
                <span dir="auto">{detail.sourceContact.name}</span>{' '}
                <span className="text-muted-foreground">
                  · {fmt.date(detail.sourceContact.createdAt)}
                </span>
              </Row>
            ) : null}
            {detail.revokedAt ? (
              <Row label={t(`${K}.fields.revoked`)}>
                {fmt.date(detail.revokedAt)}
                {detail.revokedReason ? (
                  <span className="block text-muted-foreground" dir="auto">
                    {detail.revokedReason}
                  </span>
                ) : null}
              </Row>
            ) : null}
          </dl>
        </section>

        <Separator />

        <section className="space-y-4" aria-labelledby={`${formId}-edit`}>
          <h3
            id={`${formId}-edit`}
            className="text-sm font-semibold text-foreground"
          >
            {t(`${K}.edit.title`)}
          </h3>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-hours`}>{t(`${K}.edit.hours`)}</Label>
            <Input
              id={`${formId}-hours`}
              type="number"
              inputMode="decimal"
              min={0}
              max={999}
              step={0.25}
              value={hours}
              disabled={!editable || update.isPending}
              onChange={(event) => setHours(event.target.value)}
              aria-invalid={!hoursValid}
              aria-describedby={`${formId}-hours-hint`}
              className="w-full sm:w-40"
            />
            <p
              id={`${formId}-hours-hint`}
              className="text-xs text-muted-foreground"
            >
              {t(`${K}.edit.hoursHint`, {
                cap: formatNumber(detail.conciergeHoursCap, language),
              })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-notes`}>{t(`${K}.edit.notes`)}</Label>
            <Textarea
              id={`${formId}-notes`}
              rows={4}
              maxLength={NOTES_MAX}
              value={notes}
              disabled={update.isPending}
              onChange={(event) => setNotes(event.target.value)}
              dir="auto"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || !hoursValid || update.isPending}
            onClick={() =>
              save(
                {
                  notes: notes.trim(),
                  ...(editable
                    ? {
                        conciergeHoursUsed: Math.round(hoursNumber * 100) / 100,
                      }
                    : {}),
                },
                `${K}.toasts.saved`
              )
            }
          >
            {update.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {t(`${K}.edit.save`)}
          </Button>
        </section>

        {detail.status === 'active' ? (
          <>
            <Separator />
            <section className="space-y-3" aria-labelledby={`${formId}-plan`}>
              <h3
                id={`${formId}-plan`}
                className="text-sm font-semibold text-foreground"
              >
                {t(`${K}.changePlan.title`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`${K}.changePlan.description`)}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-plan-select`}>
                    {t(`${K}.fields.plan`)}
                  </Label>
                  <Select
                    value={planKey}
                    onValueChange={setPlanKey}
                    disabled={update.isPending}
                  >
                    <SelectTrigger
                      id={`${formId}-plan-select`}
                      className="w-full sm:w-64"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(plansQuery.data ?? []).map((plan) => (
                        <SelectItem key={plan.key} value={plan.key}>
                          {foundingPlanName(plan, lang)} ·{' '}
                          {money(plan.annualPrice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !targetPlan ||
                    planKey === detail.plan.key ||
                    update.isPending
                  }
                  onClick={() => setConfirmPlan(true)}
                >
                  <Lock className="size-4" aria-hidden />
                  {t(`${K}.changePlan.action`)}
                </Button>
              </div>
            </section>
          </>
        ) : null}

        {editable ? (
          <>
            <Separator />
            <section className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t(`${K}.revoke.hint`)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onRequestRevoke(detail)}
              >
                <Ban className="size-4" aria-hidden />
                {t(`${K}.revoke.action`)}
              </Button>
            </section>
          </>
        ) : null}

        <Separator />

        <section className="space-y-3" aria-labelledby={`${formId}-timeline`}>
          <h3
            id={`${formId}-timeline`}
            className="text-sm font-semibold text-foreground"
          >
            {t(`${K}.timeline.title`)}
          </h3>
          {detail.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(`${K}.timeline.empty`)}
            </p>
          ) : (
            <ol className="space-y-3 border-s border-border ps-4">
              {detail.timeline.map((entry) => {
                const key = foundingTimelineKey(entry.action);
                return (
                  <li key={entry.id} className="text-sm">
                    <p className="font-medium text-foreground">
                      {key ? t(key) : entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={entry.occurredAt}>
                        {fmt.dateTime(entry.occurredAt)}
                      </time>
                      {entry.actorName ? ` · ${entry.actorName}` : ''}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <AlertDialog open={confirmPlan} onOpenChange={setConfirmPlan}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(`${K}.changePlan.confirmTitle`)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {targetPlan
                  ? t(`${K}.changePlan.confirmDescription`, {
                      plan: foundingPlanName(targetPlan, lang),
                      price: money(targetPlan.annualPrice),
                      date: fmt.date(detail.lockEndsAt),
                    })
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t(`${K}.cancel`)}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmPlan(false);
                  save({ planKey }, `${K}.toasts.planChanged`);
                }}
              >
                {t(`${K}.changePlan.confirm`)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border p-6 text-start">
          <SheetTitle>{t(`${K}.drawer.title`)}</SheetTitle>
          <SheetDescription>{t(`${K}.drawer.description`)}</SheetDescription>
        </SheetHeader>
        {renderBody()}
      </SheetContent>
    </Sheet>
  );
}
