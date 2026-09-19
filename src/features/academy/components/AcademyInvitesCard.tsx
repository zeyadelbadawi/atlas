/**
 * Academy Invites card (P64 Phase 1).
 *
 * Invite links a learner uses to register on the academy website
 * (`https://{academy host}/sign-up?invite={token}`). The raw token comes
 * back exactly once, on creation, so the create dialog is the only place
 * it can be copied — the list never shows it.
 *
 * The host is a backend-resolved fact (canonical host / subdomain
 * `fullHost`); without one the dialog shows the token itself and says so,
 * rather than building a link from a guessed domain.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { DataTable } from '@components/table';
import { useCopyToClipboard, useDateFormatter } from '@hooks';
import { useConfirmDialog, useToast } from '@app/providers';
import {
  useAcademyInvites,
  useCreateAcademyInvite,
  useRevokeAcademyInvite,
} from '../hooks';
import {
  buildInviteLink,
  getInviteState,
  getInviteStateTone,
  getRosterErrorKey,
} from '../utils/academy-roster.utils';
import type { AcademyInvite, CreatedAcademyInvite } from '@types';

export interface AcademyInvitesCardProps {
  readonly academyId: string;
  /** Backend-resolved public host of the academy website, when known. */
  readonly academyHost?: string;
}

const DEFAULT_MAX_USES = 1;
const DEFAULT_EXPIRES_IN_DAYS = 7;

export function AcademyInvitesCard({
  academyId,
  academyHost,
}: AcademyInvitesCardProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const { confirm } = useConfirmDialog();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useAcademyInvites(academyId);
  const revoke = useRevokeAcademyInvite(academyId);

  const invites = data ?? [];

  const handleRevoke = async (invite: AcademyInvite) => {
    const confirmed = await confirm({
      titleKey: 'academy:registration.invites.revoke.title',
      descriptionKey: 'academy:registration.invites.revoke.description',
      confirmLabelKey: 'academy:registration.invites.revoke.confirm',
      cancelLabelKey: 'common:actions.cancel',
      intent: 'destructive',
    });
    if (!confirmed) return;
    revoke.mutate(
      { inviteId: invite.id },
      {
        onSuccess: () =>
          notifySuccess('academy:registration.invites.revoke.success'),
        onError: (err) =>
          notifyError(
            getRosterErrorKey(err, 'academy:registration.invites.revoke.failed')
          ),
      }
    );
  };

  const columns: ColumnDef<AcademyInvite, unknown>[] = [
    {
      accessorKey: 'email',
      header: t('academy:registration.invites.table.email'),
      cell: ({ row }) =>
        row.original.email ? (
          <span dir="auto">{row.original.email}</span>
        ) : (
          <span className="text-muted-foreground">
            {t('academy:registration.invites.anyone')}
          </span>
        ),
    },
    {
      id: 'uses',
      header: t('academy:registration.invites.table.uses'),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.usedCount} / {row.original.maxUses}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: t('academy:registration.invites.table.expires'),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {fmt.dateTime(row.original.expiresAt)}
        </span>
      ),
    },
    {
      id: 'state',
      header: t('academy:registration.invites.table.status'),
      cell: ({ row }) => {
        const state = getInviteState(row.original);
        return (
          <StatusBadge
            labelKey={`academy:registration.invites.state.${state}`}
            tone={getInviteStateTone(state)}
          />
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        getInviteState(row.original) === 'active' ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={revoke.isPending}
              onClick={() => void handleRevoke(row.original)}
              aria-label={t('academy:registration.invites.revoke.action')}
            >
              <Trash2 className="size-4" aria-hidden />
              {t('academy:registration.invites.revoke.action')}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Link2
              className="size-4 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            {t('academy:registration.invites.title')}
          </CardTitle>
          <CardDescription>
            {t('academy:registration.invites.description')}
          </CardDescription>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t('academy:registration.invites.create.trigger')}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState kind={error.kind} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={invites}
            isLoading={isLoading}
            emptyTitleKey="academy:registration.invites.empty"
            emptyDescriptionKey="academy:registration.invites.emptyDescription"
            getRowId={(invite) => invite.id}
          />
        )}
      </CardContent>

      <CreateInviteDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        academyId={academyId}
        academyHost={academyHost}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */

interface CreateInviteDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
  readonly academyHost?: string;
}

function CreateInviteDialog({
  open,
  onOpenChange,
  academyId,
  academyHost,
}: CreateInviteDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifyError } = useToast();
  const { copy, hasCopied } = useCopyToClipboard();
  const create = useCreateAcademyInvite(academyId);

  const [email, setEmail] = useState('');
  const [maxUses, setMaxUses] = useState(String(DEFAULT_MAX_USES));
  const [expiresInDays, setExpiresInDays] = useState(
    String(DEFAULT_EXPIRES_IN_DAYS)
  );
  const [created, setCreated] = useState<CreatedAcademyInvite | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setMaxUses(String(DEFAULT_MAX_USES));
      setExpiresInDays(String(DEFAULT_EXPIRES_IN_DAYS));
      setCreated(null);
    }
  }, [open]);

  const parsedMaxUses = Number.parseInt(maxUses, 10);
  const parsedDays = Number.parseInt(expiresInDays, 10);
  const isValid =
    Number.isInteger(parsedMaxUses) &&
    parsedMaxUses >= 1 &&
    Number.isInteger(parsedDays) &&
    parsedDays >= 1;

  const handleCreate = () => {
    if (!isValid) return;
    create.mutate(
      {
        email: email.trim() || undefined,
        maxUses: parsedMaxUses,
        expiresInDays: parsedDays,
      },
      {
        onSuccess: (invite) => setCreated(invite),
        onError: (err) =>
          notifyError(
            getRosterErrorKey(err, 'academy:registration.invites.create.failed')
          ),
      }
    );
  };

  const link = created ? buildInviteLink(academyHost, created.token) : undefined;
  const shareValue = link ?? created?.token ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('academy:registration.invites.created.title')}
              </DialogTitle>
              <DialogDescription>
                {link
                  ? t('academy:registration.invites.created.linkDescription')
                  : t('academy:registration.invites.created.tokenDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invite-share-value">
                {link
                  ? t('academy:registration.invites.created.linkLabel')
                  : t('academy:registration.invites.created.tokenLabel')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invite-share-value"
                  readOnly
                  value={shareValue}
                  dir="ltr"
                  className="font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copy(shareValue)}
                  aria-label={t('common:actions.copy')}
                >
                  {hasCopied ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Copy className="size-4" aria-hidden />
                  )}
                  {hasCopied
                    ? t('common:actions.copied')
                    : t('common:actions.copy')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('academy:registration.invites.created.onceWarning')}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t('academy:registration.invites.created.done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('academy:registration.invites.create.title')}
              </DialogTitle>
              <DialogDescription>
                {t('academy:registration.invites.create.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">
                  {t('academy:registration.invites.create.emailLabel')}
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t(
                    'academy:registration.invites.create.emailPlaceholder'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {t('academy:registration.invites.create.emailHelp')}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-max-uses">
                    {t('academy:registration.invites.create.maxUsesLabel')}
                  </Label>
                  <Input
                    id="invite-max-uses"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={maxUses}
                    onChange={(event) => setMaxUses(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-expires-days">
                    {t('academy:registration.invites.create.expiresInDaysLabel')}
                  </Label>
                  <Input
                    id="invite-expires-days"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={expiresInDays}
                    onChange={(event) => setExpiresInDays(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={create.isPending}
              >
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!isValid || create.isPending}
              >
                {create.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('academy:registration.invites.create.submit')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
