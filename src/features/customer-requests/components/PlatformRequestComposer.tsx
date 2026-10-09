/**
 * The Platform Owner's message box on a request, with an explicit choice
 * between "Reply to customer" and "Internal note".
 *
 * The two modes must never be confused, so the difference is carried by
 * more than colour: the toggle names the mode, an internal note's box
 * turns amber with a lock and the line "Only visible to the Atlas team",
 * and the send button changes its label ("Send reply" / "Add note"). A
 * closed request only takes internal notes (the API refuses a customer
 * message on a dead thread), so the reply mode is disabled and explained.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, MessageSquare, Send } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { MIRROR_IN_RTL, cn } from '@utils';
import {
  CR_NS,
  CUSTOMER_REQUEST_MESSAGE_MAX,
} from '../constants/customer-request.constants';
import { usePostTeamCustomerRequestMessage } from '../hooks';
import {
  customerRequestErrorKey,
  isCustomerRequestClosed,
} from '../utils/customer-request.utils';
import type { PlatformCustomerRequestDetail } from '../types/customer-request.types';

type ComposerMode = 'reply' | 'internal';

export interface PlatformRequestComposerProps {
  readonly request: PlatformCustomerRequestDetail;
}

export function PlatformRequestComposer({
  request,
}: PlatformRequestComposerProps): JSX.Element {
  const { t } = useTranslation();
  const { notify, notifySuccess } = useToast();
  const post = usePostTeamCustomerRequestMessage();
  const ids = useId();
  const closed = isCustomerRequestClosed(request.status);
  const [chosenMode, setChosenMode] = useState<ComposerMode>('reply');
  const [body, setBody] = useState('');
  const mode: ComposerMode = closed ? 'internal' : chosenMode;
  const internal = mode === 'internal';
  const K = `${CR_NS}:platform.detail.composer`;

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || post.isPending) return;
    try {
      await post.mutateAsync({
        requestId: request.id,
        payload: { body: trimmed, internal },
      });
      setBody('');
      notifySuccess(internal ? `${K}.noteAdded` : `${K}.replySent`);
    } catch (error) {
      const reasonKey = customerRequestErrorKey(error);
      notify({
        intent: 'error',
        titleKey: `${K}.failed`,
        ...(reasonKey ? { descriptionKey: reasonKey } : {}),
      });
    }
  };

  return (
    <div className="space-y-3" data-testid="platform-request-composer">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value) setChosenMode(value as ComposerMode);
        }}
        aria-label={t(`${K}.label`)}
        className="inline-flex w-full justify-start rounded-md bg-muted p-1 text-muted-foreground sm:w-auto"
      >
        <ToggleGroupItem
          value="reply"
          disabled={closed}
          className="h-8 flex-1 gap-1.5 whitespace-nowrap rounded-sm px-3 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm sm:flex-none"
        >
          <MessageSquare className="size-3.5" aria-hidden />
          {t(`${K}.reply`)}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="internal"
          className="h-8 flex-1 gap-1.5 whitespace-nowrap rounded-sm px-3 data-[state=on]:bg-warning-surface data-[state=on]:text-warning data-[state=on]:shadow-sm sm:flex-none"
        >
          <Lock className="size-3.5" aria-hidden />
          {t(`${K}.internal`)}
        </ToggleGroupItem>
      </ToggleGroup>

      <div
        className={cn(
          'space-y-2 rounded-lg border p-3 transition-colors',
          internal
            ? 'border-warning/40 bg-warning-surface'
            : 'border-border bg-card'
        )}
        data-mode={mode}
      >
        <Label htmlFor={`${ids}-body`} className="sr-only">
          {internal ? t(`${K}.internal`) : t(`${K}.reply`)}
        </Label>
        <p
          id={`${ids}-hint`}
          className={cn(
            'flex items-center gap-1.5 text-xs',
            internal ? 'font-medium text-warning' : 'text-muted-foreground'
          )}
        >
          {internal ? <Lock className="size-3.5" aria-hidden /> : null}
          {closed
            ? t(`${K}.closedHint`)
            : internal
              ? t(`${K}.internalHint`)
              : t(`${K}.replyHint`)}
        </p>
        <Textarea
          id={`${ids}-body`}
          data-testid="platform-request-message"
          rows={4}
          dir="auto"
          value={body}
          maxLength={CUSTOMER_REQUEST_MESSAGE_MAX}
          placeholder={
            internal
              ? t(`${K}.internalPlaceholder`)
              : t(`${K}.replyPlaceholder`)
          }
          aria-describedby={`${ids}-hint`}
          className="bg-background"
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant={internal ? 'secondary' : 'default'}
          data-testid="platform-request-send"
          disabled={!body.trim() || post.isPending}
          onClick={() => void send()}
        >
          {post.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : internal ? (
            <Lock className="size-4" aria-hidden />
          ) : (
            <Send className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          )}
          {internal ? t(`${K}.addNote`) : t(`${K}.sendReply`)}
        </Button>
      </div>
    </div>
  );
}
