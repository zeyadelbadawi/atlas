/**
 * G1 — "Acquisition" on the Platform Owner's organization detail: the
 * channel this organization is counted under in CAC, how it was decided
 * (override → their answer → UTM tags → referrer → "Somewhere else" →
 * unknown), the UTM values and referrer captured at sign-up, and their own
 * answer to "How did you first hear about us?". "Set channel" records an
 * override with a note (founder-led sign-ups over WhatsApp or a call);
 * "Automatic" clears it. Every change is audited on the server.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@app/providers';
import { useDateFormatter } from '@hooks';
import { apiErrorMessage } from '@utils';
import { ACQUISITION_CHANNELS } from '@utils/acquisition-channel.utils';
import { useSetOrganizationChannel } from '../hooks/usePlatformGrowth';
import type { AcquisitionChannel, OrganizationAcquisition } from '../types';
import { CHANNEL_NOTE_MAX, K } from '../utils/growth.utils';
import { useChannelLabel } from './parts';

const ATTRIBUTION_FIELDS = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',
  'referrerDomain',
  'landingTemplate',
] as const;

const AUTOMATIC = 'automatic';

export function AcquisitionCard({
  organizationId,
  acquisition,
}: {
  readonly organizationId: string;
  readonly acquisition: OrganizationAcquisition | null | undefined;
}): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { notifySuccess } = useToast();
  const channelLabel = useChannelLabel();
  const setChannel = useSetOrganizationChannel(organizationId);
  const id = useId();
  const [choice, setChoice] = useState<string>(AUTOMATIC);
  const [note, setNote] = useState('');

  const overrideChannel = acquisition?.override?.channel;
  const overrideNote = acquisition?.override?.note;
  useEffect(() => {
    setChoice(overrideChannel ?? AUTOMATIC);
    setNote(overrideNote ?? '');
  }, [overrideChannel, overrideNote]);

  if (!acquisition) return null;

  const attribution = acquisition.attribution ?? {};
  const captured = ATTRIBUTION_FIELDS.filter((field) => attribution[field]);
  const dirty =
    choice !== (overrideChannel ?? AUTOMATIC) ||
    note.trim() !== (overrideNote ?? '');
  const noteTooLong = note.trim().length > CHANNEL_NOTE_MAX;
  const selectId = `${id}-channel`;
  const noteId = `${id}-note`;

  const save = () => {
    if (noteTooLong) return;
    const channel =
      choice === AUTOMATIC ? null : (choice as AcquisitionChannel);
    setChannel.mutate(
      { channel, note: channel ? note.trim() || null : null },
      {
        onSuccess: () =>
          notifySuccess(
            channel
              ? `${K}acquisition.override.saved`
              : `${K}acquisition.override.cleared`
          ),
      }
    );
  };

  return (
    <Card data-testid="organization-acquisition">
      <CardHeader>
        <CardTitle className="text-base">
          {t(`${K}acquisition.title`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {t(`${K}acquisition.channel`)}
            </dt>
            <dd className="text-lg font-semibold text-foreground">
              {channelLabel(acquisition.resolvedChannel)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {t(`${K}acquisition.howDecided`)}
            </dt>
            <dd className="text-sm text-foreground">
              {t(`${K}acquisition.decidedBy.${acquisition.decidedBy}`)}
            </dd>
            {acquisition.override?.updatedAt ? (
              <dd className="text-xs text-muted-foreground">
                {acquisition.override.updatedByName
                  ? t(`${K}acquisition.override.setBy`, {
                      name: acquisition.override.updatedByName,
                      date: fmt.date(acquisition.override.updatedAt),
                    })
                  : t(`${K}acquisition.override.setOn`, {
                      date: fmt.date(acquisition.override.updatedAt),
                    })}
              </dd>
            ) : null}
            {acquisition.override?.note ? (
              <dd
                className="whitespace-pre-line rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
                dir="auto"
              >
                <span className="sr-only">
                  {t(`${K}acquisition.override.note`)}:{' '}
                </span>
                {acquisition.override.note}
              </dd>
            ) : null}
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {t(`${K}acquisition.heardFrom`)}
            </dt>
            <dd className="text-sm text-foreground">
              {acquisition.heardFrom
                ? channelLabel(acquisition.heardFrom)
                : t(`${K}acquisition.notAnswered`)}
            </dd>
            {acquisition.heardFromOther ? (
              <dd className="text-sm text-muted-foreground" dir="auto">
                <span className="sr-only">
                  {t(`${K}acquisition.inTheirWords`)}:{' '}
                </span>
                “{acquisition.heardFromOther}”
              </dd>
            ) : null}
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">
              {t(`${K}acquisition.captured`)}
            </dt>
            <dd>
              {captured.length > 0 ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {captured.map((field) => (
                    <div key={field} className="contents">
                      <dt className="text-xs text-muted-foreground">
                        {t(`${K}acquisition.fields.${field}`)}
                      </dt>
                      <dd
                        className="break-all text-foreground"
                        dir="ltr"
                        data-ltr-content
                      >
                        {attribution[field]}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t(`${K}acquisition.nothingCaptured`)}
                </span>
              )}
            </dd>
          </div>
        </dl>

        <form
          noValidate
          className="space-y-3 border-t border-border pt-4"
          aria-labelledby={`${id}-override-title`}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div>
            <h3
              id={`${id}-override-title`}
              className="text-sm font-semibold text-foreground"
            >
              {t(`${K}acquisition.override.title`)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(`${K}acquisition.override.description`)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={selectId}>
                {t(`${K}acquisition.override.channel`)}
              </Label>
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger
                  id={selectId}
                  className="h-11"
                  aria-label={t(`${K}acquisition.override.channel`)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTOMATIC}>
                    {t(`${K}acquisition.override.automatic`)}
                  </SelectItem>
                  {ACQUISITION_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channelLabel(channel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={noteId}>
                {t(`${K}acquisition.override.note`)}
                <span className="ms-1 font-normal text-muted-foreground">
                  ({t(`${K}common.optional`)})
                </span>
              </Label>
              <Textarea
                id={noteId}
                rows={2}
                dir="auto"
                maxLength={CHANNEL_NOTE_MAX}
                disabled={choice === AUTOMATIC}
                value={choice === AUTOMATIC ? '' : note}
                onChange={(event) => setNote(event.target.value)}
                aria-describedby={`${noteId}-hint`}
                aria-invalid={noteTooLong ? true : undefined}
              />
              <p
                id={`${noteId}-hint`}
                className="text-xs text-muted-foreground"
              >
                {t(`${K}acquisition.override.noteHint`)}
              </p>
            </div>
          </div>
          {setChannel.isError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {apiErrorMessage(t, i18n, setChannel.error)}
            </p>
          ) : null}
          <Button
            type="submit"
            className="min-h-11"
            disabled={!dirty || noteTooLong || setChannel.isPending}
          >
            {setChannel.isPending ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : null}
            {t(`${K}acquisition.override.save`)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
