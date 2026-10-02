/**
 * One website Contact form message, in a side sheet over the list.
 *
 * The visitor's message is rendered as TEXT — React escapes it, and
 * `whitespace-pre-wrap` keeps the line breaks the visitor typed. It is
 * never parsed as HTML: it is untrusted input from a public form.
 *
 * Actions follow the message's state: a new message can be marked read,
 * a read one marked unread (back to `new`), either archived; an archived
 * one restored (to `read`). There is no delete — Archive is reversible,
 * which is also why it asks for no confirmation (the page offers Undo
 * instead, like every other reversible roster action).
 *
 * Focus is managed by the Radix dialog underneath `Sheet`: it moves into
 * the sheet on open, is trapped while open, and returns to the row that
 * opened it on close.
 */
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Mail,
  MailOpen,
  Reply,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import type { ContactSubmission, ContactSubmissionStatus } from '@types';
import {
  getContactSubmissionStatusLabelKey,
  getContactSubmissionStatusTone,
} from '../utils/contact-submission.utils';

export interface ContactSubmissionSheetProps {
  /** `null` keeps the sheet mounted-but-closed so its close animation still plays. */
  readonly submission: ContactSubmission | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChangeStatus: (
    submission: ContactSubmission,
    status: ContactSubmissionStatus
  ) => void;
  /** The status currently being applied, while its request is in flight. */
  readonly pendingStatus?: ContactSubmissionStatus;
}

export function ContactSubmissionSheet({
  submission,
  open,
  onOpenChange,
  onChangeStatus,
  pendingStatus,
}: ContactSubmissionSheetProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const isBusy = pendingStatus !== undefined;

  const actionButton = (
    status: ContactSubmissionStatus,
    labelKey: string,
    Icon: typeof Mail,
    variant: 'outline' | 'ghost' = 'outline'
  ) =>
    submission ? (
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={isBusy}
        onClick={() => onChangeStatus(submission, status)}
      >
        {pendingStatus === status ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-4" strokeWidth={2} aria-hidden />
        )}
        {t(labelKey)}
      </Button>
    ) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border p-6 text-start">
          <SheetTitle>{t('website:messages.drawer.title')}</SheetTitle>
          <SheetDescription>
            {t('website:messages.drawer.description')}
          </SheetDescription>
        </SheetHeader>

        {submission ? (
          <div className="space-y-6 p-6">
            <section className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="min-w-0 break-words text-base font-semibold text-foreground"
                  dir="auto"
                >
                  {submission.name}
                </p>
                <StatusBadge
                  labelKey={getContactSubmissionStatusLabelKey(
                    submission.status
                  )}
                  tone={getContactSubmissionStatusTone(submission.status)}
                />
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">
                  {t('website:messages.drawer.email')}
                </dt>
                <dd className="min-w-0 break-all" dir="auto">
                  {submission.email}
                </dd>
                <dt className="text-muted-foreground">
                  {t('website:messages.drawer.received')}
                </dt>
                <dd>
                  <time dateTime={submission.createdAt}>
                    {fmt.dateTime(submission.createdAt)}
                  </time>
                </dd>
                <dt className="text-muted-foreground">
                  {t('website:messages.drawer.status')}
                </dt>
                <dd>
                  {t(getContactSubmissionStatusLabelKey(submission.status))}
                </dd>
              </dl>
            </section>

            <Separator />

            <section
              aria-labelledby="contact-submission-message-heading"
              className="space-y-2"
            >
              <h3
                id="contact-submission-message-heading"
                className="text-sm font-medium text-muted-foreground"
              >
                {t('website:messages.drawer.message')}
              </h3>
              {/* Plain text on purpose — see the file's doc comment. */}
              <p
                className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground"
                dir="auto"
                data-testid="contact-submission-message"
              >
                {submission.message}
              </p>
            </section>

            <Separator />

            <div
              role="group"
              aria-label={t('website:messages.drawer.actions')}
              className="flex flex-wrap items-center gap-2"
            >
              <Button asChild size="sm">
                <a href={`mailto:${submission.email}`}>
                  <Reply
                    className="size-4 rtl:-scale-x-100"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {t('website:messages.drawer.reply')}
                </a>
              </Button>

              {submission.status === 'new'
                ? actionButton(
                    'read',
                    'website:messages.actions.markRead',
                    MailOpen
                  )
                : null}
              {submission.status === 'read'
                ? actionButton(
                    'new',
                    'website:messages.actions.markUnread',
                    Mail
                  )
                : null}
              {submission.status === 'archived'
                ? actionButton(
                    'read',
                    'website:messages.actions.restore',
                    ArchiveRestore
                  )
                : actionButton(
                    'archived',
                    'website:messages.actions.archive',
                    Archive,
                    'ghost'
                  )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
