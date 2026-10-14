/**
 * B0-BIL-06 — the Platform Owner's audited subscription remedies on the
 * organization detail page: Extend, Grant days and Change plan.
 *
 * Every action needs a written reason (10+ characters), which the server
 * stores in the audit log with the change. The server is the authority on
 * who may act and on every rule (which statuses can be extended, archived
 * plans, a scheduled change needing a running paid period); this dialog
 * only checks the shape so the common mistakes are caught before a round
 * trip, and shows the server's own message for everything else.
 *
 * Change plan takes a typed plan key because hidden plans (founding
 * locks) are not in the public catalog; the catalog keys are offered as
 * suggestions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { apiErrorMessage } from '@utils';
import { usePlanCatalog } from '@features/tenant';
import { useSubscriptionAdjustment } from '../hooks';

type Mode = 'extend' | 'grant-days' | 'change-plan';

const REASON_MIN = 10;
const DAYS_MAX = 365;

const TITLE_KEY: Record<Mode, string> = {
  extend: 'platform:organizations.adjust.extendTitle',
  'grant-days': 'platform:organizations.adjust.grantTitle',
  'change-plan': 'platform:organizations.adjust.changePlanTitle',
};

const DESCRIPTION_KEY: Record<Mode, string> = {
  extend: 'platform:organizations.adjust.extendDescription',
  'grant-days': 'platform:organizations.adjust.grantDescription',
  'change-plan': 'platform:organizations.adjust.changePlanDescription',
};

export interface SubscriptionAdjustmentsCardProps {
  readonly organizationId: string;
}

export function SubscriptionAdjustmentsCard({
  organizationId,
}: SubscriptionAdjustmentsCardProps): JSX.Element {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <Card data-testid="subscription-adjustments">
      <CardHeader>
        <CardTitle className="text-base">
          {t('platform:organizations.adjust.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('platform:organizations.adjust.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('extend')}
          >
            {t('platform:organizations.adjust.extend')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('grant-days')}
          >
            {t('platform:organizations.adjust.grantDays')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode('change-plan')}
          >
            {t('platform:organizations.adjust.changePlan')}
          </Button>
        </div>
      </CardContent>
      {mode ? (
        <AdjustmentDialog
          key={mode}
          organizationId={organizationId}
          mode={mode}
          onClose={() => setMode(null)}
        />
      ) : null}
    </Card>
  );
}

function AdjustmentDialog({
  organizationId,
  mode,
  onClose,
}: {
  readonly organizationId: string;
  readonly mode: Mode;
  readonly onClose: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const adjust = useSubscriptionAdjustment(organizationId);
  const catalog = usePlanCatalog();

  const [days, setDays] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [applyAt, setApplyAt] = useState<'now' | 'period_end'>('now');
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < REASON_MIN) {
      setLocalError('errors:platform.subscriptionAdjustment.reasonTooShort');
      return;
    }
    let input;
    if (mode === 'change-plan') {
      const key = planKey.trim();
      if (!key) return;
      input = {
        kind: mode,
        planKey: key,
        applyAt,
        reason: trimmedReason,
      } as const;
    } else {
      const count = Number(days);
      if (!Number.isInteger(count) || count < 1 || count > DAYS_MAX) {
        setLocalError('errors:platform.subscriptionAdjustment.daysRange');
        return;
      }
      input = { kind: mode, days: count, reason: trimmedReason } as const;
    }
    setLocalError(null);
    adjust.mutate(input, {
      onSuccess: () => {
        notifySuccess('platform:organizations.adjust.success');
        onClose();
      },
    });
  };

  const planKeys = (catalog.data ?? []).map((plan) => plan.key);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !adjust.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(TITLE_KEY[mode])}</DialogTitle>
          <DialogDescription>{t(DESCRIPTION_KEY[mode])}</DialogDescription>
        </DialogHeader>

        <form
          id="subscription-adjustment-form"
          className="space-y-4"
          onSubmit={submit}
          noValidate
        >
          {mode === 'change-plan' ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="adjust-plan-key">
                  {t('platform:organizations.adjust.planKey')}
                </Label>
                <Input
                  id="adjust-plan-key"
                  dir="ltr"
                  autoComplete="off"
                  list="adjust-plan-keys"
                  value={planKey}
                  onChange={(event) => setPlanKey(event.target.value)}
                  aria-describedby="adjust-plan-key-hint"
                  required
                />
                <datalist id="adjust-plan-keys">
                  {planKeys.map((key) => (
                    <option key={key} value={key} />
                  ))}
                </datalist>
                <p
                  id="adjust-plan-key-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t('platform:organizations.adjust.planKeyHint')}
                </p>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">
                  {t('platform:organizations.adjust.applyAt')}
                </legend>
                {(['now', 'period_end'] as const).map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="adjust-apply-at"
                      value={value}
                      checked={applyAt === value}
                      onChange={() => setApplyAt(value)}
                    />
                    {t(
                      value === 'now'
                        ? 'platform:organizations.adjust.applyNow'
                        : 'platform:organizations.adjust.applyPeriodEnd'
                    )}
                  </label>
                ))}
              </fieldset>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="adjust-days">
                {t('platform:organizations.adjust.days')}
              </Label>
              <Input
                id="adjust-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={DAYS_MAX}
                dir="ltr"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">
              {t('platform:organizations.adjust.reason')}
            </Label>
            <Textarea
              id="adjust-reason"
              dir="auto"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-describedby="adjust-reason-hint"
              required
            />
            <p
              id="adjust-reason-hint"
              className="text-xs text-muted-foreground"
            >
              {t('platform:organizations.adjust.reasonHint')}
            </p>
          </div>

          {localError || adjust.error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {localError
                  ? t(localError)
                  : apiErrorMessage(t, i18n, adjust.error)}
              </AlertDescription>
            </Alert>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={adjust.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="subscription-adjustment-form"
            disabled={adjust.isPending}
          >
            {adjust.isPending ? (
              <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {t('platform:organizations.adjust.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
