/**
 * W3-compose — the composer both senders share (Platform Owner "Compose and
 * send", academy "Messages"). The page supplies the audience picker and the
 * two API calls; this component owns the rest of the flow:
 *
 *   write → preview (server counts, exclusions, quota; no side effects)
 *         → confirm (what will happen, explicit tick for ≥ 1,000)
 *         → send (202).
 *
 * SAFETY RAILS
 *   - Changing the audience or the channels discards the preview: a send is
 *     only ever confirmed against numbers the person has seen.
 *   - The server re-counts on send; if the audience moved it answers 409 and
 *     the composer re-previews and says so, instead of sending.
 *   - Over-quota is refused by the server (422) and the button is disabled
 *     here when the preview already says the emails will not fit. Nothing is
 *     silently truncated.
 *   - One idempotency key per draft: a double click, a network retry or a
 *     second click after an ambiguous error all resolve to the same message.
 *     The key is renewed only when the draft changes or after a success.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Eye, Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@app/providers';
import type { ApiError } from '@api';
import { RichTextEditor } from './RichTextEditor';
import { PreviewSummary } from './PreviewSummary';
import { ConfirmSendDialog } from './ConfirmSendDialog';
import {
  BODY_HTML_MAX,
  BODY_TEXT_MAX,
  SUBJECT_MAX,
  type CampaignAccepted,
  type CampaignAudience,
  type CampaignChannels,
  type CampaignPreview,
  type CampaignPreviewRequest,
  type CampaignSendRequest,
} from '../messaging.types';
import { messagePlainText, newIdempotencyKey } from '../utils/message-html';

export interface MessageComposerProps {
  /** Distinguishes element ids when two composers could share a page. */
  readonly idPrefix: string;
  /** The audience picker; rendered inside the form. */
  readonly audienceSlot: ReactNode;
  /** `null` while the picker is incomplete (e.g. no course chosen yet). */
  readonly audience: CampaignAudience | null;
  readonly onPreview: (request: CampaignPreviewRequest) => Promise<CampaignPreview>;
  readonly isPreviewing: boolean;
  readonly onSend: (request: CampaignSendRequest) => Promise<CampaignAccepted>;
  readonly isSending: boolean;
  /** Academy learner audiences also report blocked/pending learners. */
  readonly showLearnerExclusions?: boolean;
  readonly onSent?: (accepted: CampaignAccepted) => void;
}

type Notice =
  | { readonly kind: 'audienceChanged' }
  | { readonly kind: 'quota'; readonly remaining: number; readonly requested: number }
  | { readonly kind: 'error'; readonly messageKey: string; readonly requestId?: string };

function detailNumber(error: ApiError, key: string): number {
  const value = error.details?.[key];
  return typeof value === 'number' ? value : 0;
}

export function MessageComposer({
  idPrefix,
  audienceSlot,
  audience,
  onPreview,
  isPreviewing,
  onSend,
  isSending,
  showLearnerExclusions = false,
  onSent,
}: MessageComposerProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [contentLocale, setContentLocale] = useState<'en' | 'ar'>(
    i18n.language === 'ar' ? 'ar' : 'en'
  );
  const [channels, setChannels] = useState<CampaignChannels>({ email: true, inApp: true });
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const idempotencyKey = useRef<string | null>(null);

  const subjectId = `${idPrefix}-subject`;
  const subjectHelpId = `${idPrefix}-subject-help`;
  const bodyLabelId = useId();
  const bodyId = `${idPrefix}-body`;
  const bodyHelpId = `${idPrefix}-body-help`;
  const languageId = `${idPrefix}-language`;

  const audienceVersion = JSON.stringify(audience);
  const bodyText = useMemo(() => messagePlainText(bodyHtml), [bodyHtml]);
  const subjectTrimmed = subject.trim();
  const subjectValid = subjectTrimmed.length > 0 && subjectTrimmed.length <= SUBJECT_MAX;
  const bodyValid =
    bodyText.length > 0 && bodyText.length <= BODY_TEXT_MAX && bodyHtml.length <= BODY_HTML_MAX;
  const hasChannel = channels.email || channels.inApp;

  // Numbers seen for ANOTHER audience or channel set are not numbers for this one.
  useEffect(() => {
    setPreview(null);
  }, [audienceVersion, channels.email, channels.inApp]);

  // A changed draft is a different message: it gets a new idempotency key.
  useEffect(() => {
    idempotencyKey.current = null;
  }, [audienceVersion, channels.email, channels.inApp, subject, bodyHtml, contentLocale]);

  const runPreview = async (): Promise<CampaignPreview | null> => {
    if (!audience || !hasChannel) return null;
    try {
      const result = await onPreview({ audience, channels });
      setPreview(result);
      return result;
    } catch (error) {
      const apiError = error as ApiError;
      setPreview(null);
      setNotice({ kind: 'error', messageKey: apiError.messageKey, requestId: apiError.requestId });
      return null;
    }
  };

  const handlePreview = async () => {
    setNotice(null);
    await runPreview();
  };

  const canSend =
    preview !== null &&
    preview.recipientCount > 0 &&
    !(channels.email && preview.overBy > 0) &&
    subjectValid &&
    bodyValid &&
    hasChannel &&
    !isSending;

  const handleOpenConfirm = () => {
    setAttempted(true);
    if (!canSend) return;
    setNotice(null);
    setConfirmOpen(true);
  };

  const handleConfirm = async (confirmLargeAudience: boolean) => {
    if (!preview || !audience || isSending) return;
    idempotencyKey.current ??= newIdempotencyKey();
    try {
      const accepted = await onSend({
        idempotencyKey: idempotencyKey.current,
        subject: subjectTrimmed,
        bodyHtml,
        contentLocale,
        audience,
        channels,
        expectedRecipientCount: preview.recipientCount,
        ...(confirmLargeAudience ? { confirmLargeAudience: true } : {}),
      });
      setConfirmOpen(false);
      notifySuccess('messaging:toast.sentTitle', 'messaging:toast.sentDescription', {
        count: accepted.recipientCount,
      });
      setSubject('');
      setBodyHtml('');
      setPreview(null);
      setAttempted(false);
      idempotencyKey.current = null;
      onSent?.(accepted);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === 'CAMPAIGN_CONFIRMATION_REQUIRED') return;
      setConfirmOpen(false);
      if (apiError.code === 'CAMPAIGN_AUDIENCE_CHANGED') {
        // Nothing was sent: show the new numbers and let the person decide.
        idempotencyKey.current = null;
        setNotice({ kind: 'audienceChanged' });
        await runPreview();
        return;
      }
      if (apiError.code === 'ACADEMY_EMAIL_QUOTA_EXCEEDED') {
        idempotencyKey.current = null;
        setNotice({
          kind: 'quota',
          remaining: detailNumber(apiError, 'remaining'),
          requested: detailNumber(apiError, 'requested'),
        });
        await runPreview();
        return;
      }
      // Anything else (network, server, rate limit): keep the key, so trying
      // again cannot create a second message if the first one landed.
      setNotice({ kind: 'error', messageKey: apiError.messageKey, requestId: apiError.requestId });
    }
  };

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleOpenConfirm();
      }}
      aria-describedby={notice ? `${idPrefix}-notice` : undefined}
    >
      {notice ? (
        <div id={`${idPrefix}-notice`} role="alert">
          {notice.kind === 'audienceChanged' ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t('messaging:notice.audienceChangedTitle')}</AlertTitle>
              <AlertDescription>{t('messaging:notice.audienceChanged')}</AlertDescription>
            </Alert>
          ) : notice.kind === 'quota' ? (
            <Alert variant="destructive" data-testid="quota-exceeded-alert">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t('messaging:notice.quotaTitle')}</AlertTitle>
              <AlertDescription>
                {t('messaging:notice.quota', {
                  remaining: notice.remaining,
                  requested: notice.requested,
                })}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t('messaging:notice.errorTitle')}</AlertTitle>
              <AlertDescription>
                {t(notice.messageKey, { defaultValue: t('messaging:notice.error') })}
                {notice.requestId ? (
                  <span className="mt-1 block text-xs opacity-80" dir="ltr">
                    {t('messaging:notice.reference', { id: notice.requestId })}
                  </span>
                ) : null}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t('messaging:composer.audience')}</legend>
        {audienceSlot}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('messaging:composer.channels')}</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={channels.email}
              onCheckedChange={(value) => setChannels((c) => ({ ...c, email: value === true }))}
              data-testid="channel-email"
            />
            {t('messaging:composer.channelEmail')}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={channels.inApp}
              onCheckedChange={(value) => setChannels((c) => ({ ...c, inApp: value === true }))}
              data-testid="channel-in-app"
            />
            {t('messaging:composer.channelInApp')}
          </label>
        </div>
        {!hasChannel ? (
          <p className="text-xs text-destructive">{t('messaging:composer.channelRequired')}</p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={subjectId}>{t('messaging:composer.subject')}</Label>
        <Input
          id={subjectId}
          dir="auto"
          value={subject}
          maxLength={SUBJECT_MAX}
          aria-invalid={attempted && !subjectValid}
          aria-describedby={subjectHelpId}
          data-testid="message-subject"
          onChange={(event) => setSubject(event.target.value)}
        />
        <p
          id={subjectHelpId}
          className={
            attempted && !subjectValid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
          }
        >
          {attempted && !subjectValid
            ? t('messaging:composer.subjectRequired')
            : t('messaging:composer.subjectCount', { count: subject.length, max: SUBJECT_MAX })}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <span id={bodyLabelId} className="text-sm font-medium">
            {t('messaging:composer.body')}
          </span>
          <div className="flex items-center gap-2">
            <Label htmlFor={languageId} className="text-xs text-muted-foreground">
              {t('messaging:composer.language')}
            </Label>
            <select
              id={languageId}
              className="min-h-11 rounded-md border border-input bg-background px-2 text-sm"
              value={contentLocale}
              onChange={(event) => setContentLocale(event.target.value === 'ar' ? 'ar' : 'en')}
            >
              <option value="en">{t('messaging:composer.languageEn')}</option>
              <option value="ar">{t('messaging:composer.languageAr')}</option>
            </select>
          </div>
        </div>
        <RichTextEditor
          id={bodyId}
          value={bodyHtml}
          onChange={setBodyHtml}
          labelledBy={bodyLabelId}
          describedBy={bodyHelpId}
          dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
          invalid={attempted && !bodyValid}
          placeholder={t('messaging:composer.bodyPlaceholder')}
        />
        <p
          id={bodyHelpId}
          className={
            (attempted && !bodyValid) || bodyText.length > BODY_TEXT_MAX
              ? 'text-xs text-destructive'
              : 'text-xs text-muted-foreground'
          }
        >
          {attempted && bodyText.length === 0
            ? t('messaging:composer.bodyRequired')
            : t('messaging:composer.bodyCount', { count: bodyText.length, max: BODY_TEXT_MAX })}
        </p>
      </div>

      {preview ? (
        <PreviewSummary
          preview={preview}
          channels={channels}
          showLearnerExclusions={showLearnerExclusions}
        />
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={!audience || !hasChannel || isPreviewing}
          aria-busy={isPreviewing}
          data-testid="message-preview-button"
          onClick={() => void handlePreview()}
        >
          {isPreviewing ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Eye className="me-2 h-4 w-4" aria-hidden="true" />
          )}
          {preview ? t('messaging:composer.refreshPreview') : t('messaging:composer.preview')}
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={!canSend}
          aria-describedby={!preview ? `${idPrefix}-send-help` : undefined}
          data-testid="message-send-button"
        >
          <Send className="me-2 h-4 w-4" aria-hidden="true" />
          {t('messaging:composer.send')}
        </Button>
      </div>
      {!preview ? (
        <p id={`${idPrefix}-send-help`} className="text-end text-xs text-muted-foreground">
          {t('messaging:composer.previewFirst')}
        </p>
      ) : null}

      {preview ? (
        <ConfirmSendDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          preview={preview}
          channels={channels}
          subject={subjectTrimmed}
          isSending={isSending}
          onConfirm={(large) => void handleConfirm(large)}
        />
      ) : null}
    </form>
  );
}
