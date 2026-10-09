/**
 * The line under every watermarked player: what the moving code is, in
 * words, plus the fullscreen control.
 *
 * Told, not hidden. A learner who notices a code drifting over their lesson
 * deserves to know what it is and that it is theirs — and a visible,
 * explained watermark is a stronger deterrent than a secret one. This is
 * also the accessible counterpart of the `aria-hidden` layers.
 *
 * FULLSCREEN LIVES HERE because the media's own fullscreen button is
 * switched off (it would leave the watermark behind) and a button drawn
 * over the picture would collide with each player's own controls.
 */
import { useTranslation } from 'react-i18next';
import { Info, Maximize2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@utils';
import type { ResolvedWatermark } from './watermark-display';

export interface ForensicWatermarkCaptionProps {
  readonly watermark: ResolvedWatermark;
  /** Omitted where fullscreen is not offered (the live-class embed). */
  readonly onToggleFullscreen?: () => void;
  readonly className?: string;
}

export function ForensicWatermarkCaption({
  watermark,
  onToggleFullscreen,
  className,
}: ForensicWatermarkCaptionProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2',
        className
      )}
      data-testid="forensic-watermark-caption"
    >
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck
          className="size-3.5 shrink-0 text-success"
          strokeWidth={2}
          aria-hidden
        />
        <span>
          {watermark.kind === 'preview'
            ? t('learning:watermark.caption.preview')
            : t('learning:watermark.caption.account')}
        </span>
        {watermark.code ? (
          <code
            dir="ltr"
            data-ltr-content
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-foreground"
          >
            {watermark.code}
          </code>
        ) : null}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={t('learning:watermark.about.trigger')}
            >
              <Info className="size-3.5" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-2 text-sm">
            <p className="font-medium">{t('learning:watermark.about.title')}</p>
            <p className="text-muted-foreground">
              {watermark.kind === 'preview'
                ? t('learning:watermark.about.previewBody')
                : t('learning:watermark.about.accountBody')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('learning:watermark.about.privacy')}
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {onToggleFullscreen ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className="h-8 gap-1.5 text-xs"
        >
          <Maximize2 className="size-3.5" aria-hidden />
          {t('learning:watermark.fullscreen')}
        </Button>
      ) : null}
    </div>
  );
}
