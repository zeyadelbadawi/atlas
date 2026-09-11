/**
 * Two-factor authentication card (Phase 10.3).
 *
 * Replaces the permanently-disabled "Enable" button that stood here while
 * 2FA was deferred.
 *
 * SECRET MATERIAL IS SHOWN ONCE AND HELD ONLY IN COMPONENT STATE. The
 * TOTP secret and the recovery codes are returned by the API exactly once
 * and are unrecoverable afterwards, so they are never written to the
 * query cache, localStorage, or anywhere else. Navigating away loses
 * them, which is why the recovery-code step makes the user acknowledge
 * that they have saved them before it will close.
 *
 * The QR is rendered from a server-generated data URI — the client never
 * builds an `otpauth://` URI itself, so there is no second place the
 * secret could be assembled or leaked.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@hooks';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { twoFactorService } from '@services/identity';
import type { TwoFactorSetupResult, TwoFactorStatus } from '@types';
import type { ApiError } from '@api';

const TWO_FACTOR_STATUS_KEY = ['auth', '2fa', 'status'] as const;

type Stage = 'idle' | 'scanning' | 'codes' | 'disabling' | 'regenerating';

export function TwoFactorCard(): JSX.Element {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('idle');
  const [setup, setSetup] = useState<TwoFactorSetupResult | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const status = useApiQuery<TwoFactorStatus, ApiError>({
    queryKey: TWO_FACTOR_STATUS_KEY,
    queryFn: () => twoFactorService.getStatus(),
  });

  /** Clears every piece of secret material from component state. */
  const resetSecrets = (): void => {
    setSetup(null);
    setCode('');
    setPassword('');
    setRecoveryCodes([]);
    setAcknowledged(false);
  };

  const closeAll = (): void => {
    setStage('idle');
    resetSecrets();
    void status.refetch();
  };

  const startSetup = useApiMutation<TwoFactorSetupResult, void, ApiError>({
    mutationFn: () => twoFactorService.startSetup(),
    showSuccessToast: false,
    showErrorToast: false,
  });

  const confirmSetup = useApiMutation<
    { recoveryCodes: string[] },
    string,
    ApiError
  >({
    mutationFn: (token) => twoFactorService.confirmSetup(token),
    showSuccessToast: false,
    showErrorToast: false,
  });

  const disable = useApiMutation<void, string, ApiError>({
    mutationFn: (pw) => twoFactorService.disable(pw),
    showSuccessToast: false,
    showErrorToast: false,
  });

  const regenerate = useApiMutation<
    { recoveryCodes: string[] },
    string,
    ApiError
  >({
    mutationFn: (pw) => twoFactorService.regenerateRecoveryCodes(pw),
    showSuccessToast: false,
    showErrorToast: false,
  });

  const handleStart = (): void => {
    startSetup.mutate(undefined, {
      onSuccess: (result) => {
        setSetup(result);
        setStage('scanning');
      },
      onError: () =>
        toast({
          variant: 'destructive',
          title: t('profile:twoFactor.setupFailed'),
        }),
    });
  };

  const handleConfirm = (): void => {
    confirmSetup.mutate(code, {
      onSuccess: (result) => {
        // The secret has served its purpose — drop it immediately rather
        // than leaving it in state behind the next dialog.
        setSetup(null);
        setCode('');
        setRecoveryCodes(result.recoveryCodes);
        setStage('codes');
      },
      onError: () =>
        toast({
          variant: 'destructive',
          title: t('profile:twoFactor.invalidCode'),
          description: t('profile:twoFactor.invalidCodeDescription'),
        }),
    });
  };

  const handleDisable = (): void => {
    disable.mutate(password, {
      onSuccess: () => {
        toast({ title: t('profile:twoFactor.disabled') });
        closeAll();
      },
      onError: () =>
        toast({
          variant: 'destructive',
          title: t('profile:twoFactor.passwordRejected'),
        }),
    });
  };

  const handleRegenerate = (): void => {
    regenerate.mutate(password, {
      onSuccess: (result) => {
        setPassword('');
        setRecoveryCodes(result.recoveryCodes);
        setStage('codes');
      },
      onError: () =>
        toast({
          variant: 'destructive',
          title: t('profile:twoFactor.passwordRejected'),
        }),
    });
  };

  const enabled = status.data?.enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck className="size-5 text-success" aria-hidden />
          ) : (
            <Shield className="size-5 text-primary" aria-hidden />
          )}
          <div>
            <CardTitle>{t('profile:sections.security.twoFactor')}</CardTitle>
            <CardDescription>
              {t('profile:sections.security.twoFactorDescription')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-medium">
              {t('profile:sections.security.twoFactorStatus')}
              {enabled ? (
                <Badge variant="secondary">
                  {t('profile:twoFactor.enabled')}
                </Badge>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? t('profile:twoFactor.recoveryCodesRemaining', {
                    count: status.data?.recoveryCodesRemaining ?? 0,
                  })
                : t('profile:sections.security.twoFactorDisabled')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {enabled ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStage('regenerating')}
                >
                  {t('profile:twoFactor.regenerateCodes')}
                </Button>
                <Button variant="outline" onClick={() => setStage('disabling')}>
                  {t('profile:twoFactor.disable')}
                </Button>
              </>
            ) : (
              <Button onClick={handleStart} disabled={startSetup.isPending}>
                {startSetup.isPending
                  ? t('common:actions.saving')
                  : t('profile:actions.enable')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* ---- Enrolment: scan and confirm ---- */}
      <Dialog
        open={stage === 'scanning'}
        onOpenChange={(open) => {
          if (!open) closeAll();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile:twoFactor.setupTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile:twoFactor.setupDescription')}
            </DialogDescription>
          </DialogHeader>

          {setup ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={setup.qrCodeDataUri}
                  alt={t('profile:twoFactor.qrAlt')}
                  className="size-48 rounded-md border bg-white p-2"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="totp-secret">
                  {t('profile:twoFactor.manualEntry')}
                </Label>
                {/* Read-only and selectable: some authenticator apps cannot
                    scan, and typing a base32 secret by hand is error-prone. */}
                <Input
                  id="totp-secret"
                  readOnly
                  value={setup.secret}
                  className="font-mono text-sm"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="totp-code">
                  {t('profile:twoFactor.enterCode')}
                </Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-widest"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={closeAll}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={code.length !== 6 || confirmSetup.isPending}
            >
              {confirmSetup.isPending
                ? t('common:actions.saving')
                : t('profile:twoFactor.verifyAndEnable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Recovery codes: shown exactly once ---- */}
      <Dialog
        open={stage === 'codes'}
        onOpenChange={(open) => {
          // Deliberately NOT closable until acknowledged: these codes
          // cannot be retrieved again, and losing them plus a lost phone
          // means losing the account.
          if (!open && acknowledged) closeAll();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile:twoFactor.recoveryTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile:twoFactor.recoveryDescription')}
            </DialogDescription>
          </DialogHeader>

          <ul className="grid grid-cols-2 gap-2 rounded-md border bg-muted p-4 font-mono text-sm">
            {recoveryCodes.map((recoveryCode) => (
              <li key={recoveryCode} className="tabular-nums">
                {recoveryCode}
              </li>
            ))}
          </ul>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1"
            />
            <span>{t('profile:twoFactor.recoveryAcknowledge')}</span>
          </label>

          <DialogFooter>
            <Button onClick={closeAll} disabled={!acknowledged}>
              {t('profile:twoFactor.recoveryDone')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Password-gated management ---- */}
      <Dialog
        open={stage === 'disabling' || stage === 'regenerating'}
        onOpenChange={(open) => {
          if (!open) closeAll();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stage === 'disabling'
                ? t('profile:twoFactor.disableTitle')
                : t('profile:twoFactor.regenerateTitle')}
            </DialogTitle>
            <DialogDescription>
              {stage === 'disabling'
                ? t('profile:twoFactor.disableDescription')
                : t('profile:twoFactor.regenerateDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <Label htmlFor="twofactor-password">
              {t('profile:fields.currentPassword')}
            </Label>
            <Input
              id="twofactor-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {/* Says why the password is being asked for, so it does not
                read as a pointless extra step. */}
            <p className="text-xs text-muted-foreground">
              {t('profile:twoFactor.passwordRequiredReason')}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAll}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant={stage === 'disabling' ? 'destructive' : 'default'}
              onClick={stage === 'disabling' ? handleDisable : handleRegenerate}
              disabled={!password || disable.isPending || regenerate.isPending}
            >
              {disable.isPending || regenerate.isPending
                ? t('common:actions.saving')
                : stage === 'disabling'
                  ? t('profile:twoFactor.disable')
                  : t('profile:twoFactor.regenerateCodes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
