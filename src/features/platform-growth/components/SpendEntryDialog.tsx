/**
 * G1 — add or edit one marketing spend entry: month, channel (any but
 * "unknown"), the amount in EGP with up to two decimals (sent as integer
 * piastres) and what it was for. Errors sit next to their field; the
 * dialog cannot close mid-save.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SPEND_CHANNELS } from '@utils/acquisition-channel.utils';
import type { SpendChannel, SpendEntry, SpendWritePayload } from '../types';
import {
  K,
  SPEND_DESCRIPTION_MAX,
  cairoMonth,
  isMonth,
  minorUnitsToInput,
  parseAmountToMinorUnits,
} from '../utils/growth.utils';
import { Field, useChannelLabel } from './parts';

interface Draft {
  month: string;
  channel: SpendChannel | '';
  amount: string;
  description: string;
}

function draftOf(entry: SpendEntry | null): Draft {
  return {
    month: entry?.month ?? cairoMonth(),
    channel: entry?.channel ?? '',
    amount: entry ? minorUnitsToInput(entry.amountMinorUnits) : '',
    description: entry?.description ?? '',
  };
}

export function validateSpendDraft(
  draft: Draft
): Partial<Record<keyof Draft, string>> {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!isMonth(draft.month)) errors.month = 'spend.dialog.errors.month';
  if (!draft.channel) errors.channel = 'spend.dialog.errors.channel';
  if (parseAmountToMinorUnits(draft.amount) === null)
    errors.amount = 'spend.dialog.errors.amount';
  if (draft.description.trim().length > SPEND_DESCRIPTION_MAX)
    errors.description = 'spend.dialog.errors.description';
  return errors;
}

export function SpendEntryDialog({
  open,
  onOpenChange,
  entry,
  pending,
  onSubmit,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** null = add. */
  readonly entry: SpendEntry | null;
  readonly pending: boolean;
  readonly onSubmit: (payload: SpendWritePayload) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const channelLabel = useChannelLabel();
  const [draft, setDraft] = useState<Draft>(() => draftOf(entry));
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(draftOf(entry));
      setSubmitted(false);
    }
  }, [open, entry]);

  const errors = validateSpendDraft(draft);
  const shown = submitted ? errors : {};
  const set = <F extends keyof Draft>(field: F, value: Draft[F]) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const message = (key?: string) =>
    key ? t(`${K}${key}`, { max: SPEND_DESCRIPTION_MAX }) : undefined;

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !draft.channel) return;
    const description = draft.description.trim();
    onSubmit({
      month: draft.month,
      channel: draft.channel,
      amountMinorUnits: parseAmountToMinorUnits(draft.amount) as number,
      description: description || null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(`${K}spend.dialog.${entry ? 'editTitle' : 'addTitle'}`)}
          </DialogTitle>
          <DialogDescription>
            {t(`${K}spend.dialog.description`)}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="spend-month"
              label={t(`${K}spend.dialog.month`)}
              error={message(shown.month)}
            >
              <Input
                type="month"
                inputMode="numeric"
                placeholder="YYYY-MM"
                className="h-11"
                value={draft.month}
                onChange={(event) => set('month', event.target.value)}
              />
            </Field>
            <div className="space-y-1.5">
              <label
                htmlFor="spend-channel"
                className="text-sm font-medium leading-none"
              >
                {t(`${K}spend.dialog.channel`)}
              </label>
              <Select
                value={draft.channel}
                onValueChange={(value) => set('channel', value as SpendChannel)}
              >
                <SelectTrigger
                  id="spend-channel"
                  className="h-11"
                  aria-label={t(`${K}spend.dialog.channel`)}
                  aria-invalid={shown.channel ? true : undefined}
                  aria-describedby={
                    shown.channel ? 'spend-channel-error' : undefined
                  }
                >
                  <SelectValue
                    placeholder={t(`${K}spend.dialog.channelPlaceholder`)}
                  />
                </SelectTrigger>
                <SelectContent>
                  {SPEND_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channelLabel(channel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {shown.channel ? (
                <p
                  id="spend-channel-error"
                  className="text-xs font-medium text-destructive"
                >
                  {message(shown.channel)}
                </p>
              ) : null}
            </div>
          </div>
          <Field
            id="spend-amount"
            label={t(`${K}spend.dialog.amount`)}
            hint={t(`${K}spend.dialog.amountHint`)}
            error={message(shown.amount)}
          >
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              className="h-11"
              value={draft.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          </Field>
          <Field
            id="spend-description"
            label={t(`${K}spend.dialog.descriptionLabel`)}
            hint={t(`${K}spend.dialog.descriptionHint`)}
            optional
            error={message(shown.description)}
          >
            <Textarea
              rows={2}
              maxLength={SPEND_DESCRIPTION_MAX}
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
              dir="auto"
            />
          </Field>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {t(`${K}common.cancel`)}
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : null}
              {t(`${K}spend.dialog.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
