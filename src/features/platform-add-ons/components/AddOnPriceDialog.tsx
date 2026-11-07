/**
 * Plan management — an add-on's price (`PATCH platform-add-ons/:key/pricing`).
 *
 * EGP ONLY (owner decision): the currency is shown, never chosen; the
 * server refuses any other with a `currency` violation, shown on the
 * currency line. The billing cycle stays as stored and is shown read-only;
 * an add-on priced for the first time is billed monthly (the server's default).
 *
 * NEW PURCHASES ONLY. A new price applies when an organization adds the
 * add-on from now on; organizations that already have it (the row's
 * install count) are not charged again — the dialog says so with the
 * number.
 *
 * Same contract as the Arabic-name dialog: a whole number from 1 to
 * 1,000,000 (digits typed in Arabic count), checked before sending; the
 * save is version-guarded and a stale version says so instead of
 * overwriting someone else's edit; a refusal shows once, in the dialog,
 * which stays open with what was typed; leaving with changes asks first.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { SaveFailedAlert, hasViolationOn, useFailureReason } from '@forms';
import { useDirtyGuard } from '@features/unsaved-changes';
import { useBidiIsolation } from '@hooks';
import { formatNumber, normalizeDigits } from '@utils';
import type { LanguageCode } from '@types';
import { useUpdateAddOnPricing } from '../hooks/usePlatformAddOns';
import type { PlatformAddOnRow } from '../types';

/** Server `UpdateAddOnPricingDto` bounds (whole EGP). */
export const ADD_ON_PRICE_MIN = 1;
export const ADD_ON_PRICE_MAX = 1_000_000;
const CURRENCY = 'EGP';

const K = 'platformAddOns:price';
const FIELDS = { amount: 'amount', currency: 'currency' } as const;

/** The typed price as a whole number, or `null` (digits typed in Arabic count). */
function wholeAmount(text: string): number | null {
  const value = normalizeDigits(text).trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

export interface AddOnPriceDialogProps {
  /** The add-on being priced; `null` closes the dialog. */
  readonly addOn: PlatformAddOnRow | null;
  readonly onClose: () => void;
}

export function AddOnPriceDialog({
  addOn,
  onClose,
}: AddOnPriceDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { isolate } = useBidiIsolation();
  const failureReason = useFailureReason();
  const update = useUpdateAddOnPricing();
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const savedAmount =
    addOn?.pricing?.amount !== undefined ? String(addOn.pricing.amount) : '';

  // Opening an add-on starts from its saved price and a clean slate.
  const resetUpdate = update.reset;
  useEffect(() => {
    if (!addOn) return;
    setAmount(savedAmount);
    setSubmitted(false);
    resetUpdate();
    // Only when a different add-on is opened, never on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOn]);

  const isDirty = addOn !== null && amount.trim() !== savedAmount;
  const guard = useDirtyGuard(isDirty);
  const requestClose = () => {
    if (update.isPending) return;
    void guard.requestClose(onClose);
  };

  const n = (value: number) => formatNumber(value, language);
  const parsed = wholeAmount(amount);
  const amountProblem =
    normalizeDigits(amount).trim() === ''
      ? t('validation:required', { field: t(`${K}.amount`) })
      : parsed === null ||
          parsed < ADD_ON_PRICE_MIN ||
          parsed > ADD_ON_PRICE_MAX
        ? t('validation:integerRange', {
            field: t(`${K}.amount`),
            min: n(ADD_ON_PRICE_MIN),
            max: n(ADD_ON_PRICE_MAX),
          })
        : null;

  const serverError = update.error ?? null;
  /** The server's message for one field, from its own violation only. */
  const reasonFor = (field: string): string | null => {
    const own = serverError?.violations?.filter(
      (violation) => violation.field === field
    );
    if (!serverError || !own?.length) return null;
    return failureReason(
      Object.assign(
        Object.create(Object.getPrototypeOf(serverError) as object) as object,
        serverError,
        { violations: own }
      ) as typeof serverError
    );
  };
  const amountError = (submitted ? amountProblem : null) ?? reasonFor('amount');
  const currencyError = reasonFor('currency');
  const isStale = serverError?.kind === 'conflict';
  const showFailure =
    serverError !== null &&
    !isStale &&
    serverError.kind !== 'cancelled' &&
    !hasViolationOn(serverError, FIELDS);

  const handleSave = async () => {
    if (!addOn || update.isPending) return;
    setSubmitted(true);
    if (amountProblem || parsed === null) return;
    try {
      await update.mutateAsync({
        key: addOn.key,
        input: {
          amount: parsed,
          currency: CURRENCY,
          expectedVersion: addOn.version,
        },
      });
    } catch {
      // Shown in the dialog, once; what was typed stays.
      return;
    }
    onClose();
  };

  const installCount = addOn?.installCount ?? 0;
  const cycle = addOn?.pricing?.billingCycle;

  return (
    <Dialog
      open={addOn !== null}
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <DialogContent className="max-w-lg" data-testid="addon-price-dialog">
        <DialogHeader>
          <DialogTitle>
            {t(`${K}.title`, { name: isolate(addOn?.name ?? '') })}
          </DialogTitle>
          <DialogDescription>{t(`${K}.description`)}</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="addon-price-amount">{t(`${K}.amount`)}</Label>
            <Input
              id="addon-price-amount"
              data-testid="addon-price-amount"
              inputMode="numeric"
              dir="ltr"
              data-ltr-content
              autoComplete="off"
              value={amount}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={[
                'addon-price-amount-help',
                amountError ? 'addon-price-amount-error' : undefined,
              ]
                .filter(Boolean)
                .join(' ')}
              onChange={(event) => {
                setAmount(event.target.value);
                if (update.error) update.reset();
              }}
            />
            <p
              id="addon-price-amount-help"
              className="text-xs text-muted-foreground"
            >
              {t(`${K}.amountHelp`)}
            </p>
            {amountError ? (
              <p
                id="addon-price-amount-error"
                role="alert"
                data-testid="addon-price-amount-error"
                className="text-sm text-destructive"
              >
                {amountError}
              </p>
            ) : null}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-medium">{t(`${K}.currency`)}</dt>
              <dd
                className="text-sm text-muted-foreground"
                data-testid="addon-price-currency"
              >
                {t(`${K}.currencyValue`)}
              </dd>
              {currencyError ? (
                <dd
                  role="alert"
                  data-testid="addon-price-currency-error"
                  className="text-sm text-destructive"
                >
                  {currencyError}
                </dd>
              ) : null}
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium">{t(`${K}.billingCycle`)}</dt>
              <dd
                className="text-sm text-muted-foreground"
                data-testid="addon-price-cycle"
              >
                {t(`${K}.cycle.${cycle ?? 'monthly'}`)}
              </dd>
              <dd className="text-xs text-muted-foreground">
                {t(
                  cycle
                    ? `${K}.billingCycleHelp`
                    : `${K}.billingCycleHelpFirstPrice`
                )}
              </dd>
            </div>
          </dl>

          <p
            className="rounded-md bg-muted p-3 text-sm"
            data-testid="addon-price-new-purchases"
          >
            {installCount > 0
              ? t(`${K}.newPurchasesOnly`, {
                  count: installCount,
                  countText: n(installCount),
                })
              : t(`${K}.newPurchasesNone`)}
          </p>

          {isStale ? (
            <p
              role="alert"
              data-testid="addon-price-stale"
              className="text-sm text-destructive"
            >
              {t(`${K}.stale`)}
            </p>
          ) : null}
          {showFailure && serverError ? (
            <SaveFailedAlert error={serverError} titleKey={`${K}.failed`} />
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={requestClose}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="addon-price-save"
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {update.isPending ? t(`${K}.saving`) : t(`${K}.save`)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
