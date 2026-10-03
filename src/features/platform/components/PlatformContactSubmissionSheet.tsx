/**
 * One marketing-site enquiry, in a side sheet over the Platform Owner's
 * contact inbox (TASK 7).
 *
 * The visitor's text is rendered as TEXT — React escapes it, and
 * `whitespace-pre-wrap` keeps their line breaks. It is untrusted input
 * from a public form and is never parsed as HTML; the mailto link encodes
 * the address.
 *
 * Actions follow the enquiry's state (mark read/unread, archive/restore)
 * plus Delete, which is permanent: the sheet only REQUESTS it, and the
 * page asks for confirmation before anything is sent.
 *
 * Focus is managed by the Radix dialog underneath `Sheet`.
 */
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Mail,
  MailOpen,
  Reply,
  Trash2,
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
import type {
  PlatformContactSubmission,
  PlatformContactSubmissionStatus,
} from '../services/PlatformContactSubmissionService';
import {
  contactStatusLabelKey,
  contactStatusTone,
  contactTopicLabelKey,
} from '../utils/platform-contact-submission.utils';

export interface PlatformContactSubmissionSheetProps {
  /** `null` keeps the sheet mounted-but-closed so its close animation plays. */
  readonly submission: PlatformContactSubmission | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onChangeStatus: (
    submission: PlatformContactSubmission,
    status: PlatformContactSubmissionStatus
  ) => void;
  readonly onRequestDelete: (submission: PlatformContactSubmission) => void;
  /** The status currently being applied, while its request is in flight. */
  readonly pendingStatus?: PlatformContactSubmissionStatus;
  readonly isDeleting?: boolean;
}

const K = 'platform:contactSubmissions';

export function PlatformContactSubmissionSheet({
  submission,
  open,
  onOpenChange,
  onChangeStatus,
  onRequestDelete,
  pendingStatus,
  isDeleting = false,
}: PlatformContactSubmissionSheetProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const isBusy = pendingStatus !== undefined || isDeleting;

  const statusButton = (
    status: PlatformContactSubmissionStatus,
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
          <SheetTitle>{t(`${K}.drawer.title`)}</SheetTitle>
          <SheetDescription>{t(`${K}.drawer.description`)}</SheetDescription>
        </SheetHeader>

        {submission ? (
          <div className="space-y-6 p-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="min-w-0 break-words text-base font-semibold text-foreground"
                  dir="auto"
                >
                  {submission.name}
                </p>
                <StatusBadge
                  labelKey={contactStatusLabelKey(submission.status)}
                  tone={contactStatusTone(submission.status)}
                />
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">
                  {t(`${K}.drawer.email`)}
                </dt>
                <dd className="min-w-0 break-all" dir="ltr">
                  {submission.email}
                </dd>
                <dt className="text-muted-foreground">
                  {t(`${K}.drawer.organization`)}
                </dt>
                <dd className="min-w-0 break-words" dir="auto">
                  {submission.organizationName ??
                    t(`${K}.drawer.noOrganization`)}
                </dd>
                <dt className="text-muted-foreground">
                  {t(`${K}.drawer.topic`)}
                </dt>
                <dd>{t(contactTopicLabelKey(submission.topic))}</dd>
                <dt className="text-muted-foreground">
                  {t(`${K}.drawer.received`)}
                </dt>
                <dd>
                  <time dateTime={submission.createdAt}>
                    {fmt.dateTime(submission.createdAt)}
                  </time>
                </dd>
                {submission.readAt ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t(`${K}.drawer.readAt`)}
                    </dt>
                    <dd>
                      <time dateTime={submission.readAt}>
                        {fmt.dateTime(submission.readAt)}
                      </time>
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">
                  {t(`${K}.drawer.language`)}
                </dt>
                <dd className="uppercase" dir="ltr">
                  {submission.locale}
                </dd>
                {submission.sourcePath ? (
                  <>
                    <dt className="text-muted-foreground">
                      {t(`${K}.drawer.source`)}
                    </dt>
                    <dd
                      className="min-w-0 break-all font-mono text-xs"
                      dir="ltr"
                    >
                      {submission.sourcePath}
                    </dd>
                  </>
                ) : null}
              </dl>
            </section>

            <Separator />

            <section
              aria-labelledby="platform-contact-message-heading"
              className="space-y-2"
            >
              <h3
                id="platform-contact-message-heading"
                className="text-sm font-medium text-muted-foreground"
              >
                {t(`${K}.drawer.message`)}
              </h3>
              {/* Plain text on purpose — see the file's doc comment. */}
              <p
                className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground"
                dir="auto"
                data-testid="platform-contact-message"
              >
                {submission.message}
              </p>
            </section>

            <Separator />

            <div
              role="group"
              aria-label={t(`${K}.drawer.actions`)}
              className="flex flex-wrap items-center gap-2"
            >
              <Button asChild size="sm">
                <a href={`mailto:${encodeURIComponent(submission.email)}`}>
                  <Reply
                    className="size-4 rtl:-scale-x-100"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {t(`${K}.drawer.reply`)}
                </a>
              </Button>

              {submission.status === 'new'
                ? statusButton('read', `${K}.actions.markRead`, MailOpen)
                : null}
              {submission.status === 'read'
                ? statusButton('new', `${K}.actions.markUnread`, Mail)
                : null}
              {submission.status === 'archived'
                ? statusButton('read', `${K}.actions.restore`, ArchiveRestore)
                : statusButton(
                    'archived',
                    `${K}.actions.archive`,
                    Archive,
                    'ghost'
                  )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isBusy}
                onClick={() => onRequestDelete(submission)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:ms-auto"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                )}
                {t(`${K}.actions.delete`)}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
