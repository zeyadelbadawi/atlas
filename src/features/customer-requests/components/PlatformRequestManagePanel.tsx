/**
 * The Platform Owner's controls for one request: who owns it, and where
 * it goes next.
 *
 * The status select offers ONLY the server's `allowedStatuses` (the team's
 * transition table, which never includes `cancelled` — that is the
 * customer's decision — and offers nothing out of a declined request), so
 * an impossible move is never offered rather than refused. A move can
 * carry a customer-visible note; declining asks for one explicitly,
 * because "declined" without a reason is a dead end for the customer.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@app/providers';
import {
  CR_NS,
  CUSTOMER_REQUEST_MESSAGE_MAX,
} from '../constants/customer-request.constants';
import { UNASSIGNED_FILTER, useUpdatePlatformCustomerRequest } from '../hooks';
import {
  customerRequestErrorKey,
  customerRequestStatusLabelKey,
} from '../utils/customer-request.utils';
import type {
  CustomerRequestAssigneeOption,
  CustomerRequestStatus,
  PlatformCustomerRequestDetail,
} from '../types/customer-request.types';

export interface PlatformRequestManagePanelProps {
  readonly request: PlatformCustomerRequestDetail;
  readonly assignees: readonly CustomerRequestAssigneeOption[];
}

export function PlatformRequestManagePanel({
  request,
  assignees,
}: PlatformRequestManagePanelProps): JSX.Element {
  const { t } = useTranslation();
  const { notify, notifySuccess } = useToast();
  const update = useUpdatePlatformCustomerRequest();
  const ids = useId();
  const [nextStatus, setNextStatus] = useState<CustomerRequestStatus | ''>('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState<'assignee' | 'status' | null>(null);

  // The current assignee is always listed, even if they are no longer a
  // Platform Owner (otherwise the select would show nothing).
  const options = request.assignee
    ? [
        request.assignee,
        ...assignees.filter((owner) => owner.id !== request.assignee?.id),
      ]
    : assignees;

  const fail = (error: unknown) => {
    const reasonKey = customerRequestErrorKey(error);
    notify({
      intent: 'error',
      titleKey: `${CR_NS}:platform.detail.updateFailed`,
      ...(reasonKey ? { descriptionKey: reasonKey } : {}),
    });
  };

  const changeAssignee = (value: string) => {
    if (update.isPending) return;
    const assigneeUserId = value === UNASSIGNED_FILTER ? null : value;
    if (assigneeUserId === (request.assignee?.id ?? null)) return;
    setPending('assignee');
    update.mutate(
      { requestId: request.id, payload: { assigneeUserId } },
      {
        onSuccess: () =>
          notifySuccess(`${CR_NS}:platform.detail.assigneeUpdated`),
        onError: fail,
        onSettled: () => setPending(null),
      }
    );
  };

  const changeStatus = () => {
    if (!nextStatus || update.isPending) return;
    const trimmed = note.trim();
    setPending('status');
    update.mutate(
      {
        requestId: request.id,
        payload: { status: nextStatus, ...(trimmed ? { note: trimmed } : {}) },
      },
      {
        onSuccess: () => {
          setNextStatus('');
          setNote('');
          notifySuccess(`${CR_NS}:platform.detail.statusUpdated`);
        },
        onError: fail,
        onSettled: () => setPending(null),
      }
    );
  };

  const isDeclining = nextStatus === 'rejected';
  const noteHintId = `${ids}-note-hint`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor={`${ids}-assignee`}>
          {t(`${CR_NS}:platform.detail.assignee`)}
        </Label>
        <div className="flex items-center gap-2">
          <Select
            value={request.assignee?.id ?? UNASSIGNED_FILTER}
            onValueChange={changeAssignee}
            disabled={update.isPending}
          >
            <SelectTrigger
              id={`${ids}-assignee`}
              className="w-full"
              aria-label={t(`${CR_NS}:platform.detail.assignee`)}
              data-testid="customer-request-assignee"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_FILTER}>
                {t(`${CR_NS}:platform.unassigned`)}
              </SelectItem>
              {options.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pending === 'assignee' ? (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        {request.allowedStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(`${CR_NS}:platform.detail.noTransitions`)}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${ids}-status`}>
                {t(`${CR_NS}:platform.detail.status`)}
              </Label>
              <Select
                value={nextStatus}
                onValueChange={(value) =>
                  setNextStatus(value as CustomerRequestStatus)
                }
                disabled={update.isPending}
              >
                <SelectTrigger
                  id={`${ids}-status`}
                  className="w-full"
                  aria-label={t(`${CR_NS}:platform.detail.status`)}
                  data-testid="customer-request-next-status"
                >
                  <SelectValue
                    placeholder={t(
                      `${CR_NS}:platform.detail.statusPlaceholder`
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {request.allowedStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(
                        status === 'waiting_for_customer'
                          ? `${CR_NS}:teamStatus.waiting_for_customer`
                          : customerRequestStatusLabelKey(status)
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {nextStatus ? (
              <div className="space-y-2">
                <Label htmlFor={`${ids}-note`}>
                  {t(`${CR_NS}:platform.detail.note`)}
                </Label>
                {isDeclining ? (
                  <p
                    id={noteHintId}
                    className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-surface p-3 text-sm text-foreground"
                  >
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-warning"
                      aria-hidden
                    />
                    {t(`${CR_NS}:platform.detail.declineHint`)}
                  </p>
                ) : null}
                <Textarea
                  id={`${ids}-note`}
                  data-testid="customer-request-status-note"
                  rows={3}
                  dir="auto"
                  value={note}
                  maxLength={CUSTOMER_REQUEST_MESSAGE_MAX}
                  placeholder={t(`${CR_NS}:platform.detail.notePlaceholder`)}
                  aria-describedby={isDeclining ? noteHintId : undefined}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full"
              data-testid="customer-request-update-status"
              disabled={!nextStatus || update.isPending}
              onClick={changeStatus}
            >
              {pending === 'status' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t(`${CR_NS}:platform.detail.updateStatus`)}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
