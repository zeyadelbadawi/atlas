/**
 * B2 — "Add founding academy": pick an organization, the plan whose annual
 * price is locked, optionally the founding request it came from (and mark
 * that request handled). The server quote shows the seat and the exact
 * price that will be locked before anything is written; the server
 * decides both again on create.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SearchInput } from '@components/data-display';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber, toErrorsNamespaceKey } from '@utils';
import {
  useCreateFounding,
  usePlatformFoundingCandidates,
  usePlatformFoundingPlans,
  usePlatformFoundingQuote,
} from '../hooks/usePlatformFounding';
import { usePlatformContactSubmissions } from '../hooks/usePlatformContactSubmissions';
import type { FoundingMembershipDetail } from '../services/PlatformFoundingService';
import {
  FOUNDING_K,
  foundingMoney,
  foundingPlanName,
} from '../utils/founding.utils';

const K = FOUNDING_K;
const NO_REQUEST = '__none__';

export interface AddFoundingAcademyDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: (membership: FoundingMembershipDetail) => void;
}

/** 24 calendar months later, for display only (the server stores the real end). */
function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function AddFoundingAcademyDialog({
  open,
  onOpenChange,
  onCreated,
}: AddFoundingAcademyDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const id = useId();

  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [requestId, setRequestId] = useState(NO_REQUEST);
  const [markHandled, setMarkHandled] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) return;
    setSearch('');
    setOrganizationId('');
    setPlanKey('');
    setRequestId(NO_REQUEST);
    setMarkHandled(true);
    setNotes('');
  }, [open]);

  const candidates = usePlatformFoundingCandidates(search, open);
  const plans = usePlatformFoundingPlans(open);
  const requestsQuery = useMemo(
    () => ({
      pagination: { page: 1, pageSize: 50 },
      sort: { field: 'createdAt' as const, direction: 'desc' as const },
      filters: { topic: 'founding' as const },
    }),
    []
  );
  // Only while the dialog is open: it stays mounted with the page.
  const requests = usePlatformContactSubmissions(requestsQuery, open);
  const openRequests = (requests.data?.items ?? []).filter(
    (item) => item.status !== 'archived'
  );
  const quote = usePlatformFoundingQuote(organizationId, planKey);
  const create = useCreateFounding();
  // Opened only once this dialog has fully closed: opening the detail
  // sheet while the dialog is still closing leaves the page inert (two
  // modal layers racing over the body's pointer-events).
  const created = useRef<FoundingMembershipDetail | null>(null);

  useEffect(() => {
    if (!planKey && plans.data && plans.data.length > 0)
      setPlanKey(plans.data[0].key);
  }, [planKey, plans.data]);

  // Start from the plan the academy already pays for, when it is eligible.
  const selectOrganization = (id: string) => {
    setOrganizationId(id);
    const current = candidates.data?.find((org) => org.id === id)?.subscription
      ?.planKey;
    if (current && plans.data?.some((plan) => plan.key === current)) {
      setPlanKey(current);
    }
  };

  const lang = i18n.language;
  const blocked =
    quote.data?.alreadyMember || quote.data?.nextSeatNumber === null;
  const canSubmit = Boolean(
    organizationId && planKey && quote.data && !blocked && !create.isPending
  );

  const submit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        organizationId,
        planKey,
        ...(requestId !== NO_REQUEST
          ? {
              sourceContactSubmissionId: requestId,
              markContactHandled: markHandled,
            }
          : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      {
        onSuccess: (membership) => {
          notifySuccess(`${K}.toasts.created`, undefined, {
            name: membership.organization.name,
          });
          created.current = membership;
          onOpenChange(false);
        },
        onError: (error) =>
          notifyError(
            `${K}.toasts.failed`,
            toErrorsNamespaceKey(error.messageKey)
          ),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !create.isPending && onOpenChange(next)}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          const membership = created.current;
          if (!membership) return;
          created.current = null;
          event.preventDefault();
          onCreated(membership);
        }}
      >
        <DialogHeader className="text-start">
          <DialogTitle>{t(`${K}.add.title`)}</DialogTitle>
          <DialogDescription>{t(`${K}.add.description`)}</DialogDescription>
        </DialogHeader>

        <form
          id={`${id}-form`}
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">
              {t(`${K}.add.organization`)}
            </legend>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              labelKey={`${K}.add.searchOrganization`}
            />
            {candidates.data && candidates.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(`${K}.add.noOrganizations`)}
              </p>
            ) : (
              <RadioGroup
                value={organizationId}
                onValueChange={selectOrganization}
                aria-label={t(`${K}.add.organization`)}
                className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2"
              >
                {(candidates.data ?? []).map((org) => (
                  <Label
                    key={org.id}
                    htmlFor={`${id}-org-${org.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 font-normal hover:bg-muted/50"
                  >
                    <RadioGroupItem
                      id={`${id}-org-${org.id}`}
                      value={org.id}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span
                        className="block truncate font-medium text-foreground"
                        dir="auto"
                      >
                        {org.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        <span dir="auto">{org.ownerName}</span> ·{' '}
                        <span dir="ltr" data-ltr-content>
                          {org.ownerEmail}
                        </span>
                        {org.subscription
                          ? ` · ${org.subscription.planName}`
                          : ''}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${id}-plan`}>{t(`${K}.fields.plan`)}</Label>
              <Select value={planKey} onValueChange={setPlanKey}>
                <SelectTrigger id={`${id}-plan`}>
                  <SelectValue placeholder={t(`${K}.add.choosePlan`)} />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? []).map((plan) => (
                    <SelectItem key={plan.key} value={plan.key}>
                      {foundingPlanName(plan, lang)} ·{' '}
                      {foundingMoney(plan.annualPrice, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-request`}>{t(`${K}.add.request`)}</Label>
              <Select value={requestId} onValueChange={setRequestId}>
                <SelectTrigger id={`${id}-request`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REQUEST}>
                    {t(`${K}.add.noRequest`)}
                  </SelectItem>
                  {openRequests.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.organizationName || item.name} ·{' '}
                      {fmt.date(item.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requestId !== NO_REQUEST ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${id}-handled`}
                checked={markHandled}
                onCheckedChange={(value) => setMarkHandled(value === true)}
              />
              <Label htmlFor={`${id}-handled`} className="font-normal">
                {t(`${K}.add.markHandled`)}
              </Label>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${id}-notes`}>{t(`${K}.add.notes`)}</Label>
            <Textarea
              id={`${id}-notes`}
              rows={3}
              maxLength={4000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              dir="auto"
            />
          </div>

          <div aria-live="polite">
            {quote.isFetching && !quote.data ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t(`${K}.add.quoting`)}
              </p>
            ) : quote.data ? (
              blocked ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {quote.data.alreadyMember
                      ? t(`${K}.add.alreadyMember`)
                      : t(`${K}.add.seatsFull`)}
                  </AlertDescription>
                </Alert>
              ) : (
                <div
                  className="rounded-lg border border-border bg-muted/40 p-4 text-sm"
                  data-testid="founding-quote"
                >
                  <p className="font-medium text-foreground">
                    {t(`${K}.add.quoteTitle`, {
                      seat: formatNumber(
                        quote.data.nextSeatNumber ?? 0,
                        language
                      ),
                    })}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t(`${K}.add.quoteBody`, {
                      price: foundingMoney(quote.data.lockedPrice, lang),
                      plan: foundingPlanName(quote.data.plan, lang),
                      date: fmt.date(addMonths(new Date(), 24).toISOString()),
                    })}
                  </p>
                </div>
              )
            ) : null}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            {t(`${K}.cancel`)}
          </Button>
          <Button type="submit" form={`${id}-form`} disabled={!canSubmit}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {t(`${K}.add.submit`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
