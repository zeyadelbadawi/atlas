/**
 * B0-SEC-13 — one privacy request, and what the Platform Owner can do with
 * it: start handling, decline with a reason, or fulfil (prepare the
 * download for an export; delete the account for a deletion).
 *
 * Deleting is typed, not clicked: the operator types DELETE, because the
 * action runs the standard Platform Owner deletion and cannot be undone.
 * The server re-checks everything (`PlatformOwnerGuard`, RLS, a
 * conditional status update, `confirm: true`).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useDateFormatter } from '@hooks';
import { useToast } from '@app/providers';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { ApiError } from '@api';
import type { BreadcrumbItem } from '@types';
import {
  useFulfilPrivacyRequest,
  usePlatformPrivacyRequest,
  useUpdatePrivacyRequestStatus,
} from '../hooks/usePrivacyRequests';
import { privacyStatusTone } from '../utils';
import { OPEN_PRIVACY_REQUEST_STATUSES } from '../types';

const NS = 'platform:privacyRequests';
const D = `${NS}.detail`;

function errorKeyOf(error: unknown): string {
  const key = (error as Partial<ApiError> | null)?.messageKey;
  return typeof key === 'string' && key.startsWith('errors.')
    ? `errors:${key.slice('errors.'.length)}`
    : `${D}.failed`;
}

export default function PlatformPrivacyRequestDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { notifySuccess } = useToast();
  const { requestId } = useParams<{ requestId: string }>();
  const query = usePlatformPrivacyRequest(requestId);
  const updateStatus = useUpdatePrivacyRequestStatus();
  const fulfil = useFulfilPrivacyRequest();

  const [dialog, setDialog] = useState<'reject' | 'delete' | null>(null);
  const [note, setNote] = useState('');
  const [typed, setTyped] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformPrivacyRequests',
      path: DASHBOARD_ROUTES.platformPrivacyRequests,
    },
    { labelKey: `${NS}.breadcrumb` },
  ];

  const row = query.data;
  const busy = updateStatus.isPending || fulfil.isPending;
  const isOpen = row
    ? OPEN_PRIVACY_REQUEST_STATUSES.includes(row.status)
    : false;

  async function run(action: () => Promise<unknown>): Promise<void> {
    setErrorKey(null);
    try {
      await action();
      notifySuccess(`${D}.saved`);
      setDialog(null);
    } catch (error) {
      setErrorKey(errorKeyOf(error));
    }
  }

  const field = (labelKey: string, value: React.ReactNode) => (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{t(labelKey)}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );

  let content: JSX.Element;
  if (query.error) {
    content = (
      <ErrorState
        kind={query.error.kind}
        onRetry={() => void query.refetch()}
        headingLevel="h2"
      />
    );
  } else if (!row) {
    content = <Skeleton className="h-64 w-full" />;
  } else {
    content = (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>{t(`${NS}.type.${row.type}`)}</CardTitle>
            <StatusBadge
              labelKey={`${NS}.status.${row.status}`}
              tone={privacyStatusTone(row.status)}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {field(
                `${D}.requester`,
                <span dir="auto">{row.requesterName}</span>
              )}
              {field(
                `${D}.email`,
                <span dir="ltr" data-ltr-content>
                  {row.requesterEmail}
                </span>
              )}
              {field(
                `${D}.academy`,
                <span dir="auto">
                  {row.academyName ?? t(`${NS}.noAcademy`)}
                </span>
              )}
              {field(`${D}.filed`, fmt.dateTime(row.createdAt))}
              {row.completedAt
                ? field(`${D}.completed`, fmt.dateTime(row.completedAt))
                : null}
              {row.exportAvailableUntil
                ? field(
                    `${D}.availableUntil`,
                    fmt.dateTime(row.exportAvailableUntil)
                  )
                : null}
              {row.resolutionNote
                ? field(
                    `${D}.note`,
                    <span dir="auto">{row.resolutionNote}</span>
                  )
                : null}
            </dl>
            <p className="text-sm text-muted-foreground">
              {t(`${D}.identity`)}
            </p>
            {row.userId &&
            !(row.type === 'deletion' && row.status === 'completed') ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                to={buildPath(DASHBOARD_ROUTES.platformUserDetail, {
                  userId: row.userId,
                })}
              >
                {t(`${D}.openUser`)}
              </Link>
            ) : row.type === 'deletion' && row.status === 'completed' ? (
              <p className="text-sm text-muted-foreground">
                {t(`${D}.accountGone`)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {errorKey ? (
          <p
            role="alert"
            data-testid="privacy-request-admin-error"
            className="text-sm text-destructive"
          >
            {t(errorKey)}
          </p>
        ) : null}

        {isOpen ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                {row.type === 'export'
                  ? t(`${D}.fulfilExportHint`)
                  : t(`${D}.fulfilDeletionHint`)}
              </p>
              <div className="flex flex-wrap gap-2">
                {row.status === 'submitted' ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        updateStatus.mutateAsync({
                          requestId: row.id,
                          status: 'in_progress',
                        })
                      )
                    }
                  >
                    {updateStatus.isPending
                      ? t(`${D}.starting`)
                      : t(`${D}.start`)}
                  </Button>
                ) : null}
                {row.type === 'export' ? (
                  <Button
                    data-testid="privacy-request-fulfil"
                    disabled={busy}
                    onClick={() =>
                      void run(() => fulfil.mutateAsync({ requestId: row.id }))
                    }
                  >
                    {fulfil.isPending
                      ? t(`${D}.working`)
                      : t(`${D}.fulfilExport`)}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    data-testid="privacy-request-fulfil"
                    disabled={busy}
                    onClick={() => {
                      setTyped('');
                      setErrorKey(null);
                      setDialog('delete');
                    }}
                  >
                    {t(`${D}.fulfilDeletion`)}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  data-testid="privacy-request-reject"
                  disabled={busy}
                  onClick={() => {
                    setNote('');
                    setErrorKey(null);
                    setDialog('reject');
                  }}
                >
                  {t(`${D}.reject`)}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Dialog
          open={dialog !== null}
          onOpenChange={(open) => !open && !busy && setDialog(null)}
        >
          <DialogContent className="sm:max-w-lg">
            {dialog === 'reject' && row ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t(`${D}.rejectTitle`)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="privacy-reject-note">
                    {t(`${D}.rejectLabel`)}
                  </Label>
                  <Textarea
                    id="privacy-reject-note"
                    value={note}
                    maxLength={2000}
                    placeholder={t(`${D}.rejectPlaceholder`)}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDialog(null)}
                  >
                    {t(`${D}.cancel`)}
                  </Button>
                  <Button
                    variant="destructive"
                    data-testid="privacy-request-reject-confirm"
                    disabled={busy || note.trim().length < 5}
                    onClick={() =>
                      void run(() =>
                        updateStatus.mutateAsync({
                          requestId: row.id,
                          status: 'rejected',
                          note: note.trim(),
                        })
                      )
                    }
                  >
                    {busy ? t(`${D}.working`) : t(`${D}.reject`)}
                  </Button>
                </DialogFooter>
              </>
            ) : null}
            {dialog === 'delete' && row ? (
              <>
                <DialogHeader>
                  <DialogTitle>{t(`${D}.confirmDeletionTitle`)}</DialogTitle>
                  <DialogDescription>
                    {t(`${D}.confirmDeletionBody`)}
                  </DialogDescription>
                </DialogHeader>
                <Input
                  aria-label={t(`${D}.confirmDeletionBody`)}
                  data-testid="privacy-request-delete-typed"
                  autoComplete="off"
                  dir="ltr"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDialog(null)}
                  >
                    {t(`${D}.cancel`)}
                  </Button>
                  <Button
                    variant="destructive"
                    data-testid="privacy-request-delete-confirm"
                    disabled={busy || typed.trim() !== t(`${D}.confirmWord`)}
                    onClick={() =>
                      void run(() => fulfil.mutateAsync({ requestId: row.id }))
                    }
                  >
                    {busy ? t(`${D}.working`) : t(`${D}.confirm`)}
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader titleKey={`${NS}.title`} breadcrumbs={breadcrumbs} />
      {content}
    </PageContainer>
  );
}
