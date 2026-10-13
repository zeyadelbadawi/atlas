/**
 * B0-SEC-13 — "Your data": a person asks for a copy of their data, or for
 * their account to be deleted, and follows those requests.
 *
 * A REQUEST, NOT THE ACT. Nothing is deleted or exported here: the request
 * goes to the Atlas team, who handle it and email the person. That is why
 * this card can sit on a learner's profile, where an irreversible
 * self-service delete button would be a trap (see `LearnerProfilePage`).
 *
 * THE EMAILED CODE IS THE AUTHORISATION. A stolen session could click a
 * button; it cannot read the account's mailbox. Step one emails a code,
 * step two files the request with it — the same two steps as account
 * deletion, with a code that is only valid for this purpose.
 *
 * THE DOWNLOAD IS SIGNED IN. When an export is ready the file is fetched
 * here, by the account itself; the email carries no download link.
 *
 * NO HANDLING TIME is shown: none has been published (OQ-23).
 */
import { useEffect, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useTranslation } from 'react-i18next';
import { Download, FileDown, ShieldCheck, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { StatusBadge } from '@components/data-display';
import { useCurrentUser, useDateFormatter } from '@hooks';
import { useToast } from '@app/providers';
import { downloadBlob } from '@utils';
import type { ApiError } from '@api';
import { privacyRequestService } from '../services/PrivacyRequestService';
import { privacyStatusTone } from '../utils';
import {
  useFilePrivacyRequest,
  useMyPrivacyRequests,
} from '../hooks/usePrivacyRequests';
import {
  OPEN_PRIVACY_REQUEST_STATUSES,
  type MyPrivacyRequest,
  type PrivacyRequestChallenge,
  type PrivacyRequestType,
} from '../types';

const NS = 'profile:privacyRequests';

/** `errors.account.x` → the `errors` namespace's `account.x`. */
function toErrorKey(error: unknown): string {
  const key = (error as Partial<ApiError> | null)?.messageKey;
  return typeof key === 'string' && key.startsWith('errors.')
    ? `errors:${key.slice('errors.'.length)}`
    : `${NS}.failed`;
}

export function PrivacyRequestsCard(): JSX.Element | null {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const fmt = useDateFormatter();
  const { notifySuccess } = useToast();
  const requests = useMyPrivacyRequests();
  const fileRequest = useFilePrivacyRequest();

  const [type, setType] = useState<PrivacyRequestType | null>(null);
  const [challenge, setChallenge] = useState<PrivacyRequestChallenge | null>(
    null
  );
  const [code, setCode] = useState('');
  const [isRequesting, setRequesting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const resendAt = challenge ? Date.parse(challenge.resendAvailableAt) : 0;
  useEffect(() => {
    if (!challenge || now >= resendAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, now, resendAt]);
  const resendInSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  // The server refuses a Platform Owner; do not offer what cannot succeed.
  if (user?.roles.includes('platform_owner')) return null;

  const rows: readonly MyPrivacyRequest[] = requests.data ?? [];
  const hasOpen = (kind: PrivacyRequestType): boolean =>
    rows.some(
      (row) =>
        row.type === kind && OPEN_PRIVACY_REQUEST_STATUSES.includes(row.status)
    );
  const isSubmitting = fileRequest.isPending;

  function open(kind: PrivacyRequestType): void {
    setType(kind);
    setChallenge(null);
    setCode('');
    setErrorKey(null);
  }

  async function requestCode(): Promise<void> {
    if (isRequesting) return;
    setRequesting(true);
    setErrorKey(null);
    try {
      setChallenge(await privacyRequestService.requestCode());
      setCode('');
      setNow(Date.now());
    } catch (error) {
      setErrorKey(toErrorKey(error));
    } finally {
      setRequesting(false);
    }
  }

  async function submit(): Promise<void> {
    if (!type || !challenge || code.length !== 6 || isSubmitting) return;
    setErrorKey(null);
    try {
      await fileRequest.mutateAsync({
        type,
        challengeId: challenge.challengeId,
        code,
      });
      setType(null);
      notifySuccess(`${NS}.submitted`);
    } catch (error) {
      setCode('');
      setErrorKey(toErrorKey(error));
    }
  }

  async function download(row: MyPrivacyRequest): Promise<void> {
    setDownloadingId(row.id);
    try {
      const bundle = await privacyRequestService.downloadExport(row.id);
      const day = new Date().toISOString().slice(0, 10);
      downloadBlob(
        new Blob([JSON.stringify(bundle, null, 2)], {
          type: 'application/json',
        }),
        `atlas-my-data-${day}.json`
      );
    } catch {
      setErrorKey(`${NS}.downloadFailed`);
      void requests.refetch();
    } finally {
      setDownloadingId(null);
    }
  }

  const option = (kind: PrivacyRequestType) => {
    const Icon = kind === 'export' ? FileDown : Trash2;
    const blocked = hasOpen(kind);
    return (
      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Icon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="space-y-1">
            <p className="font-medium">{t(`${NS}.${kind}Title`)}</p>
            <p className="text-sm text-muted-foreground">
              {t(`${NS}.${kind}Description`)}
            </p>
            {blocked ? (
              <p className="text-sm text-muted-foreground">
                {t(`${NS}.openRequest`)}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant={kind === 'deletion' ? 'destructive' : 'outline'}
          className="shrink-0"
          data-testid={`privacy-request-${kind}`}
          disabled={blocked || requests.isLoading}
          onClick={() => open(kind)}
        >
          {t(`${NS}.${kind}Action`)}
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" aria-hidden />
          {t(`${NS}.title`)}
        </CardTitle>
        <CardDescription>{t(`${NS}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {option('export')}
        {option('deletion')}

        {errorKey && !type ? (
          <p role="alert" className="text-sm text-destructive">
            {t(errorKey)}
          </p>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t(`${NS}.historyTitle`)}</h3>
          {requests.isError ? (
            <p className="text-sm text-destructive">{t(`${NS}.loadFailed`)}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {requests.isLoading ? '…' : t(`${NS}.historyEmpty`)}
            </p>
          ) : (
            <ul
              className="divide-y rounded-lg border"
              data-testid="privacy-request-history"
            >
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {t(`${NS}.type.${row.type}`)}
                      </span>
                      <StatusBadge
                        labelKey={`${NS}.status.${row.status}`}
                        tone={privacyStatusTone(row.status)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`${NS}.filedOn`, { date: fmt.date(row.createdAt) })}
                    </p>
                    {row.canDownload && row.exportAvailableUntil ? (
                      <p className="text-xs text-muted-foreground">
                        {t(`${NS}.availableUntil`, {
                          date: fmt.dateTime(row.exportAvailableUntil),
                        })}
                      </p>
                    ) : null}
                    {row.status === 'rejected' && row.resolutionNote ? (
                      <p className="text-sm">
                        {t(`${NS}.reason`, { note: row.resolutionNote })}
                      </p>
                    ) : null}
                  </div>
                  {row.canDownload ? (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="privacy-request-download"
                      disabled={downloadingId === row.id}
                      onClick={() => void download(row)}
                    >
                      <Download className="me-2 size-4" aria-hidden />
                      {downloadingId === row.id
                        ? t(`${NS}.downloading`)
                        : t(`${NS}.download`)}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <Dialog
        open={type !== null}
        onOpenChange={(next) => {
          if (!next && !isRequesting && !isSubmitting) setType(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {type === 'deletion'
                ? t(`${NS}.dialogTitleDeletion`)
                : t(`${NS}.dialogTitleExport`)}
            </DialogTitle>
            <DialogDescription>
              {type === 'deletion'
                ? t(`${NS}.deletionDescription`)
                : t(`${NS}.exportDescription`)}
            </DialogDescription>
          </DialogHeader>

          {errorKey ? (
            <p
              role="alert"
              data-testid="privacy-request-error"
              className="text-sm text-destructive"
            >
              {t(errorKey)}
            </p>
          ) : null}

          {challenge ? (
            <div className="space-y-4" data-testid="privacy-request-code-step">
              <div className="space-y-1">
                <p className="font-medium">{t(`${NS}.codeTitle`)}</p>
                <p className="text-sm text-muted-foreground">
                  {t(`${NS}.codeDescription`, { email: challenge.maskedEmail })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy-request-code">
                  {t(`${NS}.codeLabel`)}
                </Label>
                <InputOTP
                  id="privacy-request-code"
                  data-testid="privacy-request-code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  containerClassName="justify-center"
                >
                  {/* Digits read left-to-right in Arabic too. */}
                  <InputOTPGroup dir="ltr" data-ltr-content>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-12 w-10 text-lg font-medium sm:w-12"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                variant="link"
                className="h-auto p-0"
                disabled={resendInSeconds > 0 || isRequesting || isSubmitting}
                onClick={() => void requestCode()}
              >
                {resendInSeconds > 0
                  ? t(`${NS}.resendIn`, { seconds: resendInSeconds })
                  : t(`${NS}.resend`)}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(`${NS}.dialogDescription`)}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={isRequesting || isSubmitting}
              onClick={() => setType(null)}
            >
              {t('common:actions.cancel')}
            </Button>
            {challenge ? (
              <Button
                variant={type === 'deletion' ? 'destructive' : 'default'}
                data-testid="privacy-request-submit"
                disabled={code.length !== 6 || isSubmitting}
                onClick={() => void submit()}
              >
                {isSubmitting ? t(`${NS}.submitting`) : t(`${NS}.submit`)}
              </Button>
            ) : (
              <Button
                data-testid="privacy-request-send-code"
                disabled={isRequesting}
                onClick={() => void requestCode()}
              >
                {isRequesting ? t(`${NS}.sendingCode`) : t(`${NS}.sendCode`)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
