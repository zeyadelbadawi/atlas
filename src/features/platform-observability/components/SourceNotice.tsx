/**
 * States plainly that a monitoring source is unavailable or not configured,
 * and what that means for the figures on this page. Rendered INSTEAD of
 * numbers that depend on the source — never alongside zeros.
 */
import { useTranslation } from 'react-i18next';
import { Ban, CloudOff } from 'lucide-react';
import { cn } from '@utils';
import type { SourceState } from '@types';

export type SourceName = 'prometheus' | 'alertmanager' | 'metrics';

export interface SourceNoticeProps {
  readonly source: SourceName;
  readonly state: SourceState;
  /** What on this page is affected, e.g. "Alert counts". */
  readonly impactKey?: string;
  readonly className?: string;
}

export function SourceNotice({
  source,
  state,
  impactKey,
  className,
}: SourceNoticeProps): JSX.Element | null {
  const { t } = useTranslation();
  if (state === 'ok') return null;
  const Icon = state === 'unavailable' ? CloudOff : Ban;
  const name = t(`platformObservability:sources.names.${source}`);
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        state === 'unavailable'
          ? 'border-warning/40 bg-warning-surface text-foreground'
          : 'border-dashed border-border-strong bg-muted/40 text-foreground',
        className
      )}
      data-source-state={state}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          state === 'unavailable' ? 'text-warning' : 'text-muted-foreground'
        )}
        strokeWidth={2}
        aria-hidden
      />
      <div className="space-y-0.5">
        <p className="font-medium">
          {t(`platformObservability:sources.title.${state}`, { source: name })}
        </p>
        <p className="text-muted-foreground">
          {t(`platformObservability:sources.body.${state}`, { source: name })}
          {impactKey ? ` ${t(impactKey)}` : ''}
        </p>
      </div>
    </div>
  );
}
