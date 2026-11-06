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
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@components/data-display';
import { ErrorState } from '@components/feedback';
import { DataTable } from '@components/table';
import { useCopyToClipboard, useDateFormatter } from '@hooks';
import { useConfirmDialog, useToast } from '@app/providers';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  FormErrorSummary,
  SaveFailedAlert,
  hasViolationOn,
  isFieldViolationError,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import {
  useAcademyInvites,
  useCreateAcademyInvite,
  useRevokeAcademyInvite,
} from '../hooks';
// Its own module, not the barrel: tests that stub the barrel keep it real.
import { useActionFailureToast } from '../hooks/useActionFailureToast';
import {
  buildInviteLink,
  getInviteState,
  getInviteStateTone,
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
  const { notifySuccess } = useToast();
  const actionFailed = useActionFailureToast();
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
          actionFailed(err, 'academy:registration.invites.revoke.failed'),
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
              data-testid="invite-revoke"
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

/** Backend `CreateAcademyInviteDto`: `maxUses` 1–1000, `expiresInDays` 1–365. */
const INVITE_MAX_USES_LIMIT = 1000;
const INVITE_MAX_DAYS_LIMIT = 365;

/** Arabic-Indic (٠–٩) and Persian (۰–۹) digits read as Western ones. */
function toWesternDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * A whole number in [1, max] typed as text. "1.5", "-3", "0" and "" are
 * refused with the limit stated — never rounded, never a silently greyed
 * button.
 */
function wholeNumberIn(max: number, message: string) {
  return z
    .string()
    .transform((value) => toWesternDigits(value).trim())
    .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, message)
    .refine((value) => Number(value) <= max, message);
}

const createInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'validation:invalidEmail'
    ),
  maxUses: wholeNumberIn(
    INVITE_MAX_USES_LIMIT,
    'academy:registration.invites.create.maxUsesRange'
  ),
  expiresInDays: wholeNumberIn(
    INVITE_MAX_DAYS_LIMIT,
    'academy:registration.invites.create.expiresInDaysRange'
  ),
});

type CreateInviteFormInput = z.input<typeof createInviteSchema>;
type CreateInviteFormOutput = z.output<typeof createInviteSchema>;

const INVITE_DEFAULTS: CreateInviteFormInput = {
  email: '',
  maxUses: String(DEFAULT_MAX_USES),
  expiresInDays: String(DEFAULT_EXPIRES_IN_DAYS),
};

/** Field → label, for server violations and the labels `{{field}}` reads. */
const INVITE_FIELD_LABELS: Readonly<Record<string, string>> = {
  email: 'academy:registration.invites.create.emailLabel',
  maxUses: 'academy:registration.invites.create.maxUsesLabel',
  expiresInDays: 'academy:registration.invites.create.expiresInDaysLabel',
};

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
  const { copy, hasCopied } = useCopyToClipboard();
  const create = useCreateAcademyInvite(academyId);
  const [created, setCreated] = useState<CreatedAcademyInvite | null>(null);

  const form = useForm<CreateInviteFormInput, unknown, CreateInviteFormOutput>(
    {
      resolver: zodResolver(createInviteSchema),
      defaultValues: INVITE_DEFAULTS,
    }
  );

  // Server violations (email, maxUses, expiresInDays) land on their fields,
  // under the dialog's own labels; anything else is one alert in the dialog.
  const labelled = useLabelledViolations(create.error, INVITE_FIELD_LABELS);
  useServerValidation(form, labelled);
  useFocusFirstViolation(form, labelled, INVITE_FIELD_LABELS);
  const failure =
    create.error &&
    !(
      isFieldViolationError(create.error) &&
      hasViolationOn(create.error, INVITE_FIELD_LABELS)
    )
      ? create.error
      : null;

  // Typed-in work is protected; the created link is not "unsaved".
  const dirtyGuard = useDirtyGuard(form.formState.isDirty && !created);

  // Closing clears the draft and the last failure. Read through a ref: a
  // fresh `reset` identity must not re-run this on every render.
  const resetCreateRef = useRef(create.reset);
  resetCreateRef.current = create.reset;
  const { reset } = form;
  useEffect(() => {
    if (!open) {
      reset(INVITE_DEFAULTS);
      resetCreateRef.current();
      setCreated(null);
    }
  }, [open, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    void dirtyGuard.requestClose(() => onOpenChange(false));
  };

  const onSubmit = (values: CreateInviteFormOutput) => {
    create.mutate(
      {
        email: values.email || undefined,
        maxUses: Number(values.maxUses),
        expiresInDays: Number(values.expiresInDays),
      },
      { onSuccess: (invite) => setCreated(invite) }
    );
  };

  const link = created ? buildInviteLink(academyHost, created.token) : undefined;
  const shareValue = link ?? created?.token ?? '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  data-ltr-content
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
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
                data-testid="invite-create-form"
              >
                <FormErrorSummary
                  form={form}
                  fieldLabels={INVITE_FIELD_LABELS}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('academy:registration.invites.create.emailLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          dir="ltr"
                          data-ltr-content
                          autoComplete="off"
                          placeholder={t(
                            'academy:registration.invites.create.emailPlaceholder'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('academy:registration.invites.create.emailHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('academy:registration.invites.create.maxUsesLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('academy:registration.invites.create.maxUsesHelp')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiresInDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t(
                            'academy:registration.invites.create.expiresInDaysLabel'
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {t(
                            'academy:registration.invites.create.expiresInDaysHelp'
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {failure ? (
                  <SaveFailedAlert
                    error={failure}
                    titleKey="academy:registration.invites.create.failed"
                  />
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={create.isPending}
                  >
                    {t('common:actions.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={create.isPending}
                    data-testid="invite-create-submit"
                  >
                    {create.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t('academy:registration.invites.create.submit')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
