/**
 * Shows a payment proof the viewer is allowed to see — learner, Academy
 * owner, tenant or platform reviewer — in a dialog, not a popup.
 *
 * Proof files live in a private bucket and are fetched through the
 * authenticated API as a Blob, so they have no URL a browser can open by
 * itself. The pages used to download the file and only then call
 * `window.open(objectUrl)`: that call comes after an `await`, outside the
 * tap that started it, so mobile browsers (iOS Safari and in-app browsers
 * always, Chrome on Android on a slow network) treat it as an unrequested
 * popup and block it; `noreferrer` made `window.open` return `null`, so the
 * block was silent. Here the dialog opens synchronously on the tap; the
 * file loads into it. An image shows inline; a PDF is offered as real links
 * the viewer taps (open in a new tab, download), which no browser blocks.
 * The object URL is revoked when the dialog closes.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PaymentProofDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Fetches the proof through the authenticated API. */
  readonly load: () => Promise<Blob>;
  /** The uploaded file's name, when known (download name and caption). */
  readonly fileName?: string;
  /** Who/what the proof belongs to, for the title and the image's alt text. */
  readonly subject?: string;
}

type ProofState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly url: string; readonly type: string };

export function PaymentProofDialog({
  open,
  onOpenChange,
  load,
  fileName,
  subject,
}: PaymentProofDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [state, setState] = useState<ProofState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let created: string | null = null;
    setState({ status: 'loading' });
    load()
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setState({ status: 'ready', url: created, type: blob.type });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
    // `load` is a fresh closure on every render of the caller; the proof to
    // show is identified by the dialog being open and the retry count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  const title = subject
    ? t('common:paymentProof.titleFor', { subject })
    : t('common:paymentProof.title');
  const isImage = state.status === 'ready' && state.type.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto"
        data-testid="payment-proof-dialog"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {fileName ? (
            <DialogDescription dir="auto" className="break-all">
              {fileName}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {t('common:paymentProof.description')}
            </DialogDescription>
          )}
        </DialogHeader>

        {state.status === 'loading' ? (
          <div
            className="flex min-h-40 items-center justify-center"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="size-6 animate-spin text-muted-foreground"
              aria-hidden
            />
            <span className="sr-only">{t('common:paymentProof.loading')}</span>
          </div>
        ) : state.status === 'error' ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-destructive">
              {t('common:paymentProof.error')}
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('common:actions.retry')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {isImage ? (
              <img
                src={state.url}
                alt={
                  subject
                    ? t('common:paymentProof.altFor', { subject })
                    : t('common:paymentProof.alt')
                }
                className="mx-auto max-h-[65dvh] w-auto max-w-full rounded-md border border-border bg-muted object-contain"
                data-testid="payment-proof-image"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
                <a
                  href={state.url}
                  target="_blank"
                  rel="noopener"
                  data-testid="payment-proof-open"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {t('common:paymentProof.open')}
                </a>
              </Button>
              <Button asChild variant="ghost" className="min-h-11 sm:min-h-9">
                <a
                  href={state.url}
                  download={fileName || true}
                  data-testid="payment-proof-download"
                >
                  <Download className="size-4" aria-hidden />
                  {t('common:actions.download')}
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
